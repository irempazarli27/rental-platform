import { apiRequest } from "./client";

export interface AssistantMessage {
  role: "user" | "assistant";
  text: string;
}

export function getAiStatus() {
  return apiRequest<{ enabled: boolean }>("/api/ai/status", { auth: false });
}

export function askAssistant(messages: AssistantMessage[]) {
  return apiRequest<{ reply: string }>("/api/ai/assistant", { method: "POST", body: { messages } });
}
