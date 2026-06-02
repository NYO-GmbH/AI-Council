import { db, schema } from "~~/server/db";
import { and, desc, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event);

  const member = await db.query.councilMembers.findFirst({
    where: () => eq(schema.councilMembers.id, id as string),
  });

  if (!member) {
    throw createError({
      statusCode: 404,
      statusMessage: "Council member not found.",
    });
  }

  const outputs = await db.query.councilMessages.findMany({
    where: () =>
      and(
        eq(schema.councilMessages.memberId, id as string),
        eq(schema.councilMessages.role, "agent"),
      ),
    with: {
      meeting: true,
    },
    orderBy: () => desc(schema.councilMessages.createdAt),
    limit: 100,
  });

  return outputs.map((output) => ({
    id: output.id,
    content: output.content,
    createdAt: output.createdAt,
    meetingId: output.meetingId,
    meetingTopic: output.meeting?.topic || "Unbenannte Sitzung",
  }));
});
