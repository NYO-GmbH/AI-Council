import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
export * as schema from "./schema";

export const db = drizzle({
  connection: {
    url: "file:./server/db/db.sqlite",
  },
  schema,
});
