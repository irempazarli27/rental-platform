import { db } from "../../db";

export const favoritesRepository = {
  /** Idempotent: favouriting twice keeps the original row (and its date). */
  add(userId: string, itemId: string) {
    return db
      .insertInto("favorites")
      .values({ user_id: userId, item_id: itemId })
      .onConflict((oc) => oc.doNothing())
      .execute();
  },

  remove(userId: string, itemId: string) {
    return db.deleteFrom("favorites").where("user_id", "=", userId).where("item_id", "=", itemId).execute();
  },

  /** Still-listed favourites, most recently added first. */
  listItems(userId: string) {
    return db
      .selectFrom("favorites")
      .innerJoin("items", "items.id", "favorites.item_id")
      .selectAll("items")
      .where("favorites.user_id", "=", userId)
      .where("items.status", "=", "active")
      .orderBy("favorites.created_at", "desc")
      .execute();
  },
};
