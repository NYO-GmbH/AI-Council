import { desc } from "drizzle-orm";
import { db, schema } from "~~/server/db";

export default defineEventHandler(async (event) => {
  return db.query.councilMeetings.findMany({
    orderBy: () => desc(schema.councilMeetings.createdAt),
  });
});
