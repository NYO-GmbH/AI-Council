import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const bodySchema = z.object({
  topic: z.string().min(4).max(240),
  rounds: z.number().int().min(1).max(5).default(2)
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const userId = session.user?.id || session.id
  const { topic, rounds } = await readValidatedBody(event, bodySchema.parse)

  const members = await db.query.councilMembers.findMany({
    where: () => eq(schema.councilMembers.userId, userId)
  })
  const activeMembers = members.filter(member => member.isActive)

  if (activeMembers.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'You need at least one active council member to start a meeting.'
    })
  }

  const queue = activeMembers.map(member => member.id)

  const [meeting] = await db.insert(schema.councilMeetings).values({
    userId,
    topic,
    status: 'active',
    state: {
      queue,
      rounds: 0,
      maxRounds: rounds
    }
  }).returning()

  if (!meeting) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create meeting.' })
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
