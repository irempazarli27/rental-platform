import { db } from "../../db";

export const availabilityRepository = {
  listForItem(itemId: string) {
    return db
      .selectFrom("item_availability_blocks")
      .selectAll()
      .where("item_id", "=", itemId)
      .orderBy("start_date", "asc")
      .execute();
  },

  findOverlapping(itemId: string, startDate: string, endDate: string) {
    return db
      .selectFrom("item_availability_blocks")
      .selectAll()
      .where("item_id", "=", itemId)
      .where("start_date", "<=", endDate)
      .where("end_date", ">=", startDate)
      .execute();
  },

  createManualBlock(itemId: string, startDate: string, endDate: string) {
    return db
      .insertInto("item_availability_blocks")
      .values({ item_id: itemId, start_date: startDate, end_date: endDate, reason: "manual" })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  createRentalBlock(itemId: string, startDate: string, endDate: string, rentalId: string) {
    return db
      .insertInto("item_availability_blocks")
      .values({ item_id: itemId, start_date: startDate, end_date: endDate, reason: "rental", rental_id: rentalId })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  deleteByRentalId(rentalId: string) {
    return db.deleteFrom("item_availability_blocks").where("rental_id", "=", rentalId).executeTakeFirst();
  },

  findById(id: string) {
    return db
      .selectFrom("item_availability_blocks")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  },

  deleteById(id: string) {
    return db.deleteFrom("item_availability_blocks").where("id", "=", id).executeTakeFirst();
  },
};
