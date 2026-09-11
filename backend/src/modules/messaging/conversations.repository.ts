import { db } from "../../db";

export const conversationsRepository = {
  findByParticipantsAndItem(userA: string, userB: string, itemId: string | null) {
    let query = db
      .selectFrom("conversations")
      .selectAll()
      .where((eb) =>
        eb.or([
          eb.and([eb("participant_one_id", "=", userA), eb("participant_two_id", "=", userB)]),
          eb.and([eb("participant_one_id", "=", userB), eb("participant_two_id", "=", userA)]),
        ]),
      );
    query = itemId ? query.where("item_id", "=", itemId) : query.where("item_id", "is", null);
    return query.executeTakeFirst();
  },

  create(data: { participantOneId: string; participantTwoId: string; itemId: string | null; rentalId: string | null }) {
    return db
      .insertInto("conversations")
      .values({
        participant_one_id: data.participantOneId,
        participant_two_id: data.participantTwoId,
        item_id: data.itemId,
        rental_id: data.rentalId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  findById(id: string) {
    return db.selectFrom("conversations").selectAll().where("id", "=", id).executeTakeFirst();
  },

  listForUser(userId: string) {
    return db
      .selectFrom("conversations")
      .selectAll()
      .where((eb) => eb.or([eb("participant_one_id", "=", userId), eb("participant_two_id", "=", userId)]))
      .orderBy("created_at", "desc")
      .execute();
  },
};
