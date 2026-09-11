import { conversationsRepository } from "../messaging/conversations.repository";
import { messagesRepository } from "../messaging/messages.repository";
import { toMessageDto } from "../messaging/messaging.types";
import { usersRepository } from "../users/users.repository";

export const adminMessagesService = {
  async listFlagged(limit = 50) {
    const messages = await messagesRepository.listFlagged(limit);

    const conversationIds = [...new Set(messages.map((m) => m.conversation_id))];
    const conversations = await Promise.all(conversationIds.map((id) => conversationsRepository.findById(id)));
    const conversationById = new Map(conversations.filter((c) => !!c).map((c) => [c!.id, c!]));

    const senderIds = [...new Set(messages.map((m) => m.sender_id))];
    const senders = await usersRepository.findByIds(senderIds);
    const senderById = new Map(senders.map((s) => [s.id, s.full_name]));

    return messages.map((m) => {
      const conversation = conversationById.get(m.conversation_id);
      return {
        ...toMessageDto(m),
        senderName: senderById.get(m.sender_id) ?? null,
        participantOneId: conversation?.participant_one_id ?? null,
        participantTwoId: conversation?.participant_two_id ?? null,
      };
    });
  },
};
