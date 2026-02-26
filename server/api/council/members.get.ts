import { asc } from "drizzle-orm";
import { db, schema } from "~~/server/db";

export default defineEventHandler(async (event) => {
  return db.query.councilMembers.findMany({
    orderBy: () => asc(schema.councilMembers.createdAt),
  });
});
