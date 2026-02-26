import { desc } from "drizzle-orm";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  return db.query.councilMeetings.findMany({
    orderBy: () => desc(schema.councilMeetings.createdAt),
  });
});
