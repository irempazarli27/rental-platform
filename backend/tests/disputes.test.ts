import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import {
  advanceToActive,
  app,
  authHeader,
  createAndAcceptRental,
  createItem,
  promoteToAdmin,
  registerUser,
  loginAs,
  type TestUser,
} from "./helpers";

describe("disputes", () => {
  let owner: TestUser;
  let renter: TestUser;
  let stranger: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    owner = await registerUser("disputes-owner");
    renter = await registerUser("disputes-renter");
    stranger = await registerUser("disputes-stranger");
    const adminCandidate = await registerUser("disputes-admin");
    await promoteToAdmin(adminCandidate.user.id);
    admin = await loginAs(adminCandidate.user.email); // fresh login so the JWT carries the admin role claim
  });

  it("can only be opened while ACTIVE or RETURN_PENDING, and only once per rental", async () => {
    const item = await createItem(owner);
    const rental = await createAndAcceptRental(owner, renter, item.id, { startDate: "2028-07-01", endDate: "2028-07-02" });

    const tooEarly = await request(app)
      .post(`/api/rentals/${rental.id}/disputes`)
      .set(authHeader(owner.accessToken))
      .send({ reason: "Trying to dispute before pickup is even confirmed." });
    expect(tooEarly.status).toBe(409);

    await advanceToActive(owner, renter, rental.id);

    const opened = await request(app)
      .post(`/api/rentals/${rental.id}/disputes`)
      .set(authHeader(owner.accessToken))
      .send({ reason: "The renter reported damage immediately after pickup, which is suspicious." });
    expect(opened.status).toBe(201);

    const second = await request(app)
      .post(`/api/rentals/${rental.id}/disputes`)
      .set(authHeader(renter.accessToken))
      .send({ reason: "I want to dispute this too." });
    expect(second.status).toBe(409);

    const rentalAfter = await request(app).get(`/api/rentals/${rental.id}`).set(authHeader(owner.accessToken));
    expect(rentalAfter.body.rental.status).toBe("DISPUTED");
  });

  it("keeps evidence and dispute detail visible only to participants", async () => {
    const item = await createItem(owner);
    const rental = await createAndAcceptRental(owner, renter, item.id, { startDate: "2028-07-10", endDate: "2028-07-11" });
    await advanceToActive(owner, renter, rental.id);

    const disputeRes = await request(app)
      .post(`/api/rentals/${rental.id}/disputes`)
      .set(authHeader(renter.accessToken))
      .send({ reason: "The owner is claiming pre-existing damage was caused by me." });
    const disputeId = disputeRes.body.dispute.id;

    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const evidenceRes = await request(app)
      .post(`/api/disputes/${disputeId}/evidence`)
      .set(authHeader(owner.accessToken))
      .field("description", "Photo from pickup showing no damage")
      .attach("media", png, { filename: "evidence.png", contentType: "image/png" });
    expect(evidenceRes.status).toBe(201);

    const strangerView = await request(app).get(`/api/disputes/${disputeId}`).set(authHeader(stranger.accessToken));
    expect(strangerView.status).toBe(404);

    const participantView = await request(app).get(`/api/disputes/${disputeId}`).set(authHeader(renter.accessToken));
    expect(participantView.status).toBe(200);
    expect(participantView.body.dispute.evidence).toHaveLength(1);
  });

  it("only an admin can resolve a dispute, and resolving in the owner's favor claims the deposit", async () => {
    const item = await createItem(owner, { depositAmount: 500 });
    const rental = await createAndAcceptRental(owner, renter, item.id, { startDate: "2028-07-20", endDate: "2028-07-21" });
    await advanceToActive(owner, renter, rental.id);

    const disputeRes = await request(app)
      .post(`/api/rentals/${rental.id}/disputes`)
      .set(authHeader(owner.accessToken))
      .send({ reason: "Screen was cracked on return, renter denies it." });
    const disputeId = disputeRes.body.dispute.id;

    const nonAdminResolve = await request(app)
      .patch(`/api/admin/disputes/${disputeId}/resolve`)
      .set(authHeader(owner.accessToken))
      .send({ status: "resolved_favor_owner", resolutionNotes: "Should be forbidden." });
    expect(nonAdminResolve.status).toBe(403);

    const resolve = await request(app)
      .patch(`/api/admin/disputes/${disputeId}/resolve`)
      .set(authHeader(admin.accessToken))
      .send({ status: "resolved_favor_owner", resolutionNotes: "Pickup photos show no crack, return photos do." });
    expect(resolve.status).toBe(200);
    expect(resolve.body.dispute.status).toBe("resolved_favor_owner");

    const rentalAfter = await request(app).get(`/api/rentals/${rental.id}`).set(authHeader(admin.accessToken));
    expect(rentalAfter.body.rental.status).toBe("COMPLETED");

    const doubleResolve = await request(app)
      .patch(`/api/admin/disputes/${disputeId}/resolve`)
      .set(authHeader(admin.accessToken))
      .send({ status: "resolved_favor_renter", resolutionNotes: "Should not be allowed twice." });
    expect(doubleResolve.status).toBe(409);
  });

  it("lets an admin view a non-participant rental read-only via the same endpoints", async () => {
    const item = await createItem(owner);
    const rental = await createAndAcceptRental(owner, renter, item.id, { startDate: "2028-07-25", endDate: "2028-07-26" });

    const rentalView = await request(app).get(`/api/rentals/${rental.id}`).set(authHeader(admin.accessToken));
    expect(rentalView.status).toBe(200);

    const handoverView = await request(app)
      .get(`/api/rentals/${rental.id}/handover`)
      .set(authHeader(admin.accessToken));
    expect(handoverView.status).toBe(200);

    const damageView = await request(app)
      .get(`/api/rentals/${rental.id}/damage-reports`)
      .set(authHeader(admin.accessToken));
    expect(damageView.status).toBe(200);
  });
});
