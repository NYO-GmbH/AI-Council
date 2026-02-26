import { db, schema } from "hub:db";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(2).max(40),
  title: z.string().min(2).max(60),
  personality: z.string().min(10).max(400),
  objective: z.string().min(5).max(200),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{6})$/),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse);

  const [member] = await db
    .insert(schema.councilMembers)
    .values({
      ...body,
    })
    .returning();

  return member;
});
