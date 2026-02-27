import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

export const lmstudio = createOpenAICompatible({
  name: 'lmstudio',
  // baseURL: 'http://127.0.0.1:1234/v1'
  baseURL: 'http://192.168.178.154:1235/v1'
})

export const defaultModel = lmstudio('qwen/qwen3-4b-2507')
