import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app, authHeader, createItem, registerUser, type TestUser } from "./helpers";

describe("rentals", () => {
  let owner: TestUser;
  let renterA: TestUser;
  let renterB: TestUser;

  beforeAll(async () => {
    owner = await registerUser("rentals-owner");
    renterA = await registerUser("rentals-a");
    renterB = await registerUser("rentals-b");
  });

  it("rejects a request to rent your own item", async () => {
    const item = await createItem(owner);
    const res = await request(app)
      .post("/api/rentals")
      .set(authHeader(owner.accessToken))
      .send({ itemId: item.id, startDate: "2027-08-01", endDate: "2027-08-02" });
    expect(res.status).toBe(400);
  });

  it("applies the weekly rate for 7+ day bookings and computes the platform fee", async () => {
    const item = await createItem(owner, { dailyPrice: 100, weeklyPrice: 600, depositAmount: 200 });
    const res = await request(app)
      .post("/api/rentals")
      .set(authHeader(renterA.accessToken))
      .send({ itemId: item.id, startDate: "2027-08-01", endDate: "2027-08-10" }); // 10 days

    expect(res.status).toBe(201);
    // 1 week @600 + 3 days @100 = 900
    expect(res.body.rental.rentalPrice).toBe("900.00");
    expect(res.body.rental.platformFee).toBe("90.00");
    expect(res.body.rental.totalAmount).toBe("1190.00");
    expect(res.body.rental.status).toBe("PENDING");
  });

  it("lets two renters request overlapping dates, but only one accept can succeed", async () => {
    const item = await createItem(owner, { dailyPrice: 80 });

    const reqA = await request(app)
      .post("/api/rentals")
      .set(authHeader(renterA.accessToken))
      .send({ itemId: item.id, startDate: "2027-09-01", endDate: "2027-09-05" });
    const reqB = await request(app)
      .post("/api/rentals")
      .set(authHeader(renterB.accessToken))
      .send({ itemId: item.id, startDate: "2027-09-03", endDate: "2027-09-06" });
    expect(reqA.status).toBe(201);
    expect(reqB.status).toBe(201);

    const acceptA = await request(app)
      .patch(`/api/rentals/${reqA.body.rental.id}/accept`)
      .set(authHeader(owner.accessToken));
    expect(acceptA.status).toBe(200);

    const acceptB = await request(app)
      .patch(`/api/rentals/${reqB.body.rental.id}/accept`)
      .set(authHeader(owner.accessToken));
    expect(acceptB.status).toBe(409);

    const blocks = await request(app).get(`/api/items/${item.id}/availability`);
    expect(blocks.body.blocks).toHaveLength(1);
  });

  it("only lets the owner accept/reject, and only the participants view the detail", async () => {
    const item = await createItem(owner);
    const reqRes = await request(app)
      .post("/api/rentals")
      .set(authHeader(renterA.accessToken))
      .send({ itemId: item.id, startDate: "2027-10-01", endDate: "2027-10-02" });
    const rentalId = reqRes.body.rental.id;

    const wrongAccept = await request(app)
      .patch(`/api/rentals/${rentalId}/accept`)
      .set(authHeader(renterA.accessToken));
    expect(wrongAccept.status).toBe(404);

    const strangerView = await request(app).get(`/api/rentals/${rentalId}`).set(authHeader(renterB.accessToken));
    expect(strangerView.status).toBe(404);

    const ownerView = await request(app).get(`/api/rentals/${rentalId}`).set(authHeader(owner.accessToken));
    expect(ownerView.status).toBe(200);
  });

  it("releases the availability block when an accepted rental is cancelled", async () => {
    const item = await createItem(owner);
    const reqRes = await request(app)
      .post("/api/rentals")
      .set(authHeader(renterA.accessToken))
      .send({ itemId: item.id, startDate: "2027-11-01", endDate: "2027-11-03" });
    const rentalId = reqRes.body.rental.id;

    await request(app).patch(`/api/rentals/${rentalId}/accept`).set(authHeader(owner.accessToken));
    const cancel = await request(app).patch(`/api/rentals/${rentalId}/cancel`).set(authHeader(renterA.accessToken));
    expect(cancel.status).toBe(200);
    expect(cancel.body.rental.status).toBe("CANCELLED");

    const blocks = await request(app).get(`/api/items/${item.id}/availability`);
    expect(blocks.body.blocks).toHaveLength(0);

    const doubleCancel = await request(app)
      .patch(`/api/rentals/${rentalId}/cancel`)
      .set(authHeader(renterA.accessToken));
    expect(doubleCancel.status).toBe(409);
  });

  it("rejects requests for items that are not active", async () => {
    const draft = await createItem(owner, { status: "draft" });
    const res = await request(app)
      .post("/api/rentals")
      .set(authHeader(renterA.accessToken))
      .send({ itemId: draft.id, startDate: "2027-12-01", endDate: "2027-12-02" });
    expect(res.status).toBe(400);
  });
});
