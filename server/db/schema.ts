import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar').notNull(),
  username: text('username').notNull(),
  provider: text('provider', { enum: ['github'] }).notNull(),
  providerId: text('provider_id').notNull(),
  ...timestamps
}, table => [
  uniqueIndex('users_provider_id_idx').on(table.provider, table.providerId)
])

export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  councilMembers: many(councilMembers),
  councilMeetings: many(councilMeetings)
}))

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title'),
  userId: text('user_id').notNull(),
  ...timestamps
}, table => [
  index('chats_user_id_idx').on(table.userId)
])

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id]
  }),
  messages: many(messages)
}))

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  chatId: text('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  parts: text('parts', { mode: 'json' }),
  ...timestamps
}, table => [
  index('messages_chat_id_idx').on(table.chatId)
])

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id]
  })
}))

export const councilMembers = sqliteTable('council_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  title: text('title').notNull(),
  personality: text('personality').notNull(),
  objective: text('objective').notNull(),
  accentColor: text('accent_color').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps
}, table => [
  index('council_members_user_id_idx').on(table.userId)
])

export const councilMembersRelations = relations(councilMembers, ({ one, many }) => ({
  user: one(users, {
    fields: [councilMembers.userId],
    references: [users.id]
  }),
  messages: many(councilMessages)
}))

export const councilMeetings = sqliteTable('council_meetings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  topic: text('topic').notNull(),
  status: text('status', { enum: ['active', 'paused', 'completed'] }).notNull().default('active'),
  state: text('state', { mode: 'json' }).$type<{
    queue: string[]
    rounds: number
    maxRounds: number
    proactivePrompt?: string
    concluded?: boolean
    verdict?: {
      summary: string
      winningIdea: string
      voteResult: string
    }
  }>().notNull().default({
    queue: [],
    rounds: 0,
    maxRounds: 2
  }),
  lastSpokeAt: integer('last_spoke_at', { mode: 'timestamp' }),
  ...timestamps
}, table => [
  index('council_meetings_user_id_idx').on(table.userId)
])

export const councilMeetingsRelations = relations(councilMeetings, ({ one, many }) => ({
  user: one(users, {
    fields: [councilMeetings.userId],
    references: [users.id]
  }),
  messages: many(councilMessages)
}))

export const councilMessages = sqliteTable('council_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  meetingId: text('meeting_id').notNull().references(() => councilMeetings.id, { onDelete: 'cascade' }),
  memberId: text('member_id').references(() => councilMembers.id, { onDelete: 'set null' }),
  role: text('role', { enum: ['user', 'agent', 'system'] }).notNull(),
  content: text('content').notNull(),
  ...timestamps
}, table => [
  index('council_messages_meeting_id_idx').on(table.meetingId),
  index('council_messages_member_id_idx').on(table.memberId)
])

export const councilMessagesRelations = relations(councilMessages, ({ one }) => ({
  meeting: one(councilMeetings, {
    fields: [councilMessages.meetingId],
    references: [councilMeetings.id]
  }),
  member: one(councilMembers, {
    fields: [councilMessages.memberId],
    references: [councilMembers.id]
  })
}))
