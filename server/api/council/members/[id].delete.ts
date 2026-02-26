import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const userId = session.user?.id || session.id
  const { id } = getRouterParams(event)

  const [member] = await db.delete(schema.councilMembers)
    .where(and(eq(schema.councilMembers.id, id as string), eq(schema.councilMembers.userId, userId)))
    .returning()

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Council member not found.' })
  }

  return member
})
