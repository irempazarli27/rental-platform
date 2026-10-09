import { db } from "../../db";

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

  listByRevieweeId(revieweeId: string) {
    return db
      .selectFrom("reviews")
      .selectAll()
      .where("reviewee_id", "=", revieweeId)
      .orderBy("created_at", "desc")
      .execute();
  },
};
