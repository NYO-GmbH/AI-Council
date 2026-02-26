import { asc, eq } from 'drizzle-orm'
import { db, schema } from '~~/server/db'

export async function getMeetingOrThrow(id: string) {
  const meeting = await db.query.councilMeetings.findFirst({
    where: () => eq(schema.councilMeetings.id, id)
  })

  if (!meeting) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Council meeting not found.'
    })
  }

  return meeting
}

export async function getMeetingWithMessagesOrThrow(id: string) {
  const meeting = await db.query.councilMeetings.findFirst({
    where: () => eq(schema.councilMeetings.id, id),
    with: {
      messages: {
        orderBy: () => asc(schema.councilMessages.createdAt),
        with: {
          member: true
        }
      }
    }
  })

  if (!meeting) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Council meeting not found.'
    })
  }

  return meeting
}

export async function getActiveCouncilMembersOrThrow(statusMessage: string) {
  const members = await db.query.councilMembers.findMany()
  const activeMembers = members.filter(member => member.isActive)

  if (activeMembers.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage
    })
  }

  return activeMembers
}
