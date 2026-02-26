import { db, schema } from 'hub:db'
import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const userId = session.user?.id || session.id

  return db.query.councilMeetings.findMany({
    where: () => eq(schema.councilMeetings.userId, userId),
    orderBy: () => desc(schema.councilMeetings.createdAt)
  })
})
