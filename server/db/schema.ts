import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
};

export const councilMembers = sqliteTable("council_members", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  title: text("title").notNull(),
  personality: text("personality").notNull(),
  objective: text("objective").notNull(),
  accentColor: text("accent_color").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const councilMembersRelations = relations(
  councilMembers,
  ({ many }) => ({
    messages: many(councilMessages),
  }),
);

export const councilMeetings = sqliteTable("council_meetings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  topic: text("topic").notNull(),
  status: text("status", { enum: ["active", "paused", "completed"] })
    .notNull()
    .default("active"),
  state: text("state", { mode: "json" })
    .$type<{
      queue: string[];
      rounds: number;
      maxRounds: number;
      proactivePrompt?: string;
      concluded?: boolean;
      verdict?: {
        summary: string;
        winningIdea: string;
        voteResult: string;
      };
    }>()
    .notNull()
    .default({
      queue: [],
      rounds: 0,
      maxRounds: 2,
    }),
  lastSpokeAt: integer("last_spoke_at", { mode: "timestamp" }),
  ...timestamps,
});

export const councilMeetingsRelations = relations(
  councilMeetings,
  ({ many }) => ({
    messages: many(councilMessages),
  }),
);

export const councilMessages = sqliteTable(
  "council_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => councilMeetings.id, { onDelete: "cascade" }),
    memberId: text("member_id").references(() => councilMembers.id, {
      onDelete: "set null",
    }),
    role: text("role", { enum: ["user", "agent", "system"] }).notNull(),
    content: text("content").notNull(),
    ...timestamps,
  },
  (table) => [
    index("council_messages_meeting_id_idx").on(table.meetingId),
    index("council_messages_member_id_idx").on(table.memberId),
  ],
);

export const councilMessagesRelations = relations(
  councilMessages,
  ({ one }) => ({
    meeting: one(councilMeetings, {
      fields: [councilMessages.meetingId],
      references: [councilMeetings.id],
    }),
    member: one(councilMembers, {
      fields: [councilMessages.memberId],
      references: [councilMembers.id],
    }),
  }),
);
