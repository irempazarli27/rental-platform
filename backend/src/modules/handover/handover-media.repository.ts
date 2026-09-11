import { db } from "../../db";
import type { HandoverStep, MediaType } from "../../db/types";

export const handoverMediaRepository = {
  add(data: { handoverRecordId: string; step: HandoverStep; mediaType: MediaType; url: string; uploadedBy: string }) {
    return db
      .insertInto("handover_media")
      .values({
        handover_record_id: data.handoverRecordId,
        step: data.step,
        media_type: data.mediaType,
        url: data.url,
        uploaded_by: data.uploadedBy,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  listByRecordId(handoverRecordId: string) {
    return db
      .selectFrom("handover_media")
      .selectAll()
      .where("handover_record_id", "=", handoverRecordId)
      .orderBy("created_at", "asc")
      .execute();
  },

  listByRecordIds(handoverRecordIds: string[]) {
    if (handoverRecordIds.length === 0) return Promise.resolve([]);
    return db
      .selectFrom("handover_media")
      .selectAll()
      .where("handover_record_id", "in", handoverRecordIds)
      .orderBy("created_at", "asc")
      .execute();
  },

  distinctStepsForRecord(handoverRecordId: string) {
    return db
      .selectFrom("handover_media")
      .select("step")
      .distinct()
      .where("handover_record_id", "=", handoverRecordId)
      .execute();
  },
};
