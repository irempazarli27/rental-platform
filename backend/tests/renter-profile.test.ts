import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  advanceToActive,
  advanceToCompleted,
  app,
  authHeader,
  createAndAcceptRental,
  createItem,
  registerUser,
} from "./helpers";

describe("renter summary on rentals", () => {
  it("tells the owner the renter's rating, track record and trust level", async () => {
    const owner = await registerUser("rp-owner");
    const renter = await registerUser("rp-renter");
    const item = await createItem(owner);

    // One finished rental, reviewed both ways, so the renter has a rating and a record.
    const done = await createAndAcceptRental(owner, renter, item.id, { startDate: "2037-01-05", endDate: "2037-01-05" });
    await advanceToActive(owner, renter, done.id);
    await advanceToCompleted(owner, renter, done.id);
    await request(app).post(`/api/rentals/${done.id}/reviews`).set(authHeader(owner.accessToken)).send({ rating: 4 });
    await request(app).post(`/api/rentals/${done.id}/reviews`).set(authHeader(renter.accessToken)).send({ rating: 5 });

    // A new request from the same renter is what the owner now has to decide on.
    const pending = await request(app)
      .post("/api/rentals")
      .set(authHeader(renter.accessToken))
      .send({ itemId: item.id, startDate: "2037-02-01", endDate: "2037-02-02" });

    const list = await request(app).get("/api/rentals").query({ role: "owner" }).set(authHeader(owner.accessToken));
    const request_ = list.body.rentals.find((r: { id: string }) => r.id === pending.body.rental.id);
    expect(request_.renterProfile).toMatchObject({
      ratingAvg: 4,
      ratingCount: 1,
      completedRentals: 1,
      verificationLevel: "none",
      trust: { level: expect.any(String), score: expect.any(Number) },
    });
    // Both rentals in the list belong to one renter, and agree.
    const other = list.body.rentals.find((r: { id: string }) => r.id === done.id);
    expect(other.renterProfile).toEqual(request_.renterProfile);

    const detail = await request(app).get(`/api/rentals/${pending.body.rental.id}`).set(authHeader(owner.accessToken));
    expect(detail.body.rental.renterProfile).toEqual(request_.renterProfile);
  });
});
