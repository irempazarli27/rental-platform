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
};
