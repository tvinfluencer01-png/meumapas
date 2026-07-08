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
    headers: { Authorization: `Bearer ${apiKey}` },
  });

export const createGeminiProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

// Novos provedores gratuitos (compatíveis com OpenAI):
export const createGroqProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

export const createMistralProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "mistral",
    baseURL: "https://api.mistral.ai/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

export const createOpenRouterProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
