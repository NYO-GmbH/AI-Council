import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const lmstudio = createOpenAICompatible({
  name: "lmstudio",
  baseURL: process.env.LM_STUDIO_BASE_URL || "http://localhost:1235/v1",
});

export const defaultModel = lmstudio(
  process.env.LM_STUDIO_MODEL_NAME || "qwen/qwen3-4b-2507",
);
