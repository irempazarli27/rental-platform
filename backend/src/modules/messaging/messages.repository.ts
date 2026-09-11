import { db } from "../../db";

export const messagesRepository = {
  create(data: { conversationId: string; senderId: string; content: string; flagged: boolean }) {
    return db
      .insertInto("messages")
      .values({
        conversation_id: data.conversationId,
        sender_id: data.senderId,
        content: data.content,
        flagged: data.flagged,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  listByConversationId(conversationId: string) {
    return db
      .selectFrom("messages")
      .selectAll()
      .where("conversation_id", "=", conversationId)
      .orderBy("created_at", "asc")
      .execute();
  },

  listLastForConversations(conversationIds: string[]) {
    if (conversationIds.length === 0) return Promise.resolve([]);
    return db
      .selectFrom("messages")
      .selectAll()
      .where("conversation_id", "in", conversationIds)
      .orderBy("created_at", "desc")
      .execute();
  },

  markReadForRecipient(conversationId: string, recipientId: string) {
    return db
      .updateTable("messages")
      .set({ read_at: new Date() })
      .where("conversation_id", "=", conversationId)
      .where("sender_id", "!=", recipientId)
      .where("read_at", "is", null)
      .execute();
  },

  listFlagged(limit: number) {
    return db
      .selectFrom("messages")
      .selectAll()
      .where("flagged", "=", true)
      .orderBy("created_at", "desc")
      .limit(limit)
      .execute();
  },

  countUnreadForUser(userId: string) {
    return db
      .selectFrom("messages")
      .innerJoin("conversations", "conversations.id", "messages.conversation_id")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .where("messages.read_at", "is", null)
      .where("messages.sender_id", "!=", userId)
      .where((eb) =>
        eb.or([eb("conversations.participant_one_id", "=", userId), eb("conversations.participant_two_id", "=", userId)]),
      )
      .executeTakeFirst();
  },
};
