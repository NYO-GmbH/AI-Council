const KEY_BASE_URL = 'lm:baseUrl'
const KEY_MODEL_NAME = 'lm:modelName'
const KEY_PROVIDER = 'lm:provider'

export type Provider = 'lmstudio' | 'openai'

export const SETTINGS_DEFAULTS = {
  provider: (process.env.AI_PROVIDER ?? 'openai') as Provider,
  baseUrl: process.env.LM_STUDIO_BASE_URL ?? 'http://localhost:1235/v1',
  modelName: process.env.LM_STUDIO_MODEL_NAME ?? 'gpt-4o-mini',
}

export async function getSettings() {
  const storage = useStorage('data')
  const provider =
    ((await storage.getItem<string>(KEY_PROVIDER)) as Provider) ?? SETTINGS_DEFAULTS.provider
  const baseUrl =
    (await storage.getItem<string>(KEY_BASE_URL)) ?? SETTINGS_DEFAULTS.baseUrl
  const modelName =
    (await storage.getItem<string>(KEY_MODEL_NAME)) ?? SETTINGS_DEFAULTS.modelName
  return { provider, baseUrl, modelName }
}

export async function saveSettings(
  patch: Partial<{ provider: Provider; baseUrl: string; modelName: string }>,
) {
  const storage = useStorage('data')
  if (patch.provider !== undefined) {
    await storage.setItem(KEY_PROVIDER, patch.provider)
  }
  if (patch.baseUrl !== undefined) {
    await storage.setItem(KEY_BASE_URL, patch.baseUrl)
  }
  if (patch.modelName !== undefined) {
    await storage.setItem(KEY_MODEL_NAME, patch.modelName)
  }
}
