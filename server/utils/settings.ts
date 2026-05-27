const KEY_BASE_URL = 'lm:baseUrl'
const KEY_MODEL_NAME = 'lm:modelName'

export const SETTINGS_DEFAULTS = {
  baseUrl: process.env.LM_STUDIO_BASE_URL ?? 'http://localhost:1235/v1',
  modelName: process.env.LM_STUDIO_MODEL_NAME ?? 'qwen/qwen3-4b-2507',
}

export async function getSettings() {
  const storage = useStorage('data')
  const baseUrl =
    (await storage.getItem<string>(KEY_BASE_URL)) ?? SETTINGS_DEFAULTS.baseUrl
  const modelName =
    (await storage.getItem<string>(KEY_MODEL_NAME)) ?? SETTINGS_DEFAULTS.modelName
  return { baseUrl, modelName }
}

export async function saveSettings(patch: Partial<{ baseUrl: string; modelName: string }>) {
  const storage = useStorage('data')
  if (patch.baseUrl !== undefined) {
    await storage.setItem(KEY_BASE_URL, patch.baseUrl)
  }
  if (patch.modelName !== undefined) {
    await storage.setItem(KEY_MODEL_NAME, patch.modelName)
  }
}
