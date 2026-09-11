import { db } from "../../db";

export const categoriesRepository = {
  listActive() {
    return db
      .selectFrom("categories")
      .selectAll()
      .where("is_active", "=", true)
      .orderBy("sort_order", "asc")
      .orderBy("name", "asc")
      .execute();
  },

  findById(id: string) {
    return db.selectFrom("categories").selectAll().where("id", "=", id).executeTakeFirst();
  },
};
