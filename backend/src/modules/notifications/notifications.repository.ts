import { db } from "../../db";

export const notificationsRepository = {
  create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }) {
    return db
      .insertInto("notifications")
      .values({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        related_entity_type: data.relatedEntityType ?? null,
        related_entity_id: data.relatedEntityId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async hasUnread(userId: string, type: string, relatedEntityId: string | undefined) {
    const row = await db
      .selectFrom("notifications")
      .select("id")
      .where("user_id", "=", userId)
      .where("type", "=", type)
      .where("read_at", "is", null)
      .$if(relatedEntityId !== undefined, (qb) => qb.where("related_entity_id", "=", relatedEntityId!))
      .limit(1)
      .executeTakeFirst();
    return row !== undefined;
  },

  listForUser(userId: string) {
    return db
      .selectFrom("notifications")
      .selectAll()
      .where("user_id", "=", userId)
      .orderBy("created_at", "desc")
      .limit(100)
      .execute();
  },

  countUnread(userId: string) {
    return db
      .selectFrom("notifications")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .where("user_id", "=", userId)
      .where("read_at", "is", null)
      .executeTakeFirst();
  },

  findById(id: string) {
    return db.selectFrom("notifications").selectAll().where("id", "=", id).executeTakeFirst();
  },

  markRead(id: string) {
    return db
      .updateTable("notifications")
      .set({ read_at: new Date() })
      .where("id", "=", id)
      .where("read_at", "is", null)
      .executeTakeFirst();
  },
};
