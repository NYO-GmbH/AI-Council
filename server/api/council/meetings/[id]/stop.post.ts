import { eq } from 'drizzle-orm'
import { db, schema } from '~~/server/db'
import { getMeetingOrThrow } from '~~/server/utils/council/meetings'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const meeting = await getMeetingOrThrow(id as string)

  if (meeting.status === 'completed') {
    return meeting
  }

  await db.insert(schema.councilMessages).values({
    meetingId: meeting.id,
    role: 'system',
    content: 'Sitzung wurde manuell vom Nutzer beendet.'
  })

  const [updated] = await db
    .update(schema.councilMeetings)
    .set({
      status: 'completed',
      state: {
        ...(meeting.state || { queue: [], rounds: 0, maxRounds: 2 }),
        queue: [],
        concluded: true
      }
    })
    .where(eq(schema.councilMeetings.id, meeting.id))
    .returning()

  return updated
})
