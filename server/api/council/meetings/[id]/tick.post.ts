import { streamText } from 'ai'
import { eq } from 'drizzle-orm'
import { db, schema } from '~~/server/db'
import { defaultModel } from '~~/server/utils/lmstudio'
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
import { generateVerdict } from '~~/server/utils/council/verdict'
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
            } else {
              if (!currentState.concluded) {
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

                const verdict = await generateVerdict(meeting.topic, fullTranscript)
                const verdictText = `Council conclusion: ${verdict.summary}\nWinning idea: ${verdict.winningIdea}\nVote: ${verdict.voteResult}`

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
                      concluded: true,
                      verdict
                    }
                  })
                  .where(eq(schema.councilMeetings.id, meeting.id))

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
                    ? 'User'
                    : 'System'
              return `${author}: ${message.content}`
            })
            .join('\n')

          const result = streamText({
            model: defaultModel,
            system: `You are ${speaker.name}, ${speaker.title}, in an AI council.
Personality: ${speaker.personality}
Objective: ${speaker.objective}

Rules:
- Keep your response to 1-2 sentences.
- Be concrete and collaborative.
- If relevant, react to the latest speaker.
- Do not use markdown headings or bullet points.`,
            prompt: `Recent transcript:\n${transcript || 'No messages yet.'}\n\nMeeting topic: ${meeting.topic}\nContribute one concise turn that advances the conversation.`
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
