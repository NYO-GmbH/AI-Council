import { db, schema } from '~~/server/db'
import { getActiveCouncilMembersOrThrow } from '~~/server/utils/council/meetings'
import { z } from 'zod'

const bodySchema = z.object({
  topic: z.string().min(4).max(240),
  rounds: z.number().int().min(1).max(5).default(2)
})

export default defineEventHandler(async (event) => {
  const { topic, rounds } = await readValidatedBody(event, bodySchema.parse)

  const activeMembers = await getActiveCouncilMembersOrThrow(
    'You need at least one active council member to start a meeting.'
  )

  const queue = activeMembers.map(member => member.id)

  const [meeting] = await db
    .insert(schema.councilMeetings)
    .values({
      topic,
      status: 'active',
      state: {
        queue,
        rounds: 0,
        maxRounds: rounds,
        phase: 'discussion'
      }
    })
    .returning()

  if (!meeting) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create meeting.'
    })
  }

  await db.insert(schema.councilMessages).values([
    {
      meetingId: meeting.id,
      role: 'system',
      content: `Council meeting opened: ${topic}`
    },
    {
      meetingId: meeting.id,
      role: 'user',
      content: topic
    }
  ])

  return meeting
})
