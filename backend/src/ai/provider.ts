import { env } from "../config/env";
import type { AiProvider } from "./AiProvider";
import { GeminiProvider } from "./GeminiProvider";

function createProvider(): AiProvider | null {
  if (!env.ai.apiKey) return null;
  if (env.ai.provider === "gemini") return new GeminiProvider(env.ai.apiKey, env.ai.models);
  throw new Error(`Unknown AI_PROVIDER: ${env.ai.provider}`);
}

/** The configured provider, or null when AI is switched off (no API key). Tests replace this module. */
export const provider: AiProvider | null = createProvider();
