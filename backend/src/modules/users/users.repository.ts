import { db } from "../../db";
import type { NewUser, UserUpdate } from "../../db/types";

export const usersRepository = {
  findByEmail(email: string) {
    return db.selectFrom("users").selectAll().where("email", "=", email).executeTakeFirst();
  },

  findById(id: string) {
    return db.selectFrom("users").selectAll().where("id", "=", id).executeTakeFirst();
  },

  findByGoogleId(googleId: string) {
    return db.selectFrom("users").selectAll().where("google_id", "=", googleId).executeTakeFirst();
  },

  findByIds(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return db.selectFrom("users").selectAll().where("id", "in", ids).execute();
  },

  create(data: NewUser) {
    return db.insertInto("users").values(data).returningAll().executeTakeFirstOrThrow();
  },

  update(id: string, data: UserUpdate) {
    return db
      .updateTable("users")
      .set(data)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async listAllForAdmin(page: number, pageSize: number, q?: string) {
    let query = db.selectFrom("users").selectAll();
    let countQuery = db.selectFrom("users").select(({ fn }) => fn.countAll<string>().as("count"));
    if (q) {
      const pattern = `%${q}%`;
      query = query.where((eb) => eb.or([eb("email", "ilike", pattern), eb("full_name", "ilike", pattern)]));
      countQuery = countQuery.where((eb) => eb.or([eb("email", "ilike", pattern), eb("full_name", "ilike", pattern)]));
    }

    const [rows, countResult] = await Promise.all([
      query
        .orderBy("created_at", "desc")
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .execute(),
      countQuery.executeTakeFirst(),
    ]);

    return { rows, total: Number(countResult?.count ?? 0) };
  },

  countAll() {
    return db
      .selectFrom("users")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirst();
  },
};
