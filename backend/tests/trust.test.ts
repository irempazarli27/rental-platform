import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { env } from "../src/config/env";
import { computeTrust, levelForScore, type TrustInputs } from "../src/modules/trust/trust.score";
import { app, authHeader, createItem, getCategoryBySlug, registerUser } from "./helpers";

const base: TrustInputs = {
  completedRentals: 0,
  ratingAvg: 0,
  ratingCount: 0,
  verificationLevel: "none",
  accountAgeDays: 0,
  lostDisputes: 0,
  suspended: false,
};

describe("computeTrust (pure scoring)", () => {
  it("scores a brand-new account 0", () => {
    expect(computeTrust(base)).toMatchObject({ score: 0, level: "new" });
  });

  it("reaches 'trusted' after a few clean, well-reviewed rentals", () => {
    const r = computeTrust({ ...base, completedRentals: 3, ratingAvg: 5, ratingCount: 3, accountAgeDays: 10 });
    expect(r.score).toBeGreaterThanOrEqual(40);
    expect(r.level).toBe("trusted");
  });

  it("caps each component and the total at 100", () => {
    const r = computeTrust({
      completedRentals: 50,
      ratingAvg: 5,
      ratingCount: 50,
      verificationLevel: "id_verified",
      accountAgeDays: 1000,
      lostDisputes: 0,
      suspended: false,
    });
    expect(r.breakdown).toEqual({ rentals: 40, ratings: 30, verification: 15, accountAge: 15, penalty: 0 });
    expect(r.score).toBe(100);
    expect(r.level).toBe("highly_trusted");
  });

  it("does not let one lucky 5-star review max out the rating component", () => {
    const one = computeTrust({ ...base, ratingAvg: 5, ratingCount: 1 });
    const many = computeTrust({ ...base, ratingAvg: 5, ratingCount: 5 });
    expect(one.breakdown.ratings).toBeLessThan(many.breakdown.ratings);
  });

  it("subtracts a penalty per lost dispute and never goes below 0", () => {
    const r = computeTrust({ ...base, completedRentals: 5, lostDisputes: 1 });
    expect(r.breakdown.penalty).toBe(20);
    expect(r.score).toBe(20);
    expect(computeTrust({ ...base, lostDisputes: 3 }).score).toBe(0);
  });

  it("always scores a suspended account 0", () => {
    expect(computeTrust({ ...base, completedRentals: 5, ratingAvg: 5, ratingCount: 5, suspended: true }).score).toBe(0);
  });

  it("maps scores to levels at 40 and 70", () => {
    expect([levelForScore(39), levelForScore(40), levelForScore(69), levelForScore(70)]).toEqual([
      "new",
      "trusted",
      "trusted",
      "highly_trusted",
    ]);
  });
});

describe("high-risk rental gate", () => {
  const originalThreshold = env.highRiskMinTrust;
  beforeEach(() => {
    env.highRiskMinTrust = 40;
  });
  afterEach(() => {
    env.highRiskMinTrust = originalThreshold;
  });

  async function highRiskItem(owner: Awaited<ReturnType<typeof registerUser>>) {
    const camera = await getCategoryBySlug("kamera-ve-fotograf");
    const item = await createItem(owner, { categoryId: camera.id });
    expect(item.riskLevel).toBe("high");
    return item;
  }

  const dates = { startDate: "2031-03-01", endDate: "2031-03-03" };

  it("blocks a brand-new renter from requesting a high-risk item", async () => {
    const owner = await registerUser("trust-owner-a");
    const renter = await registerUser("trust-renter-a");
    const item = await highRiskItem(owner);

    const res = await request(app)
      .post("/api/rentals")
      .set(authHeader(renter.accessToken))
      .send({ itemId: item.id, ...dates });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("TRUST_TOO_LOW");
  });

  it("still lets a brand-new renter request a low-risk item", async () => {
    const owner = await registerUser("trust-owner-b");
    const renter = await registerUser("trust-renter-b");
    const camp = await getCategoryBySlug("kamp-ekipmanlari");
    const item = await createItem(owner, { categoryId: camp.id });
    expect(item.riskLevel).toBe("low");

    const res = await request(app)
      .post("/api/rentals")
      .set(authHeader(renter.accessToken))
      .send({ itemId: item.id, ...dates });

    expect(res.status).toBe(201);
  });

  it("allows a renter whose score meets the threshold", async () => {
    env.highRiskMinTrust = 15;
    const owner = await registerUser("trust-owner-c");
    const renter = await registerUser("trust-renter-c");
    const item = await highRiskItem(owner);

    // id_verified is worth 15 points on its own, exactly the lowered threshold.
    const { db } = await import("../src/db");
    await db.updateTable("users").set({ verification_level: "id_verified" }).where("id", "=", renter.user.id).execute();

    const res = await request(app)
      .post("/api/rentals")
      .set(authHeader(renter.accessToken))
      .send({ itemId: item.id, ...dates });

    expect(res.status).toBe(201);
  });

  it("exposes the caller's trust on /me and anyone's on the public profile", async () => {
    const user = await registerUser("trust-profile");

    const me = await request(app).get("/api/users/me").set(authHeader(user.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.user.trust).toMatchObject({ score: 0, level: "new", canRentHighRisk: false, highRiskMinScore: 40 });
    expect(me.body.user.trust.breakdown).toBeDefined();

    const pub = await request(app).get(`/api/users/${user.user.id}`);
    expect(pub.status).toBe(200);
    expect(pub.body.user.trust.level).toBe("new");
    expect(pub.body.user.trust.breakdown).toBeUndefined();
  });
});
