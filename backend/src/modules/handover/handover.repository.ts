import type { Updateable } from "kysely";
import { db } from "../../db";
import type { HandoverRecordsTable, HandoverType } from "../../db/types";

export const handoverRepository = {
  findByRentalAndType(rentalId: string, type: HandoverType) {
    return db
      .selectFrom("handover_records")
      .selectAll()
      .where("rental_id", "=", rentalId)
      .where("type", "=", type)
      .executeTakeFirst();
  },

  findById(id: string) {
    return db.selectFrom("handover_records").selectAll().where("id", "=", id).executeTakeFirst();
  },

  async getOrCreate(rentalId: string, type: HandoverType, performedBy: string, linkedRecordId: string | null) {
    const existing = await this.findByRentalAndType(rentalId, type);
    if (existing) return existing;

    return db
      .insertInto("handover_records")
      .values({
        rental_id: rentalId,
        type,
        performed_by: performedBy,
        linked_record_id: linkedRecordId,
        status: "in_progress",
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  update(id: string, patch: Updateable<HandoverRecordsTable>) {
    return db
      .updateTable("handover_records")
      .set(patch)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },
};
