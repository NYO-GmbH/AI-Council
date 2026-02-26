import { eq } from "drizzle-orm";
import { db, schema } from "~~/server/db";

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

  await db
    .delete(schema.councilMeetings)
    .where(eq(schema.councilMeetings.id, meeting.id));

  return {
    deleted: true,
    id: meeting.id,
  };
});
