import { db } from "../../db";
import type { DisputeStatus } from "../../db/types";

export const disputesRepository = {
  create(data: { rentalId: string; openedBy: string; reason: string }) {
    return db
      .insertInto("disputes")
      .values({ rental_id: data.rentalId, opened_by: data.openedBy, reason: data.reason })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  findById(id: string) {
    return db.selectFrom("disputes").selectAll().where("id", "=", id).executeTakeFirst();
  },

  findOpenOrUnderReviewForRental(rentalId: string) {
    return db
      .selectFrom("disputes")
      .selectAll()
      .where("rental_id", "=", rentalId)
      .where("status", "in", ["open", "under_review"])
      .executeTakeFirst();
  },

  listForRental(rentalId: string) {
    return db
      .selectFrom("disputes")
      .selectAll()
      .where("rental_id", "=", rentalId)
      .orderBy("created_at", "desc")
      .execute();
  },

  listAll(status?: DisputeStatus) {
    let query = db.selectFrom("disputes").selectAll();
    if (status) query = query.where("status", "=", status);
    return query.orderBy("created_at", "desc").execute();
  },

  countOpen() {
    return db
      .selectFrom("disputes")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .where("status", "in", ["open", "under_review"])
      .executeTakeFirst();
  },

  resolve(id: string, data: { status: DisputeStatus; resolutionNotes: string; resolvedBy: string }) {
    return db
      .updateTable("disputes")
      .set({
        status: data.status,
        resolution_notes: data.resolutionNotes,
        resolved_by: data.resolvedBy,
        resolved_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  addEvidence(data: { disputeId: string; uploadedBy: string; mediaUrl: string; description: string | null }) {
    return db
      .insertInto("dispute_evidence")
      .values({
        dispute_id: data.disputeId,
        uploaded_by: data.uploadedBy,
        media_url: data.mediaUrl,
        description: data.description,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  listEvidence(disputeId: string) {
    return db
      .selectFrom("dispute_evidence")
      .selectAll()
      .where("dispute_id", "=", disputeId)
      .orderBy("created_at", "asc")
      .execute();
  },
};
