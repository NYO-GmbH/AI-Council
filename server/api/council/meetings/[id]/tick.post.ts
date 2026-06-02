import { generateText, streamText } from 'ai'
import { eq } from 'drizzle-orm'
import { db, schema } from '~~/server/db'
import { getModel } from '~~/server/utils/model'
import {
  getActiveCouncilMembersOrThrow,
  getMeetingWithMessagesOrThrow
} from '~~/server/utils/council/meetings'
import { clipText, shuffle } from '~~/server/utils/council/text'
import {
  toSingleEventResponse,
  toStreamingResponse,
  type TickStreamEvent
} from '~~/server/utils/council/tick'
import {
  generateVerdict,
  type CouncilVerdictStatement,
  type CouncilVoteExplanation
} from '~~/server/utils/council/verdict'
import { z } from 'zod'

const bodySchema = z.object({
  userMessage: z.string().min(1).max(400).optional()
})

const log = (...args: unknown[]) => console.log('[tick]', ...args)
const err = (...args: unknown[]) => console.error('[tick]', ...args)

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const { userMessage } = await readValidatedBody(event, bodySchema.parse)
  const apiKey = getRequestHeader(event, 'x-openai-api-key') || undefined

  log(`▶ meeting=${id} userMessage=${userMessage ?? '(none)'}`)

  const meeting = await getMeetingWithMessagesOrThrow(id as string)
  log(`  status=${meeting.status} phase=${meeting.state?.phase} rounds=${meeting.state?.rounds}/${meeting.state?.maxRounds} queue=[${(meeting.state?.queue ?? []).join(', ')}]`)

  if (meeting.status === 'completed') {
    log('  → already completed, returning status event')
    return toSingleEventResponse({
      type: 'status',
      status: 'completed',
      verdict: meeting.state?.verdict || null
    })
  }

  if (meeting.status === 'paused') {
    log('  → paused, returning status event')
    return toSingleEventResponse({
      type: 'status',
      status: 'paused'
    })
  }

  const activeMembers = await getActiveCouncilMembersOrThrow(
    'Keine aktiven Ratsmitglieder verfügbar.'
  )
  log(`  activeMembers=[${activeMembers.map(m => m.name).join(', ')}]`)

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const writeEvent = (payload: TickStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`))
      }

      void (async () => {
        try {
          const transcriptMessages = [...meeting.messages]

          const transcriptText = (messages: typeof transcriptMessages, limit = 14) =>
            messages
              .slice(-limit)
              .map((message) => {
                const author
                  = message.role === 'agent'
                    ? message.member?.name || 'Agent'
                    : message.role === 'user'
                      ? 'Nutzer'
                      : 'System'
                return `${author}: ${message.content}`
              })
              .join('\n')

          const streamAgentMessage = async (params: {
            member: (typeof activeMembers)[number]
            system: string
            prompt: string
          }) => {
            log(`  streamAgentMessage: member=${params.member.name}`)
            writeEvent({
              type: 'speaker',
              member: {
                id: params.member.id,
                name: params.member.name,
                title: params.member.title,
                accentColor: params.member.accentColor
              }
            })

            const model = await getModel(apiKey)
            log(`  streamText starting for ${params.member.name}`)
            const result = streamText({
              model,
              system: params.system,
              prompt: params.prompt
            })

            let content = ''
            let partCount = 0
            for await (const part of result.fullStream) {
              partCount++
              if (part.type === 'text-delta') {
                content += part.text
                writeEvent({
                  type: 'message_content',
                  content: clipText(content)
                })
              } else if (part.type === 'error') {
                err(`  fullStream error part:`, part.error)
                throw part.error
              } else if (part.type !== 'finish' && part.type !== 'start' && part.type !== 'finish-step' && part.type !== 'start-step' && part.type !== 'text-start' && part.type !== 'text-end') {
                log(`  fullStream part type=${part.type}`)
              }
            }
            log(`  fullStream done: partCount=${partCount} contentLength=${content.length}`)

            if (!content) {
              throw new Error('Modell hat keinen Inhalt zurückgegeben. Bitte Modellname und API-Schlüssel prüfen.')
            }

            const clippedContent = clipText(content)

            const [message] = await db
              .insert(schema.councilMessages)
              .values({
                meetingId: meeting.id,
                memberId: params.member.id,
                role: 'agent',
                content: clippedContent
              })
              .returning()
            if (!message) {
              throw new Error('Ratsnachricht konnte nicht gespeichert werden.')
            }

            log(`  persisted message id=${message.id} length=${clippedContent.length}`)

            const hydratedMessage = {
              id: message.id,
              meetingId: message.meetingId,
              memberId: message.memberId,
              role: 'agent' as const,
              content: message.content,
              createdAt: message.createdAt,
              member: params.member
            }

            transcriptMessages.push(hydratedMessage)
            writeEvent({
              type: 'message',
              message: hydratedMessage
            })

            return clippedContent
          }

          if (userMessage?.trim()) {
            log(`  inserting user message`)
            await db.insert(schema.councilMessages).values({
              meetingId: meeting.id,
              role: 'user',
              content: userMessage.trim()
            })
            transcriptMessages.push({
              id: crypto.randomUUID(),
              meetingId: meeting.id,
              memberId: null,
              role: 'user',
              content: userMessage.trim(),
              createdAt: new Date(),
              member: null
            } as (typeof meeting.messages)[number])
          }

          const currentState = meeting.state || {
            queue: [],
            rounds: 0,
            maxRounds: 2,
            phase: 'discussion',
            concluded: false
          }
          const maxRounds = Math.max(1, currentState.maxRounds || 2)
          let queue = (currentState.queue || []).filter(memberId =>
            activeMembers.some(member => member.id === memberId)
          )
          let rounds = currentState.rounds || 0

          log(`  state resolved: phase=${currentState.phase} rounds=${rounds}/${maxRounds} queue=[${queue.join(', ')}] concluded=${currentState.concluded}`)

          if (queue.length === 0) {
            log(`  queue empty → rounds=${rounds} maxRounds=${maxRounds} concluded=${currentState.concluded}`)

            if (rounds < maxRounds) {
              queue = shuffle(activeMembers.map(member => member.id))
              rounds += 1
              log(`  → new discussion round ${rounds}, queue=[${queue.join(', ')}]`)
              writeEvent({
                type: 'phase',
                phase: 'discussion'
              })
            } else {
              if (!currentState.concluded) {
                log(`  → entering final_verdicts phase`)
                writeEvent({
                  type: 'phase',
                  phase: 'final_verdicts'
                })
                await db
                  .update(schema.councilMeetings)
                  .set({
                    state: {
                      queue: [],
                      rounds,
                      maxRounds,
                      phase: 'final_verdicts',
                      concluded: false,
                      verdict: undefined
                    }
                  })
                  .where(eq(schema.councilMeetings.id, meeting.id))

                const finalStatements: CouncilVerdictStatement[] = []
                const voteExplanations: CouncilVoteExplanation[] = []

                for (const member of activeMembers) {
                  log(`  collecting final statement from ${member.name}`)
                  const statement = await streamAgentMessage({
                    member,
                    system: `Du bist ${member.name}, ${member.title}, in einem KI-Rat.
Persönlichkeit: ${member.personality}
Ziel: ${member.objective}

Regeln:
- Dies ist dein persönliches ABSCHLUSSURTEIL nach Ende der Diskussion.
- Beginne mit "Mein Abschlussurteil:"
- Halte deine Antwort auf 2 prägnante Sätze.
- Nenne deine empfohlene Richtung und erkläre, warum sie gewinnen sollte.
- Verwende keine Markdown-Überschriften oder Aufzählungszeichen.
- Antworte auf Deutsch.`,
                    prompt: `Sitzungsthema: ${meeting.topic}

Aktuelles Protokoll:
${transcriptText(transcriptMessages) || 'Noch keine Nachrichten.'}

Gib dein Abschlussurteil an den Rat ab.`
                  })

                  finalStatements.push({
                    memberId: member.id,
                    memberName: member.name,
                    memberTitle: member.title,
                    accentColor: member.accentColor,
                    statement
                  })
                }

                log(`  → entering voting phase, ${activeMembers.length} members voting`)
                writeEvent({
                  type: 'phase',
                  phase: 'voting'
                })
                await db
                  .update(schema.councilMeetings)
                  .set({
                    state: {
                      queue: [],
                      rounds,
                      maxRounds,
                      phase: 'voting',
                      concluded: false,
                      verdict: undefined
                    }
                  })
                  .where(eq(schema.councilMeetings.id, meeting.id))

                for (const member of activeMembers) {
                  const candidates = finalStatements.filter(
                    statement => statement.memberId !== member.id
                  )
                  const fallbackCandidate = candidates[0] || finalStatements[0]
                  if (!fallbackCandidate) {
                    log(`  no candidates for ${member.name}, skipping`)
                    continue
                  }

                  const candidateLines = candidates
                    .map(statement => `${statement.memberId}: ${statement.memberName} -> ${statement.statement}`)
                    .join('\n')

                  log(`  generateText vote selection for ${member.name}`)
                  const { text: voteSelection } = await generateText({
                    model: await getModel(apiKey),
                    system: `Du bist ${member.name}, ${member.title}.
Wähle einen Vorschlag zur Unterstützung und antworte ausschließlich mit:
VOTE_FOR_MEMBER_ID: <member id>
Regeln:
- Wähle eine gültige Kandidaten-ID aus der Liste.
- Stimme nicht für dich selbst.
- Gib genau eine Zeile aus.`,
                    prompt: `Sitzungsthema: ${meeting.topic}

Kandidaten:
${candidateLines}`
                  })

                  const selectedLine = voteSelection
                    .split('\n')
                    .map(line => line.trim())
                    .find(line => line.startsWith('VOTE_FOR_MEMBER_ID:'))
                  const selectedId = selectedLine
                    ?.replace('VOTE_FOR_MEMBER_ID:', '')
                    .trim()
                  const votedFor
                    = candidates.find(candidate => candidate.memberId === selectedId)
                      || fallbackCandidate
                  log(`  ${member.name} votes for ${votedFor.memberName} (raw="${selectedId}")`)

                  const reasonText = await streamAgentMessage({
                    member,
                    system: `Du bist ${member.name}, ${member.title}, in der finalen Abstimmungsphase.
Persönlichkeit: ${member.personality}
Ziel: ${member.objective}

Regeln:
- Du stimmst für ${votedFor.memberName}.
- Erkläre warum in 1-2 Sätzen.
- Beginne mit "Ich stimme für ${votedFor.memberName}, weil"
- Beziehe dich ausdrücklich auf eine Stärke aus dem Abschlussurteil dieses Mitglieds.
- Verwende keine Markdown-Überschriften oder Aufzählungszeichen.
- Antworte auf Deutsch.`,
                    prompt: `Sitzungsthema: ${meeting.topic}

Dein eigener Vorschlag:
${finalStatements.find(statement => statement.memberId === member.id)?.statement || 'N/A'}

Gewählter Vorschlag:
${votedFor.statement}

Aktuelles Protokoll:
${transcriptText(transcriptMessages) || 'Noch keine Nachrichten.'}`
                  })

                  voteExplanations.push({
                    memberId: member.id,
                    memberName: member.name,
                    memberTitle: member.title,
                    accentColor: member.accentColor,
                    votedForMemberId: votedFor.memberId,
                    votedForMemberName: votedFor.memberName,
                    reason: reasonText
                  })
                }

                log(`  generating verdict`)
                const fullTranscript = transcriptMessages
                  .map((message) => {
                    const author
                      = message.role === 'agent'
                        ? message.member?.name || 'Agent'
                        : message.role === 'user'
                          ? 'Nutzer'
                          : 'System'
                    return `${author}: ${message.content}`
                  })
                  .join('\n')

                const verdict = await generateVerdict(
                  meeting.topic,
                  fullTranscript,
                  finalStatements,
                  voteExplanations,
                  apiKey
                )
                log(`  verdict generated: winningIdea="${verdict.winningIdea}"`)

                const finalStatementText = verdict.finalStatements
                  .map(statement => `${statement.memberName}: ${statement.statement}`)
                  .join('\n')
                const voteExplanationText = verdict.voteExplanations
                  .map(vote => `${vote.memberName} -> ${vote.votedForMemberName}: ${vote.reason}`)
                  .join('\n')
                const verdictText
                  = `Ratsschluss: ${verdict.summary}\nGewinneridee: ${verdict.winningIdea}\nAbstimmung: ${verdict.voteResult}\n\nAbschlussurteile:\n${finalStatementText}\n\nAbstimmungserklärungen:\n${voteExplanationText}`

                await db.insert(schema.councilMessages).values({
                  meetingId: meeting.id,
                  role: 'system',
                  content: verdictText
                })

                await db
                  .update(schema.councilMeetings)
                  .set({
                    status: 'completed',
                    state: {
                      queue: [],
                      rounds,
                      maxRounds,
                      phase: 'completed',
                      concluded: true,
                      verdict
                    }
                  })
                  .where(eq(schema.councilMeetings.id, meeting.id))

                log(`  ✓ meeting completed`)
                writeEvent({ type: 'phase', phase: 'completed' })
                writeEvent({ type: 'status', status: 'completed', verdict })
                controller.close()
                return
              }

              log(`  → already concluded, returning completed status`)
              writeEvent({
                type: 'status',
                status: 'completed',
                verdict: currentState.verdict || null
              })
              controller.close()
              return
            }
          }

          const speakerId = queue.shift()
          const speaker = activeMembers.find(member => member.id === speakerId)
          if (!speaker) {
            log(`  speaker id=${speakerId} not found in activeMembers, returning idle`)
            writeEvent({ type: 'status', status: 'idle' })
            controller.close()
            return
          }

          log(`  → discussion turn: speaker=${speaker.name} remaining queue=[${queue.join(', ')}]`)

          writeEvent({
            type: 'speaker',
            member: {
              id: speaker.id,
              name: speaker.name,
              title: speaker.title,
              accentColor: speaker.accentColor
            }
          })

          const transcript = transcriptMessages
            .slice(-14)
            .map((message) => {
              const author
                = message.role === 'agent'
                  ? message.member?.name || 'Agent'
                  : message.role === 'user'
                    ? 'Nutzer'
                    : 'System'
              return `${author}: ${message.content}`
            })
            .join('\n')

          const model = await getModel(apiKey)
          log(`  streamText starting for ${speaker.name} (discussion)`)
          const result = streamText({
            model,
            system: `Du bist ${speaker.name}, ${speaker.title}, in einem KI-Rat.
Persönlichkeit: ${speaker.personality}
Ziel: ${speaker.objective}

Regeln:
- Halte deine Antwort auf 1-2 Sätze.
- Sei konkret und kooperativ.
- Reagiere wenn möglich auf den letzten Sprecher.
- Verwende keine Markdown-Überschriften oder Aufzählungszeichen.
- Antworte auf Deutsch.`,
            prompt: `Aktuelles Protokoll:\n${transcript || 'Noch keine Nachrichten.'}\n\nSitzungsthema: ${meeting.topic}\nLeiste einen prägnanten Beitrag, der das Gespräch voranbringt.`
          })

          let content = ''
          let partCount = 0
          for await (const part of result.fullStream) {
            partCount++
            if (part.type === 'text-delta') {
              content += part.text
              writeEvent({
                type: 'message_content',
                content: clipText(content)
              })
            } else if (part.type === 'error') {
              err(`  fullStream error part:`, part.error)
              throw part.error
            } else if (part.type !== 'finish' && part.type !== 'start' && part.type !== 'finish-step' && part.type !== 'start-step' && part.type !== 'text-start' && part.type !== 'text-end') {
              log(`  fullStream part type=${part.type}`)
            }
          }
          log(`  fullStream done: partCount=${partCount} contentLength=${content.length}`)

          if (!content) {
            throw new Error('Modell hat keinen Inhalt zurückgegeben. Bitte Modellname und API-Schlüssel prüfen.')
          }

          const clippedContent = clipText(content)

          const [message] = await db
            .insert(schema.councilMessages)
            .values({
              meetingId: meeting.id,
              memberId: speaker.id,
              role: 'agent',
              content: clippedContent
            })
            .returning()
          if (!message) {
            throw new Error('Ratsnachricht konnte nicht gespeichert werden.')
          }

          await db
            .update(schema.councilMeetings)
            .set({
              status: 'active',
              lastSpokeAt: new Date(),
              state: {
                queue,
                rounds,
                maxRounds,
                phase: 'discussion',
                concluded: false,
                verdict: undefined
              }
            })
            .where(eq(schema.councilMeetings.id, meeting.id))

          log(`  persisted message id=${message.id} length=${clippedContent.length}, updated meeting state`)

          writeEvent({
            type: 'message',
            message: {
              id: message.id,
              meetingId: message.meetingId,
              memberId: message.memberId,
              role: 'agent',
              content: message.content,
              createdAt: message.createdAt,
              member: {
                id: speaker.id,
                name: speaker.name,
                title: speaker.title,
                accentColor: speaker.accentColor
              }
            }
          })
          log(`  ✓ tick complete for ${speaker.name}`)
          controller.close()
        } catch (error) {
          err(`  ✗ caught error:`, error)
          const message
            = error instanceof Error ? error.message : 'Sitzung konnte nicht fortgeführt werden.'
          try {
            controller.error(new Error(message))
          } catch {
            try { controller.close() } catch { /* already closed */ }
          }
        }
      })()
    }
  })

  return toStreamingResponse(stream)
})
