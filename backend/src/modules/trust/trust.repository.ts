import { db } from "../../db";

export const trustRepository = {
  async countCompletedRentals(userId: string): Promise<number> {
    const row = await db
      .selectFrom("rentals")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .where("status", "=", "COMPLETED")
      .where((eb) => eb.or([eb("renter_id", "=", userId), eb("owner_id", "=", userId)]))
      .executeTakeFirst();
    return Number(row?.count ?? 0);
  },

  /** Disputes the admin resolved against this user (as renter or as owner). */
  async countLostDisputes(userId: string): Promise<number> {
    const row = await db
      .selectFrom("disputes")
      .innerJoin("rentals", "rentals.id", "disputes.rental_id")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .where((eb) =>
        eb.or([
          eb.and([eb("rentals.renter_id", "=", userId), eb("disputes.status", "=", "resolved_favor_owner")]),
          eb.and([eb("rentals.owner_id", "=", userId), eb("disputes.status", "=", "resolved_favor_renter")]),
        ]),
      )
      .executeTakeFirst();
    return Number(row?.count ?? 0);
  },
};
