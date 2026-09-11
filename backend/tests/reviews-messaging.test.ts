import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import {
  advanceToActive,
  advanceToCompleted,
  app,
  authHeader,
  createAndAcceptRental,
  createItem,
  registerUser,
  type TestUser,
} from "./helpers";

async function completeRental(owner: TestUser, renter: TestUser) {
  const item = await createItem(owner);
  const rental = await createAndAcceptRental(owner, renter, item.id, { startDate: "2028-05-01", endDate: "2028-05-02" });
  await advanceToActive(owner, renter, rental.id);
  return advanceToCompleted(owner, renter, rental.id);
}

describe("reviews", () => {
  let owner: TestUser;
  let renter: TestUser;

  beforeAll(async () => {
    owner = await registerUser("reviews-owner");
    renter = await registerUser("reviews-renter");
  });

  it("rejects a review before the rental is completed", async () => {
    const item = await createItem(owner);
    const rentalRes = await request(app)
      .post("/api/rentals")
      .set(authHeader(renter.accessToken))
      .send({ itemId: item.id, startDate: "2028-06-01", endDate: "2028-06-02" });

    const res = await request(app)
      .post(`/api/rentals/${rentalRes.body.rental.id}/reviews`)
      .set(authHeader(renter.accessToken))
      .send({ rating: 5 });
    expect(res.status).toBe(409);
  });

  it("stays double-blind until both sides review, then reveals both and updates ratings", async () => {
    const rental = await completeRental(owner, renter);

    const renterReview = await request(app)
      .post(`/api/rentals/${rental.id}/reviews`)
      .set(authHeader(renter.accessToken))
      .send({ rating: 5, comment: "Great experience." });
    expect(renterReview.status).toBe(201);
    expect(renterReview.body.review.revealed).toBe(true);

    const ownerSeesPending = await request(app)
      .get(`/api/rentals/${rental.id}/reviews`)
      .set(authHeader(owner.accessToken));
    const renterSideForOwner = ownerSeesPending.body.reviews.find((r: { reviewerId: string }) => r.reviewerId === renter.user.id);
    expect(renterSideForOwner.revealed).toBe(false);
    expect(renterSideForOwner.rating).toBeUndefined();

    const profileBefore = await request(app).get(`/api/users/${owner.user.id}`);
    expect(profileBefore.body.user.ratingCount).toBe(0);

    const dup = await request(app)
      .post(`/api/rentals/${rental.id}/reviews`)
      .set(authHeader(renter.accessToken))
      .send({ rating: 3 });
    expect(dup.status).toBe(409);

    const ownerReview = await request(app)
      .post(`/api/rentals/${rental.id}/reviews`)
      .set(authHeader(owner.accessToken))
      .send({ rating: 4, comment: "Took good care of it." });
    expect(ownerReview.status).toBe(201);

    const finalView = await request(app)
      .get(`/api/rentals/${rental.id}/reviews`)
      .set(authHeader(renter.accessToken));
    expect(finalView.body.reviews.every((r: { revealed: boolean }) => r.revealed)).toBe(true);

    const profileAfter = await request(app).get(`/api/users/${owner.user.id}`);
    expect(profileAfter.body.user.ratingCount).toBe(1);
    expect(profileAfter.body.user.ratingAvg).toBe(5);
  });
});

describe("messaging", () => {
  let userA: TestUser;
  let userB: TestUser;
  let stranger: TestUser;

  beforeAll(async () => {
    userA = await registerUser("msg-a");
    userB = await registerUser("msg-b");
    stranger = await registerUser("msg-stranger");
  });

  it("dedupes conversations by participant pair + item", async () => {
    const item = await createItem(userA);
    const first = await request(app)
      .post("/api/conversations")
      .set(authHeader(userB.accessToken))
      .send({ recipientId: userA.user.id, itemId: item.id });
    const second = await request(app)
      .post("/api/conversations")
      .set(authHeader(userB.accessToken))
      .send({ recipientId: userA.user.id, itemId: item.id });
    expect(first.body.conversation.id).toBe(second.body.conversation.id);
  });

  it("flags likely contact info but still sends the message, and blocks non-participants", async () => {
    const item = await createItem(userA);
    const conv = await request(app)
      .post("/api/conversations")
      .set(authHeader(userB.accessToken))
      .send({ recipientId: userA.user.id, itemId: item.id });
    const conversationId = conv.body.conversation.id;

    const plain = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set(authHeader(userB.accessToken))
      .send({ content: "Is this still available?" });
    expect(plain.body.message.flagged).toBe(false);

    const withPhone = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set(authHeader(userB.accessToken))
      .send({ content: "Call me at 0532 123 45 67" });
    expect(withPhone.status).toBe(201);
    expect(withPhone.body.message.flagged).toBe(true);

    const blocked = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set(authHeader(stranger.accessToken))
      .send({ content: "sneaking in" });
    expect(blocked.status).toBe(404);
  });

  it("marks messages read when the recipient fetches them and updates the unread counter", async () => {
    const item = await createItem(userA);
    const conv = await request(app)
      .post("/api/conversations")
      .set(authHeader(userB.accessToken))
      .send({ recipientId: userA.user.id, itemId: item.id });
    await request(app)
      .post(`/api/conversations/${conv.body.conversation.id}/messages`)
      .set(authHeader(userB.accessToken))
      .send({ content: "Ping" });

    const beforeRead = await request(app).get("/api/conversations").set(authHeader(userA.accessToken));
    expect(beforeRead.body.unreadCount).toBeGreaterThan(0);

    await request(app)
      .get(`/api/conversations/${conv.body.conversation.id}/messages`)
      .set(authHeader(userA.accessToken));

    // Other tests in this file may leave unrelated unread messages for userA in
    // other conversations, so assert the drop caused by THIS read, not an absolute zero.
    const afterRead = await request(app).get("/api/conversations").set(authHeader(userA.accessToken));
    expect(afterRead.body.unreadCount).toBe(beforeRead.body.unreadCount - 1);
  });

  it("rejects starting a conversation with yourself", async () => {
    const res = await request(app)
      .post("/api/conversations")
      .set(authHeader(userA.accessToken))
      .send({ recipientId: userA.user.id });
    expect(res.status).toBe(400);
  });
});
