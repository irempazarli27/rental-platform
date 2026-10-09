import bcrypt from "bcryptjs";
import { db } from "../../db";
import type { RentalStatus } from "../../db/types";
import { AppError } from "../../utils/AppError";
import { rentalsService } from "../rentals/rentals.service";
import { usersRepository } from "./users.repository";

// Rentals in these states still need both people: an item is out, a handover is
// half-done, or money/deposit is unsettled. Deleting mid-way would strand the other side.
const BLOCKING: RentalStatus[] = ["ACCEPTED", "READY_FOR_HANDOVER", "ACTIVE", "RETURN_PENDING", "RETURNED", "DISPUTED"];

export const DELETED_USER_NAME = "Silinmiş kullanıcı";

export const accountDeletionService = {
  /**
   * Deletes an account by erasing its personal data rather than the row.
   * Rentals, handover evidence, reviews and messages reference the user and
   * are kept for the other party and for dispute/legal records, so the row
   * stays as an anonymous "Silinmiş kullanıcı" with nothing identifying left.
   */
  async deleteAccount(userId: string, input: { password?: string; confirmEmail?: string }) {
    const user = await usersRepository.findById(userId);
    if (!user || user.status === "deleted") throw AppError.notFound("User not found");

    // Re-authenticate: a stolen or forgotten-open session must not be enough.
    if (user.password_hash) {
      if (!input.password || !(await bcrypt.compare(input.password, user.password_hash))) {
        throw new AppError(401, "Şifre hatalı", "INVALID_PASSWORD");
      }
    } else if (input.confirmEmail?.trim().toLowerCase() !== user.email.toLowerCase()) {
      throw AppError.badRequest("Onay için e-posta adresini doğru yaz", "CONFIRMATION_MISMATCH");
    }

    const rentals = await db
      .selectFrom("rentals")
      .select(["id", "status", "owner_id"])
      .where((eb) => eb.or([eb("renter_id", "=", userId), eb("owner_id", "=", userId)]))
      .where("status", "in", [...BLOCKING, "PENDING"])
      .execute();
    if (rentals.some((r) => r.status !== "PENDING")) {
      throw AppError.conflict(
        "Devam eden kiralamaların var. Hesabını silmeden önce bunların tamamlanması gerekiyor.",
        "ACTIVE_RENTALS",
      );
    }

    // Unanswered requests just end, through the normal paths so the other side is notified.
    for (const r of rentals) {
      if (r.owner_id === userId) await rentalsService.reject(r.id, userId);
      else await rentalsService.cancel(r.id, userId);
    }

    await db.transaction().execute(async (trx) => {
      await trx.updateTable("items").set({ status: "deleted" }).where("owner_id", "=", userId).execute();
      await trx.deleteFrom("favorites").where("user_id", "=", userId).execute();
      await trx.deleteFrom("verification_codes").where("user_id", "=", userId).execute();
      await trx.deleteFrom("notifications").where("user_id", "=", userId).execute();
      await trx.deleteFrom("refresh_tokens").where("user_id", "=", userId).execute();
      await trx
        .updateTable("users")
        .set({
          // Frees the address so the person can sign up again later.
          email: `deleted-${userId}@deleted.invalid`,
          password_hash: null,
          google_id: null,
          full_name: DELETED_USER_NAME,
          phone: null,
          avatar_url: null,
          bio: null,
          city: null,
          district: null,
          lat: null,
          lng: null,
          id_number_hash: null,
          email_verified_at: null,
          phone_verified_at: null,
          id_verified_at: null,
          verification_consent_at: null,
          verification_level: "none",
          status: "deleted",
          deleted_at: new Date(),
        })
        .where("id", "=", userId)
        .execute();
    });
  },
};
