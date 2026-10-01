import { sql } from "kysely";
import { db } from "../../db";

// Months and "today" are taken in Turkey's time zone: an owner looking at
// "this month" means their own calendar, not the server's UTC one.
const TZ = "Europe/Istanbul";

export const ownerInsightsRepository = {
  statusTotals(ownerId: string) {
    return db
      .selectFrom("rentals")
      .select(["status"])
      .select(({ fn }) => [fn.countAll<string>().as("count"), fn.sum<string>("rental_price").as("amount")])
      .where("owner_id", "=", ownerId)
      .groupBy("status")
      .execute();
  },

  /** Completed rentals grouped by the month they completed in, as YYYY-MM. */
  monthlyCompleted(ownerId: string, sinceMonth: string) {
    // The zone is inlined, not bound: as separate parameters Postgres can't tell
    // that the SELECT and GROUP BY expressions are the same one.
    const month = sql<string>`to_char(completed_at AT TIME ZONE ${sql.lit(TZ)}, 'YYYY-MM')`;
    return db
      .selectFrom("rentals")
      .select(month.as("month"))
      .select(({ fn }) => fn.sum<string>("rental_price").as("amount"))
      .where("owner_id", "=", ownerId)
      .where("status", "=", "COMPLETED")
      .where("completed_at", "is not", null)
      .where(month, ">=", sinceMonth)
      .groupBy(month)
      .execute();
  },

  /** Every listing the owner still has, with what its completed rentals brought in. */
  perItem(ownerId: string) {
    return db
      .selectFrom("items")
      .leftJoin("rentals", (join) =>
        join.onRef("rentals.item_id", "=", "items.id").on("rentals.status", "=", "COMPLETED"),
      )
      .select(["items.id", "items.title", "items.status"])
      .select(({ fn }) => [
        fn.count<string>("rentals.id").as("completed_count"),
        fn.coalesce(fn.sum<string>("rentals.rental_price"), sql<string>`0`).as("amount"),
        sql<string>`coalesce(sum(rentals.end_date - rentals.start_date + 1), 0)`.as("rented_days"),
      ])
      .where("items.owner_id", "=", ownerId)
      .where("items.status", "!=", "deleted")
      .groupBy(["items.id", "items.title", "items.status"])
      .orderBy("amount", "desc")
      .orderBy("items.created_at", "desc")
      .execute();
  },

  listItems(ownerId: string) {
    return db
      .selectFrom("items")
      .select(["id", "title"])
      .where("owner_id", "=", ownerId)
      .where("status", "!=", "deleted")
      .orderBy("title", "asc")
      .execute();
  },

  /** Booked and manually blocked ranges touching [from, to] on the owner's listings. */
  blocksInRange(ownerId: string, from: string, to: string) {
    return db
      .selectFrom("item_availability_blocks as b")
      .innerJoin("items", "items.id", "b.item_id")
      .leftJoin("rentals", "rentals.id", "b.rental_id")
      .leftJoin("users", "users.id", "rentals.renter_id")
      .select([
        "b.id",
        "b.item_id",
        "b.reason",
        "b.rental_id",
        "items.title as item_title",
        "users.full_name as renter_name",
      ])
      .select([sql<string>`b.start_date::text`.as("start_date"), sql<string>`b.end_date::text`.as("end_date")])
      .where("items.owner_id", "=", ownerId)
      .where("items.status", "!=", "deleted")
      .where("b.start_date", "<=", to)
      .where("b.end_date", ">=", from)
      .orderBy("b.start_date", "asc")
      .execute();
  },

  /** Requests the owner hasn't answered yet: they hold no block, but the owner should see them. */
  pendingInRange(ownerId: string, from: string, to: string) {
    return db
      .selectFrom("rentals")
      .innerJoin("items", "items.id", "rentals.item_id")
      .innerJoin("users", "users.id", "rentals.renter_id")
      .select(["rentals.id", "rentals.item_id", "items.title as item_title", "users.full_name as renter_name"])
      .select([
        sql<string>`rentals.start_date::text`.as("start_date"),
        sql<string>`rentals.end_date::text`.as("end_date"),
      ])
      .where("rentals.owner_id", "=", ownerId)
      .where("rentals.status", "=", "PENDING")
      .where("rentals.start_date", "<=", to)
      .where("rentals.end_date", ">=", from)
      .orderBy("rentals.start_date", "asc")
      .execute();
  },
};
