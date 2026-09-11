import { db } from "../../db";
import type { DamageSeverity } from "../../db/types";

export const damageRepository = {
  create(data: {
    rentalId: string;
    handoverRecordId: string | null;
    reportedBy: string;
    description: string;
    severity: DamageSeverity;
  }) {
    return db
      .insertInto("damage_reports")
      .values({
        rental_id: data.rentalId,
        handover_record_id: data.handoverRecordId,
        reported_by: data.reportedBy,
        description: data.description,
        severity: data.severity,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  listByRentalId(rentalId: string) {
    return db
      .selectFrom("damage_reports")
      .selectAll()
      .where("rental_id", "=", rentalId)
      .orderBy("created_at", "asc")
      .execute();
  },
};
