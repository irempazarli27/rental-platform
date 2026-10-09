import { sql } from "kysely";
import { db } from "../db";

export const aiRepository = {
  findResult(kind: string, subjectId: string) {
    return db.selectFrom("ai_results").selectAll().where("kind", "=", kind).where("subject_id", "=", subjectId).executeTakeFirst();
  },

  /** One current result per (kind, subject): a newer input replaces the old output. */
  saveResult(kind: string, subjectId: string, inputHash: string, output: unknown, model: string) {
    return db
      .insertInto("ai_results")
      .values({ kind, subject_id: subjectId, input_hash: inputHash, output: JSON.stringify(output), model })
      .onConflict((oc) =>
        oc.columns(["kind", "subject_id"]).doUpdateSet({
          input_hash: inputHash,
          output: JSON.stringify(output),
          model,
          created_at: new Date(),
        }),
      )
      .execute();
  },

  logRequest(userId: string | null, kind: string) {
    return db.insertInto("ai_requests").values({ user_id: userId, kind }).execute();
  },

  /** Requests in the last 24 hours, overall and for one user. */
  async countRecent(userId: string | null) {
    const since = sql<Date>`now() - interval '1 day'`;
    const row = await db
      .selectFrom("ai_requests")
      .select(({ fn }) => [
        fn.countAll<string>().as("total"),
        fn.count<string>("id").filterWhere("user_id", "=", userId ?? "00000000-0000-0000-0000-000000000000").as("mine"),
      ])
      .where("created_at", ">", since)
      .executeTakeFirstOrThrow();
    return { total: Number(row.total), mine: Number(row.mine) };
  },
};
