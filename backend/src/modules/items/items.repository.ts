import { expressionBuilder, sql, type Expression, type Insertable, type SqlBool, type Updateable } from "kysely";
import { db } from "../../db";
import type { Database, ItemStatus, ItemsTable } from "../../db/types";
import type { ListItemsQuery } from "./items.validation";

type NewItemRow = Insertable<ItemsTable>;

function buildSearchConditions(filters: ListItemsQuery): Expression<SqlBool>[] {
  const eb = expressionBuilder<Database, "items">();
  const conditions: Expression<SqlBool>[] = [eb("status", "=", "active")];

  if (filters.categoryId) conditions.push(eb("category_id", "=", filters.categoryId));
  if (filters.ownerId) conditions.push(eb("owner_id", "=", filters.ownerId));
  if (filters.minPrice != null) conditions.push(eb("daily_price", ">=", String(filters.minPrice)));
  if (filters.maxPrice != null) conditions.push(eb("daily_price", "<=", String(filters.maxPrice)));
  if (filters.city) conditions.push(eb("city", "ilike", filters.city));
  if (filters.condition) conditions.push(eb("condition", "=", filters.condition));
  if (filters.riskLevel) conditions.push(eb("risk_level", "=", filters.riskLevel));

  if (filters.q) {
    conditions.push(
      sql<boolean>`to_tsvector('simple', title || ' ' || description) @@ plainto_tsquery('simple', ${filters.q})`,
    );
  }

  if (filters.lat != null && filters.lng != null) {
    const radiusKm = filters.radiusKm ?? 25;
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.max(Math.cos((filters.lat * Math.PI) / 180), 0.1));
    conditions.push(
      eb("lat", "is not", null),
      eb("lng", "is not", null),
      eb("lat", ">=", filters.lat - latDelta),
      eb("lat", "<=", filters.lat + latDelta),
      eb("lng", ">=", filters.lng - lngDelta),
      eb("lng", "<=", filters.lng + lngDelta),
    );
  }

  if (filters.startDate && filters.endDate) {
    const startDate = filters.startDate;
    const endDate = filters.endDate;
    conditions.push(
      eb.not(
        eb.exists(
          eb
            .selectFrom("item_availability_blocks as b")
            .select("b.id")
            .whereRef("b.item_id", "=", "items.id")
            .where("b.start_date", "<=", endDate)
            .where("b.end_date", ">=", startDate),
        ),
      ),
    );
  }

  return conditions;
}

export const itemsRepository = {
  create(data: NewItemRow) {
    return db.insertInto("items").values(data).returningAll().executeTakeFirstOrThrow();
  },

  findById(id: string) {
    return db.selectFrom("items").selectAll().where("id", "=", id).executeTakeFirst();
  },

  findByIds(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return db.selectFrom("items").selectAll().where("id", "in", ids).execute();
  },

  update(id: string, patch: Updateable<ItemsTable>) {
    return db
      .updateTable("items")
      .set(patch)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  listByOwner(ownerId: string) {
    return db
      .selectFrom("items")
      .selectAll()
      .where("owner_id", "=", ownerId)
      .where("status", "!=", "deleted")
      .orderBy("created_at", "desc")
      .execute();
  },

  async search(filters: ListItemsQuery) {
    const conditions = buildSearchConditions(filters);
    const offset = (filters.page - 1) * filters.pageSize;

    const [rows, countResult] = await Promise.all([
      db
        .selectFrom("items")
        .selectAll()
        .where((eb) => eb.and(conditions))
        .orderBy("created_at", "desc")
        .limit(filters.pageSize)
        .offset(offset)
        .execute(),
      db
        .selectFrom("items")
        .select(({ fn }) => fn.countAll<string>().as("count"))
        .where((eb) => eb.and(conditions))
        .executeTakeFirst(),
    ]);

    return { rows, total: Number(countResult?.count ?? 0) };
  },

  async listAllForAdmin(page: number, pageSize: number, status?: ItemStatus) {
    let query = db.selectFrom("items").selectAll();
    let countQuery = db.selectFrom("items").select(({ fn }) => fn.countAll<string>().as("count"));
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
    return db.selectFrom("items").select(["status"]).select(({ fn }) => fn.countAll<string>().as("count")).groupBy("status").execute();
  },
};
