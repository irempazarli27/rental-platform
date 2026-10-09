import request from "supertest";
import { describe, expect, it } from "vitest";
import { recentMonths } from "../src/modules/rentals/ownerInsights.service";
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

const earnings = (user: TestUser) => request(app).get("/api/users/me/earnings").set(authHeader(user.accessToken));

describe("recentMonths", () => {
  it("lists months oldest-first and crosses a year boundary", () => {
    expect(recentMonths(new Date("2026-02-10T12:00:00Z"), 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("uses Turkey's calendar, not UTC's", () => {
    // 22:30 UTC on Jan 31 is already 01:30 on Feb 1 in Istanbul.
    expect(recentMonths(new Date("2026-01-31T22:30:00Z"), 1)).toEqual(["2026-02"]);
  });
});

describe("owner earnings", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/api/users/me/earnings")).status).toBe(401);
  });

  it("is all zeros for someone with no rentals, with six months listed", async () => {
    const user = await registerUser("earn-empty");
    const res = await earnings(user);
    expect(res.status).toBe(200);
    expect(res.body.earnings.totals).toEqual({ earned: 0, completedCount: 0, upcoming: 0, inProgressCount: 0, pendingCount: 0 });
    expect(res.body.earnings.months).toHaveLength(6);
    expect(res.body.earnings.items).toEqual([]);
  });

  it("separates earned, in-progress and pending, and attributes them per listing", async () => {
    const owner = await registerUser("earn-owner");
    const renter = await registerUser("earn-renter");
    const camera = await createItem(owner, { title: "Earn Camera", dailyPrice: 100 });
    const tent = await createItem(owner, { title: "Earn Tent", dailyPrice: 40 });

    // 3 days x 100 = 300, walked all the way to COMPLETED.
    const done = await createAndAcceptRental(owner, renter, camera.id, { startDate: "2031-03-01", endDate: "2031-03-03" });
    await advanceToActive(owner, renter, done.id);
    await advanceToCompleted(owner, renter, done.id);
    // 2 days x 40 = 80, accepted only.
    await createAndAcceptRental(owner, renter, tent.id, { startDate: "2031-04-10", endDate: "2031-04-11" });
    // Requested but unanswered.
    await request(app).post("/api/rentals").set(authHeader(renter.accessToken)).send({ itemId: tent.id, startDate: "2031-05-01", endDate: "2031-05-02" });

    const { body } = await earnings(owner);
    expect(body.earnings.totals).toEqual({ earned: 300, completedCount: 1, upcoming: 80, inProgressCount: 1, pendingCount: 1 });

    // It completed just now, so it lands in the last (current) month.
    const months = body.earnings.months as { month: string; earned: number }[];
    expect(months.at(-1)!.earned).toBe(300);
    expect(months.slice(0, -1).every((m) => m.earned === 0)).toBe(true);

    expect(body.earnings.items).toEqual([
      { id: camera.id, title: "Earn Camera", status: "active", completedCount: 1, earned: 300, rentedDays: 3 },
      { id: tent.id, title: "Earn Tent", status: "active", completedCount: 0, earned: 0, rentedDays: 0 },
    ]);

    // The renter earned nothing from renting.
    expect((await earnings(renter)).body.earnings.totals.earned).toBe(0);
  });
});
