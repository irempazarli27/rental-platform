import {
  ApiError,
  GoogleGenAI,
  ThinkingLevel,
  type Content,
  type GenerateContentParameters,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";
import type {
  AiPart,
  AiProvider,
  ChatRequest,
  ModelTier,
  StructuredRequest,
  StructuredResult,
  ThinkingEffort,
  TokenUsage,
} from "./AiProvider";

const DEFAULT_MAX_TOOL_ROUNDS = 5;
/** Per attempt. Without it a busy model held a request for minutes. */
const REQUEST_TIMEOUT_MS = 25_000;
/** Overload and rate-limit answers worth one more try, then the fallback model. */
const TRANSIENT_STATUSES = [429, 500, 503, 504];

function toParts(parts: AiPart[]): Part[] {
  return parts.map((p) =>
    "text" in p ? { text: p.text } : { inlineData: { data: p.media.data.toString("base64"), mimeType: p.media.mimeType } },
  );
}

const THINKING_LEVELS: Record<ThinkingEffort, ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

function isTimeout(err: unknown) {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError" || /timed? ?out|aborted/i.test(err.message));
}

function usageOf(response: GenerateContentResponse): TokenUsage | undefined {
  const u = response.usageMetadata;
  if (!u) return undefined;
  return { input: u.promptTokenCount ?? 0, output: u.candidatesTokenCount ?? 0, thinking: u.thoughtsTokenCount ?? 0 };
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly models: Record<ModelTier, string>,
  ) {
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: REQUEST_TIMEOUT_MS,
        // The SDK's own default backs off for up to a minute between many
        // attempts; one quick retry, then the fallback model, serves a user better.
        retryOptions: { attempts: 2, initialDelay: 1, maxDelay: 3, httpStatusCodes: TRANSIENT_STATUSES },
      },
    });
  }

  /**
   * Calls the tier's model; if it is overloaded or times out, tries the other
   * tier's model once. A slightly weaker answer beats an error page.
   */
  private async generate(tier: ModelTier, params: Omit<GenerateContentParameters, "model">) {
    const primary = this.models[tier];
    const fallback = this.models[tier === "vision" ? "fast" : "vision"];
    try {
      return { response: await this.client.models.generateContent({ ...params, model: primary }), model: primary };
    } catch (err) {
      const transient = (err instanceof ApiError && TRANSIENT_STATUSES.includes(err.status)) || isTimeout(err);
      if (!transient || fallback === primary) throw err;
      console.warn(`Gemini model ${primary} unavailable, falling back to ${fallback}:`, err instanceof Error ? err.message.slice(0, 120) : err);
      return { response: await this.client.models.generateContent({ ...params, model: fallback }), model: fallback };
    }
  }

  async generateStructured(request: StructuredRequest): Promise<StructuredResult> {
    const { response, model } = await this.generate(request.tier, {
      contents: [{ role: "user", parts: toParts(request.parts) }],
      config: {
        systemInstruction: request.system,
        responseMimeType: "application/json",
        responseJsonSchema: request.schema,
        maxOutputTokens: request.maxOutputTokens ?? 2048,
        ...(request.thinking ? { thinkingConfig: { thinkingLevel: THINKING_LEVELS[request.thinking] } } : {}),
      },
    });
    const text = response.text;
    if (!text) throw new Error(`Gemini returned no text (finish reason: ${response.candidates?.[0]?.finishReason ?? "unknown"})`);
    return { value: JSON.parse(text), model, usage: usageOf(response) };
  }

  async chat(request: ChatRequest): Promise<{ text: string; model: string }> {
    let model = this.models.vision;
    const contents: Content[] = request.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    }));
    const toolsByName = new Map(request.tools.map((t) => [t.name, t]));
    const config = {
      systemInstruction: request.system,
      tools: [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parametersJsonSchema: t.parameters,
          })),
        },
      ],
      // Reasoning tokens count toward this limit too, so leave room for both.
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingLevel: THINKING_LEVELS[request.thinking ?? "low"] },
    };

    for (let round = 0; round <= (request.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS); round++) {
      const result = await this.generate("vision", { contents, config });
      const response = result.response;
      model = result.model;
      const calls = response.functionCalls ?? [];
      if (calls.length === 0) {
        return { text: response.text ?? "", model };
      }

      // Keep the model's own turn (with its function calls) in the history, then
      // answer every call in one user turn, in the order they were made.
      const modelTurn = response.candidates?.[0]?.content;
      if (modelTurn) contents.push(modelTurn);
      const results: Part[] = [];
      for (const call of calls) {
        const tool = call.name ? toolsByName.get(call.name) : undefined;
        let output: Record<string, unknown>;
        try {
          output = tool ? { result: await tool.run(call.args ?? {}) } : { error: `Unknown tool: ${call.name}` };
        } catch (err) {
          output = { error: err instanceof Error ? err.message : "Tool failed" };
        }
        results.push({ functionResponse: { id: call.id, name: call.name, response: output } });
      }
      contents.push({ role: "user", parts: results });
    }
    throw new Error("Assistant exceeded the tool round limit");
  }
}
