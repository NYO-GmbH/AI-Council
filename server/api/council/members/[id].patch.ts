import { db, schema } from "~~/server/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(2).max(40).optional(),
  title: z.string().min(2).max(60).optional(),
  personality: z.string().min(10).max(400).optional(),
  objective: z.string().min(5).max(200).optional(),
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  isActive: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event);
  const body = await readValidatedBody(event, bodySchema.parse);

  if (Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Keine Änderungen angegeben.",
    });
  }

  const [member] = await db
    .update(schema.councilMembers)
    .set(body)
    .where(and(eq(schema.councilMembers.id, id as string)))
    .returning();

  if (!member) {
    throw createError({
      statusCode: 404,
      statusMessage: "Ratsmitglied nicht gefunden.",
    });
  }

  return member;
});
