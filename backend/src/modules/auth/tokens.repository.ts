import { db } from "../../db";

export const tokensRepository = {
  create(data: { id: string; userId: string; tokenHash: string; expiresAt: Date }) {
    return db
      .insertInto("refresh_tokens")
      .values({
        id: data.id,
        user_id: data.userId,
        token_hash: data.tokenHash,
        expires_at: data.expiresAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  findById(id: string) {
    return db.selectFrom("refresh_tokens").selectAll().where("id", "=", id).executeTakeFirst();
  },

  revoke(id: string) {
    return db
      .updateTable("refresh_tokens")
      .set({ revoked_at: new Date() })
      .where("id", "=", id)
      .executeTakeFirst();
  },

  revokeAllForUser(userId: string) {
    return db
      .updateTable("refresh_tokens")
      .set({ revoked_at: new Date() })
      .where("user_id", "=", userId)
      .where("revoked_at", "is", null)
      .executeTakeFirst();
  },
};
