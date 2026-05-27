import { generateText, streamText } from 'ai'
import { eq } from 'drizzle-orm'
import { db, schema } from '~~/server/db'
import { getModel } from '~~/server/utils/lmstudio'
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

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const { userMessage } = await readValidatedBody(event, bodySchema.parse)

  const meeting = await getMeetingWithMessagesOrThrow(id as string)

  if (meeting.status === 'completed') {
    return toSingleEventResponse({
      type: 'status',
      status: 'completed',
      verdict: meeting.state?.verdict || null
    })
  }

  if (meeting.status === 'paused') {
    return toSingleEventResponse({
      type: 'status',
      status: 'paused'
    })
  }

  const activeMembers = await getActiveCouncilMembersOrThrow(
    'No active council members available.'
  )

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
            writeEvent({
              type: 'speaker',
              member: {
                id: params.member.id,
                name: params.member.name,
                title: params.member.title,
                accentColor: params.member.accentColor
              }
            })

            const result = streamText({
              model: await getModel(),
              system: params.system,
              prompt: params.prompt
            })

            let content = ''
            for await (const chunk of result.textStream) {
              content += chunk
              writeEvent({
                type: 'message_content',
                content: clipText(content)
              })
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
              throw new Error('Failed to persist council message.')
            }

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

          if (queue.length === 0) {
            if (rounds < maxRounds) {
              queue = shuffle(activeMembers.map(member => member.id))
              rounds += 1
              writeEvent({
                type: 'phase',
                phase: 'discussion'
              })
            } else {
              if (!currentState.concluded) {
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
                    continue
                  }

                  const candidateLines = candidates
                    .map(statement => `${statement.memberId}: ${statement.memberName} -> ${statement.statement}`)
                    .join('\n')

                  const { text: voteSelection } = await generateText({
                    model: await getModel(),
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

                const fullTranscript = transcriptMessages
                  .map((message) => {
                    const author
                      = message.role === 'agent'
                        ? message.member?.name || 'Agent'
                        : message.role === 'user'
                          ? 'User'
                          : 'System'
                    return `${author}: ${message.content}`
                  })
                  .join('\n')

                const verdict = await generateVerdict(
                  meeting.topic,
                  fullTranscript,
                  finalStatements,
                  voteExplanations
                )
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

                writeEvent({
                  type: 'phase',
                  phase: 'completed'
                })
                writeEvent({
                  type: 'status',
                  status: 'completed',
                  verdict
                })
                controller.close()
                return
              }

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
            writeEvent({
              type: 'status',
              status: 'idle'
            })
            controller.close()
            return
          }

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

          const result = streamText({
            model: await getModel(),
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
          for await (const chunk of result.textStream) {
            content += chunk
            writeEvent({
              type: 'message_content',
              content: clipText(content)
            })
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
            throw new Error('Failed to persist council message.')
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
          controller.close()
        } catch (error) {
          const message
            = error instanceof Error ? error.message : 'Failed to progress meeting.'
          writeEvent({
            type: 'error',
            message
          })
          controller.close()
        }
      })()
    }
  })

  return toStreamingResponse(stream)
})
