/**
 * What the app needs from a language model, independent of who provides it.
 * Feature code talks to `ai` (./index.ts), never to a vendor SDK, so switching
 * provider means writing one new class like GeminiProvider and nothing else.
 */

/** "fast" for cheap text work (summaries, prices); "vision" for images, video and the assistant. */
export type ModelTier = "fast" | "vision";

export type AiPart = { text: string } | { media: { data: Buffer; mimeType: string } };

/** A JSON Schema object describing the expected reply. */
export type JsonSchema = Record<string, unknown>;

export interface StructuredRequest {
  tier: ModelTier;
  system: string;
  parts: AiPart[];
  schema: JsonSchema;
  maxOutputTokens?: number;
}

export interface StructuredResult {
  /** The model's reply, parsed from JSON but not yet validated. */
  value: unknown;
  model: string;
}

export interface ChatTool {
  name: string;
  description: string;
  parameters: JsonSchema;
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface ChatRequest {
  system: string;
  messages: ChatMessage[];
  tools: ChatTool[];
  /** Upper bound on tool round-trips, so a confused model can't loop forever. */
  maxToolRounds?: number;
}

export interface AiProvider {
  readonly name: string;
  generateStructured(request: StructuredRequest): Promise<StructuredResult>;
  chat(request: ChatRequest): Promise<{ text: string; model: string }>;
}
