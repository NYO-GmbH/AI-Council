import { z } from 'zod'
import { saveSettings } from '~~/server/utils/settings'

const bodySchema = z.object({
  provider: z.enum(['lmstudio', 'openai']).optional(),
  baseUrl: z.string().url().optional(),
  modelName: z.string().min(1).max(200).optional(),
})

export default defineEventHandler(async (event) => {
  const patch = await readValidatedBody(event, bodySchema.parse)
  await saveSettings(patch)
  return { ok: true }
})
