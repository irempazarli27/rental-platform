import { db } from "../../db";

export const itemImagesRepository = {
  listByItemId(itemId: string) {
    return db
      .selectFrom("item_images")
      .selectAll()
      .where("item_id", "=", itemId)
      .orderBy("sort_order", "asc")
      .execute();
  },

  async addMany(itemId: string, images: { url: string }[]) {
    if (images.length === 0) return [];

    const existing = await db
      .selectFrom("item_images")
      .select(({ fn }) => [fn.count<string>("id").as("count"), fn.max("sort_order").as("maxSortOrder")])
      .where("item_id", "=", itemId)
      .executeTakeFirst();

    const hasCover = Number(existing?.count ?? 0) > 0;
    const nextSortOrder = (existing?.maxSortOrder ?? -1) + 1;

    const rows = images.map((image, index) => ({
      item_id: itemId,
      url: image.url,
      sort_order: nextSortOrder + index,
      is_cover: !hasCover && index === 0,
    }));

    return db.insertInto("item_images").values(rows).returningAll().execute();
  },

  async listCoversByItemIds(itemIds: string[]) {
    if (itemIds.length === 0) return [];
    return db
      .selectFrom("item_images")
      .selectAll()
      .where("item_id", "in", itemIds)
      .where("is_cover", "=", true)
      .execute();
  },

  findById(id: string) {
    return db.selectFrom("item_images").selectAll().where("id", "=", id).executeTakeFirst();
  },

  deleteById(id: string) {
    return db.deleteFrom("item_images").where("id", "=", id).returningAll().executeTakeFirst();
  },

  async promoteNextCover(itemId: string) {
    const next = await db
      .selectFrom("item_images")
      .select("id")
      .where("item_id", "=", itemId)
      .orderBy("sort_order", "asc")
      .executeTakeFirst();

    if (next) {
      await db.updateTable("item_images").set({ is_cover: true }).where("id", "=", next.id).execute();
    }
  },
};
