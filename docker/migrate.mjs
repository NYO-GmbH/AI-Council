import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { mkdirSync } from 'fs'

// Ensure the DB directory exists (first run on a fresh volume)
mkdirSync('./server/db', { recursive: true })

const db = drizzle({ connection: { url: 'file:./server/db/db.sqlite' } })

await migrate(db, { migrationsFolder: './migrations' })

console.log('Migrations applied.')
process.exit(0)
