import { asc, eq } from "drizzle-orm";
import { db, schema } from "~~/server/db";

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event);

  const meeting = await db.query.councilMeetings.findFirst({
    where: () => eq(schema.councilMeetings.id, id as string),
    with: {
      messages: {
        orderBy: () => asc(schema.councilMessages.createdAt),
        with: {
          member: true,
        },
      },
    },
  });

  if (!meeting) {
    throw createError({
      statusCode: 404,
      statusMessage: "Council meeting not found.",
    });
  }

  return meeting;
});
