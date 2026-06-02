import { z } from 'zod'

const bodySchema = z.object({ code: z.string() })

export default defineEventHandler(async (event) => {
  const { code } = await readValidatedBody(event, bodySchema.parse)
  const expected = useRuntimeConfig().accessCode

  if (expected && code !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'Ungültiger Zugangscode.' })
  }

  setCookie(event, 'demo-session', '1', {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return { ok: true }
})
