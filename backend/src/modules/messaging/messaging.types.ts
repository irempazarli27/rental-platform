import type { Selectable } from "kysely";
import type { ConversationsTable, MessagesTable } from "../../db/types";

type ConversationRow = Selectable<ConversationsTable>;
type MessageRow = Selectable<MessagesTable>;

export interface MessagePartyDto {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  flagged: boolean;
  readAt: Date | string | null;
  createdAt: Date | string;
}

export interface ConversationDto {
  id: string;
  itemId: string | null;
  itemTitle: string | null;
  rentalId: string | null;
  counterparty: MessagePartyDto | null;
  lastMessage: MessageDto | null;
  unreadCount: number;
  createdAt: Date | string;
}

export function toMessageDto(row: MessageRow): MessageDto {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    flagged: row.flagged,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function conversationBase(row: ConversationRow) {
  return {
    id: row.id,
    itemId: row.item_id,
    rentalId: row.rental_id,
    createdAt: row.created_at,
  };
}
