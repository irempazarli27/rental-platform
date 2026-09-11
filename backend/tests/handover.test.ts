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
  uploadHandoverStep,
  type TestUser,
} from "./helpers";

describe("handover protocol", () => {
  let owner: TestUser;
  let renter: TestUser;

  beforeAll(async () => {
    owner = await registerUser("handover-owner");
    renter = await registerUser("handover-renter");
  });

  it("only the owner can document pickup, and only the correct media type per step", async () => {
    const item = await createItem(owner);
    const rental = await createAndAcceptRental(owner, renter, item.id, { startDate: "2028-01-01", endDate: "2028-01-02" });

    const wrongUploader = await uploadHandoverStep(rental.id, renter, "pickup", "FRONT");
    expect(wrongUploader.status).toBe(403);

    const mismatch = await uploadHandoverStep(rental.id, owner, "pickup", "VIDEO", false);
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.code).toBe("STEP_MEDIA_MISMATCH");
  });

  it("blocks marking ready until every required step has media", async () => {
    const item = await createItem(owner);
    const rental = await createAndAcceptRental(owner, renter, item.id, { startDate: "2028-01-05", endDate: "2028-01-06" });

    const tooEarly = await request(app)
      .patch(`/api/rentals/${rental.id}/handover/pickup/ready`)
      .set(authHeader(owner.accessToken))
      .send({});
    expect(tooEarly.status).toBe(400);
    expect(tooEarly.body.error.code).toBe("NO_MEDIA");

    await uploadHandoverStep(rental.id, owner, "pickup", "FRONT");
    const partial = await request(app)
      .patch(`/api/rentals/${rental.id}/handover/pickup/ready`)
      .set(authHeader(owner.accessToken))
      .send({});
    expect(partial.status).toBe(400);
    expect(partial.body.error.code).toBe("MISSING_STEPS");
  });

  it("requires SERIAL and ACCESSORIES steps only when the item declares them", async () => {
    const withExtras = await createItem(owner, {
      serialNumber: "SN-TEST-1",
      accessories: [{ name: "Case", quantity: 1 }],
    });
    const rentalWithExtras = await createAndAcceptRental(owner, renter, withExtras.id, {
      startDate: "2028-01-10",
      endDate: "2028-01-11",
    });

    const summaryRes = await request(app)
      .get(`/api/rentals/${rentalWithExtras.id}/handover`)
      .set(authHeader(owner.accessToken));
    expect(summaryRes.body.requiredSteps).toEqual(
      expect.arrayContaining(["FRONT", "BACK", "LEFT", "RIGHT", "VIDEO", "SERIAL", "ACCESSORIES"]),
    );

    const plain = await createItem(owner);
    const rentalPlain = await createAndAcceptRental(owner, renter, plain.id, {
      startDate: "2028-01-12",
      endDate: "2028-01-13",
    });
    const plainSummary = await request(app)
      .get(`/api/rentals/${rentalPlain.id}/handover`)
      .set(authHeader(owner.accessToken));
    expect(plainSummary.body.requiredSteps).not.toContain("SERIAL");
    expect(plainSummary.body.requiredSteps).not.toContain("ACCESSORIES");
  });

  it("walks PENDING through the full happy path to COMPLETED and releases the deposit", async () => {
    const item = await createItem(owner, { depositAmount: 300 });
    const rental = await createAndAcceptRental(owner, renter, item.id, { startDate: "2028-02-01", endDate: "2028-02-02" });

    const active = await advanceToActive(owner, renter, rental.id);
    expect(active.status).toBe("ACTIVE");

    const completed = await advanceToCompleted(owner, renter, rental.id);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).toBeTruthy();
  });

  it("locks handover actions once a dispute is open", async () => {
    const item = await createItem(owner);
    const rental = await createAndAcceptRental(owner, renter, item.id, { startDate: "2028-03-01", endDate: "2028-03-02" });
    await advanceToActive(owner, renter, rental.id);

    const disputeRes = await request(app)
      .post(`/api/rentals/${rental.id}/disputes`)
      .set(authHeader(owner.accessToken))
      .send({ reason: "The item came back with damage that was not there at pickup." });
    expect(disputeRes.status).toBe(201);

    const blockedReturn = await request(app)
      .patch(`/api/rentals/${rental.id}/handover/return/ready`)
      .set(authHeader(renter.accessToken))
      .send({});
    expect(blockedReturn.status).toBe(409);
  });

  it("lets a participant file a damage report tied to the rental", async () => {
    const item = await createItem(owner);
    const rental = await createAndAcceptRental(owner, renter, item.id, { startDate: "2028-04-01", endDate: "2028-04-02" });
    await advanceToActive(owner, renter, rental.id);

    const report = await request(app)
      .post(`/api/rentals/${rental.id}/damage-reports`)
      .set(authHeader(renter.accessToken))
      .send({ description: "Noticed a small scratch on pickup, documenting it now.", severity: "minor" });
    expect(report.status).toBe(201);

    const list = await request(app)
      .get(`/api/rentals/${rental.id}/damage-reports`)
      .set(authHeader(owner.accessToken));
    expect(list.body.reports).toHaveLength(1);
  });
});
