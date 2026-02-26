import { eq } from "drizzle-orm";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event);

  const meeting = await db.query.councilMeetings.findFirst({
    where: () => eq(schema.councilMeetings.id, id as string),
  });

  if (!meeting) {
    throw createError({
      statusCode: 404,
      statusMessage: "Council meeting not found.",
    });
  }

  if (meeting.status === "completed") {
    return meeting;
  }

  await db.insert(schema.councilMessages).values({
    meetingId: meeting.id,
    role: "system",
    content: "Meeting was stopped manually by the user.",
  });

  const [updated] = await db
    .update(schema.councilMeetings)
    .set({
      status: "completed",
      state: {
        ...(meeting.state || { queue: [], rounds: 0, maxRounds: 2 }),
        queue: [],
        concluded: true,
      },
    })
    .where(eq(schema.councilMeetings.id, meeting.id))
    .returning();

  return updated;
});
