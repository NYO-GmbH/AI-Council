import { eq } from 'drizzle-orm'
import { db, schema } from '~~/server/db'
import { getMeetingOrThrow } from '~~/server/utils/council/meetings'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)

  const meeting = await getMeetingOrThrow(id as string)

  await db
    .delete(schema.councilMeetings)
    .where(eq(schema.councilMeetings.id, meeting.id))

  return {
    deleted: true,
    id: meeting.id
  }
})
