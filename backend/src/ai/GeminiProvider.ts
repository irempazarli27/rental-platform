import { GoogleGenAI, type Content, type Part } from "@google/genai";
import type { AiPart, AiProvider, ChatRequest, ModelTier, StructuredRequest, StructuredResult } from "./AiProvider";

const DEFAULT_MAX_TOOL_ROUNDS = 5;

function toParts(parts: AiPart[]): Part[] {
  return parts.map((p) =>
    "text" in p ? { text: p.text } : { inlineData: { data: p.media.data.toString("base64"), mimeType: p.media.mimeType } },
  );
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly models: Record<ModelTier, string>,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateStructured(request: StructuredRequest): Promise<StructuredResult> {
    const model = this.models[request.tier];
    const response = await this.client.models.generateContent({
      model,
      contents: [{ role: "user", parts: toParts(request.parts) }],
      config: {
        systemInstruction: request.system,
        responseMimeType: "application/json",
        responseJsonSchema: request.schema,
        maxOutputTokens: request.maxOutputTokens ?? 2048,
      },
    });
    const text = response.text;
    if (!text) throw new Error(`Gemini returned no text (finish reason: ${response.candidates?.[0]?.finishReason ?? "unknown"})`);
    return { value: JSON.parse(text), model };
  }

  async chat(request: ChatRequest): Promise<{ text: string; model: string }> {
    const model = this.models.vision;
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
      maxOutputTokens: 1024,
    };

    for (let round = 0; round <= (request.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS); round++) {
      const response = await this.client.models.generateContent({ model, contents, config });
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
