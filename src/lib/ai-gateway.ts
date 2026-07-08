import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// BYO-key providers only. Lovable AI Gateway removed by design.
export const createOpenAIProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

export const createAnthropicProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "anthropic",
    baseURL: "https://api.anthropic.com/v1",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
  });

export const createGeminiProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
