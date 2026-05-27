import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { getSettings } from './settings'

export async function getModel() {
  const { baseUrl, modelName } = await getSettings()
  return createOpenAICompatible({ name: 'lmstudio', baseURL: baseUrl })(modelName)
}
