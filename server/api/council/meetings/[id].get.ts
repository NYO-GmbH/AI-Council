import { db, schema } from 'hub:db'
import { and, asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const userId = session.user?.id || session.id
  const { id } = getRouterParams(event)

  const meeting = await db.query.councilMeetings.findFirst({
    where: () => and(eq(schema.councilMeetings.id, id as string), eq(schema.councilMeetings.userId, userId)),
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
    throw createError({ statusCode: 404, statusMessage: 'Council meeting not found.' })
  }

  return meeting
})
