import { db } from "../../db";

export const itemAccessoriesRepository = {
  listByItemId(itemId: string) {
    return db
      .selectFrom("item_accessories")
      .selectAll()
      .where("item_id", "=", itemId)
      .orderBy("name", "asc")
      .execute();
  },

  replaceForItem(itemId: string, accessories: { name: string; quantity: number }[]) {
    return db.transaction().execute(async (trx) => {
      await trx.deleteFrom("item_accessories").where("item_id", "=", itemId).execute();
      if (accessories.length === 0) return [];

      return trx
        .insertInto("item_accessories")
        .values(accessories.map((a) => ({ item_id: itemId, name: a.name, quantity: a.quantity })))
        .returningAll()
        .execute();
    });
  },
};
