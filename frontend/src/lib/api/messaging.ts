import { apiRequest } from "./client";

export interface MessageParty {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  flagged: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  itemId: string | null;
  itemTitle: string | null;
  rentalId: string | null;
  counterparty: MessageParty | null;
  lastMessage: Message | null;
  unreadCount: number;
  createdAt: string;
}

export function startConversation(input: { recipientId: string; itemId?: string; rentalId?: string }) {
  return apiRequest<{ conversation: Conversation }>("/api/conversations", { method: "POST", body: input });
}

export function listConversations() {
  return apiRequest<{ conversations: Conversation[]; unreadCount: number }>("/api/conversations");
}

export function listMessages(conversationId: string) {
  return apiRequest<{ messages: Message[] }>(`/api/conversations/${conversationId}/messages`);
}

export function sendMessage(conversationId: string, content: string) {
  return apiRequest<{ message: Message }>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { content },
  });
}
