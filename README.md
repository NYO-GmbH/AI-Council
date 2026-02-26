# Tagalong

Tagalong is an AI Council application built with Nuxt 4. Instead of a single chatbot, Tagalong runs a moderated roundtable of AI members with distinct roles, personalities, and objectives.

Each meeting progresses in turns. Members contribute concise responses, you can interrupt with new direction mid-meeting, and the system generates a final verdict with:
- a summary
- a winning idea
- a vote result

## What It Does

- Manage a council roster (create, edit, activate/pause, delete members)
- Seed a default set of council personas
- Start topic-based meetings with configurable round limits
- Watch live transcript updates as members speak
- Interrupt active meetings with user nudges
- End meetings early or let the council conclude automatically
- Persist meetings, messages, and member data in SQLite via Drizzle ORM

## Tech Stack

- Nuxt 4 + Vue 3 + Nuxt UI
- Nitro server API routes
- Drizzle ORM + SQLite
- Vercel AI SDK using an OpenAI-compatible LM Studio endpoint

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Prepare the database

```bash
npm run db:push
```

### 3. Start your model endpoint

By default, Tagalong uses LM Studio at:

`http://127.0.0.1:1234/v1`

The default model is configured in `server/utils/lmstudio.ts`.

### 4. Run the app

```bash
npm run dev
```

Open the app, go to `/council/members`, and generate sample members before starting your first meeting.

## Useful Scripts

- `npm run dev` - Start local development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run Nuxt type checks
- `npm run db:generate` - Generate Drizzle migration files
- `npm run db:push` - Push schema changes to SQLite
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Drizzle Studio

## Core Routes

- `/council` - Council chamber and live meetings
- `/council/members` - Council member management

## Notes

- SSR is disabled (`ssr: false`) in `nuxt.config.ts`.
- Council behavior and verdict generation logic live under `server/api/council/**`.
