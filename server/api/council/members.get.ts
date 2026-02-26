import { db, schema } from 'hub:db'
import { asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const userId = session.user?.id || session.id

  return db.query.councilMembers.findMany({
    where: () => eq(schema.councilMembers.userId, userId),
    orderBy: () => asc(schema.councilMembers.createdAt)
  })
})
