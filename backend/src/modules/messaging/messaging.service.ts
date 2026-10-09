import { AppError } from "../../utils/AppError";
import { itemsRepository } from "../items/items.repository";
import { notificationsService } from "../notifications/notifications.service";
import { usersRepository } from "../users/users.repository";
import { conversationsRepository } from "./conversations.repository";
import { looksLikeContactInfo } from "./contactInfoHeuristic";
import { messagesRepository } from "./messages.repository";
import { conversationBase, toMessageDto, type ConversationDto, type MessageDto } from "./messaging.types";
import type { StartConversationInput } from "./messaging.validation";

function assertParticipant(conversation: { participant_one_id: string; participant_two_id: string }, userId: string) {
  if (conversation.participant_one_id !== userId && conversation.participant_two_id !== userId) {
    throw AppError.notFound("Conversation not found");
  }
}

export const messagingService = {
  async startOrGet(requesterId: string, input: StartConversationInput): Promise<ConversationDto> {
    if (input.recipientId === requesterId) {
      throw AppError.badRequest("You cannot message yourself", "SELF_CONVERSATION");
    }
    const recipient = await usersRepository.findById(input.recipientId);
    if (!recipient || recipient.status === "deleted") throw AppError.notFound("User not found");

    const itemId = input.itemId ?? null;
    const existing = await conversationsRepository.findByParticipantsAndItem(requesterId, input.recipientId, itemId);
    const conversation =
      existing ??
      (await conversationsRepository.create({
        participantOneId: requesterId,
        participantTwoId: input.recipientId,
        itemId,
        rentalId: input.rentalId ?? null,
      }));

    return this.toDto(conversation, requesterId);
  },

  async toDto(
    conversation: Awaited<ReturnType<typeof conversationsRepository.findById>>,
    viewerId: string,
  ): Promise<ConversationDto> {
    if (!conversation) throw AppError.notFound("Conversation not found");
    const counterpartyId =
      conversation.participant_one_id === viewerId ? conversation.participant_two_id : conversation.participant_one_id;

    const [counterparty, item, messages] = await Promise.all([
      usersRepository.findById(counterpartyId),
      conversation.item_id ? itemsRepository.findById(conversation.item_id) : Promise.resolve(null),
      messagesRepository.listByConversationId(conversation.id),
    ]);

    const lastMessage = messages.length > 0 ? toMessageDto(messages[messages.length - 1]) : null;
    const unreadCount = messages.filter((m) => !m.read_at && m.sender_id !== viewerId).length;

    return {
      ...conversationBase(conversation),
      itemTitle: item?.title ?? null,
      counterparty: counterparty
        ? { id: counterparty.id, fullName: counterparty.full_name, avatarUrl: counterparty.avatar_url }
        : null,
      lastMessage,
      unreadCount,
    };
  },

  async listMine(userId: string): Promise<ConversationDto[]> {
    const conversations = await conversationsRepository.listForUser(userId);
    const dtos = await Promise.all(conversations.map((c) => this.toDto(c, userId)));
    return dtos.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  },

  async getMessages(conversationId: string, requesterId: string): Promise<MessageDto[]> {
    const conversation = await conversationsRepository.findById(conversationId);
    if (!conversation) throw AppError.notFound("Conversation not found");
    assertParticipant(conversation, requesterId);

    await messagesRepository.markReadForRecipient(conversationId, requesterId);
    const messages = await messagesRepository.listByConversationId(conversationId);
    return messages.map(toMessageDto);
  },

  async sendMessage(conversationId: string, requesterId: string, content: string): Promise<MessageDto> {
    const conversation = await conversationsRepository.findById(conversationId);
    if (!conversation) throw AppError.notFound("Conversation not found");
    assertParticipant(conversation, requesterId);

    const recipientId =
      conversation.participant_one_id === requesterId ? conversation.participant_two_id : conversation.participant_one_id;
    const recipient = await usersRepository.findById(recipientId);
    if (recipient?.status === "deleted") {
      throw AppError.conflict("Bu kullanıcı hesabını sildi, mesaj gönderilemez", "RECIPIENT_DELETED");
    }

    const message = await messagesRepository.create({
      conversationId,
      senderId: requesterId,
      content,
      flagged: looksLikeContactInfo(content),
    });

    await notificationsService.notify(recipientId, "new_message", "Yeni mesaj", "Yeni bir mesajın var.", {
      type: "conversation",
      id: conversationId,
    });

    return toMessageDto(message);
  },

  async getUnreadCount(userId: string): Promise<number> {
    const result = await messagesRepository.countUnreadForUser(userId);
    return Number(result?.count ?? 0);
  },
};
