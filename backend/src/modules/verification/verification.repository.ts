import { db } from "../../db";

export const verificationRepository = {
  /** At most one live code per user+channel: issuing a new one replaces the old. */
  async replaceCode(data: { userId: string; channel: "email" | "phone"; target: string; codeHash: string; expiresAt: Date }) {
    await db.deleteFrom("verification_codes").where("user_id", "=", data.userId).where("channel", "=", data.channel).execute();
    await db
      .insertInto("verification_codes")
      .values({
        user_id: data.userId,
        channel: data.channel,
        target: data.target,
        code_hash: data.codeHash,
        expires_at: data.expiresAt,
      })
      .execute();
  },

  findCode(userId: string, channel: "email" | "phone") {
    return db
      .selectFrom("verification_codes")
      .selectAll()
      .where("user_id", "=", userId)
      .where("channel", "=", channel)
      .executeTakeFirst();
  },

  incrementAttempts(id: string) {
    return db
      .updateTable("verification_codes")
      .set((eb) => ({ attempts: eb("attempts", "+", 1) }))
      .where("id", "=", id)
      .execute();
  },

  deleteCode(id: string) {
    return db.deleteFrom("verification_codes").where("id", "=", id).execute();
  },

  /** Another account that already verified this phone number, if any. */
  findOtherVerifiedPhoneOwner(phone: string, exceptUserId: string) {
    return db
      .selectFrom("users")
      .select("id")
      .where("phone", "=", phone)
      .where("phone_verified_at", "is not", null)
      .where("id", "!=", exceptUserId)
      .executeTakeFirst();
  },

  findOtherByIdHash(hash: string, exceptUserId: string) {
    return db
      .selectFrom("users")
      .select("id")
      .where("id_number_hash", "=", hash)
      .where("id", "!=", exceptUserId)
      .executeTakeFirst();
  },
};
