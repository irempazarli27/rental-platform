import { sql } from "kysely";
import { db } from "../../db";
import { REVEAL_TIMEOUT_DAYS } from "./reveal";

export const reviewsRepository = {
  create(data: { rentalId: string; reviewerId: string; revieweeId: string; rating: number; comment: string | null }) {
    return db
      .insertInto("reviews")
      .values({
        rental_id: data.rentalId,
        reviewer_id: data.reviewerId,
        reviewee_id: data.revieweeId,
        rating: data.rating,
        comment: data.comment,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  findByRentalAndReviewer(rentalId: string, reviewerId: string) {
    return db
      .selectFrom("reviews")
      .selectAll()
      .where("rental_id", "=", rentalId)
      .where("reviewer_id", "=", reviewerId)
      .executeTakeFirst();
  },

  listForRental(rentalId: string) {
    return db.selectFrom("reviews").selectAll().where("rental_id", "=", rentalId).execute();
  },

  listForRentals(rentalIds: string[]) {
    if (rentalIds.length === 0) return Promise.resolve([]);
    return db.selectFrom("reviews").selectAll().where("rental_id", "in", rentalIds).execute();
  },

  /** What renters wrote after renting this item (not what owners wrote about those renters). */
  listByRentersOfItem(itemId: string) {
    return db
      .selectFrom("reviews")
      .innerJoin("rentals", "rentals.id", "reviews.rental_id")
      .selectAll("reviews")
      .where("rentals.item_id", "=", itemId)
      .whereRef("reviews.reviewer_id", "=", "rentals.renter_id")
      .orderBy("reviews.created_at", "desc")
      .execute();
  },

  /**
   * Rating and count of the public renter reviews for many items in one query,
   * for listing cards. Mirrors the reveal rule in reviews.service: a review
   * counts once both sides have reviewed, or the window after completion ends.
   */
  async ratingStatsForItems(itemIds: string[]) {
    if (itemIds.length === 0) return new Map<string, { ratingAvg: number; ratingCount: number }>();
    const rows = await db
      .selectFrom("reviews")
      .innerJoin("rentals", "rentals.id", "reviews.rental_id")
      .select("rentals.item_id")
      .select(({ fn }) => [fn.avg<string>("reviews.rating").as("avg"), fn.countAll<string>().as("count")])
      .where("rentals.item_id", "in", itemIds)
      .whereRef("reviews.reviewer_id", "=", "rentals.renter_id")
      .where((eb) =>
        eb.or([
          eb(
            eb.selectFrom("reviews as both").select(({ fn }) => fn.countAll().as("n")).whereRef("both.rental_id", "=", "reviews.rental_id"),
            ">=",
            2,
          ),
          eb("rentals.completed_at", "<=", sql<Date>`now() - make_interval(days => ${REVEAL_TIMEOUT_DAYS})`),
        ]),
      )
      .groupBy("rentals.item_id")
      .execute();
    return new Map(
      rows.map((r) => [r.item_id, { ratingAvg: Math.round(Number(r.avg) * 100) / 100, ratingCount: Number(r.count) }]),
    );
  },

  listByRevieweeId(revieweeId: string) {
    return db
      .selectFrom("reviews")
      .selectAll()
      .where("reviewee_id", "=", revieweeId)
      .orderBy("created_at", "desc")
      .execute();
  },
};
