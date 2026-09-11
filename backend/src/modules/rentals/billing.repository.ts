import { db } from "../../db";

// No real payment gateway is wired up yet (see architecture notes on
// marketplace/split-payment providers) — these rows only record the computed
// amounts for bookkeeping so the ledger shape is correct ahead of that work.
export const billingRepository = {
  async recordAcceptance(rentalId: string, rentalPrice: string, platformFee: string, depositAmount: string) {
    await db
      .insertInto("payments")
      .values([
        { rental_id: rentalId, type: "rental_fee", amount: rentalPrice, status: "pending" },
        { rental_id: rentalId, type: "platform_fee", amount: platformFee, status: "pending" },
      ])
      .execute();

    await db
      .insertInto("deposit_holds")
      .values({ rental_id: rentalId, amount: depositAmount, status: "held" })
      .execute();
  },

  releaseDeposit(rentalId: string) {
    return db
      .updateTable("deposit_holds")
      .set({ status: "released", released_at: new Date() })
      .where("rental_id", "=", rentalId)
      .where("status", "=", "held")
      .execute();
  },

  findDepositByRentalId(rentalId: string) {
    return db.selectFrom("deposit_holds").selectAll().where("rental_id", "=", rentalId).executeTakeFirst();
  },

  /** claimedAmount < full deposit -> partial_claimed, otherwise (>=) fully claimed. */
  async claimDeposit(rentalId: string, claimedAmount: string, reason: string) {
    const hold = await this.findDepositByRentalId(rentalId);
    if (!hold) return;
    const isFull = Number(claimedAmount) >= Number(hold.amount);
    await db
      .updateTable("deposit_holds")
      .set({
        status: isFull ? "claimed" : "partial_claimed",
        claimed_amount: claimedAmount,
        claim_reason: reason,
        released_at: new Date(),
      })
      .where("rental_id", "=", rentalId)
      .execute();
  },

  sumPlatformFees() {
    return db
      .selectFrom("payments")
      .select(({ fn }) => fn.sum<string>("amount").as("total"))
      .where("type", "=", "platform_fee")
      .executeTakeFirst();
  },
};
