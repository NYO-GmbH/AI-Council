import { db, schema } from "~~/server/db";
import { and, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event);

  const [member] = await db
    .delete(schema.councilMembers)
    .where(and(eq(schema.councilMembers.id, id as string)))
    .returning();

  if (!member) {
    throw createError({
      statusCode: 404,
      statusMessage: "Council member not found.",
    });
  }

  return member;
});
