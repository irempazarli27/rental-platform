import type { Insertable, Updateable } from "kysely";
import { db } from "../../db";
import type { RentalStatus, RentalsTable } from "../../db/types";
import type { ListRentalsQuery } from "./rentals.validation";

export const rentalsRepository = {
  create(data: Insertable<RentalsTable>) {
    return db.insertInto("rentals").values(data).returningAll().executeTakeFirstOrThrow();
  },

  findById(id: string) {
    return db.selectFrom("rentals").selectAll().where("id", "=", id).executeTakeFirst();
  },

  findByIds(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return db.selectFrom("rentals").selectAll().where("id", "in", ids).execute();
  },

  update(id: string, patch: Updateable<RentalsTable>) {
    return db
      .updateTable("rentals")
      .set(patch)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  listForUser(userId: string, query: ListRentalsQuery) {
    let q = db.selectFrom("rentals").selectAll();

    if (query.role === "renter") {
      q = q.where("renter_id", "=", userId);
    } else if (query.role === "owner") {
      q = q.where("owner_id", "=", userId);
    } else {
      q = q.where((eb) => eb.or([eb("renter_id", "=", userId), eb("owner_id", "=", userId)]));
    }

    if (query.status) {
      q = q.where("status", "=", query.status);
    }

    return q.orderBy("created_at", "desc").execute();
  },

  async listAllForAdmin(page: number, pageSize: number, status?: RentalStatus) {
    let query = db.selectFrom("rentals").selectAll();
    let countQuery = db.selectFrom("rentals").select(({ fn }) => fn.countAll<string>().as("count"));
    if (status) {
      query = query.where("status", "=", status);
      countQuery = countQuery.where("status", "=", status);
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

  countByStatus() {
    return db.selectFrom("rentals").select(["status"]).select(({ fn }) => fn.countAll<string>().as("count")).groupBy("status").execute();
  },
};
