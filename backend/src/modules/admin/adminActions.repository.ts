import { db } from "../../db";

export const adminActionsRepository = {
  log(data: { adminId: string; actionType: string; targetType: string; targetId: string; notes: string | null }) {
    return db
      .insertInto("admin_actions")
      .values({
        admin_id: data.adminId,
        action_type: data.actionType,
        target_type: data.targetType,
        target_id: data.targetId,
        notes: data.notes,
      })
      .execute();
  },
};
