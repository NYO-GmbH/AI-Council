import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { getSettings } from './settings'

export async function getModel() {
  const { provider, baseUrl, modelName } = await getSettings()

  if (provider === 'openai') {
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY }).chat(modelName)
  }

  return createOpenAICompatible({ name: 'lmstudio', baseURL: baseUrl })(modelName)
}
