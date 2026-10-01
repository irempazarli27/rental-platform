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
const calendar = (user: TestUser, from: string, to: string) =>
  request(app).get("/api/users/me/calendar").query({ from, to }).set(authHeader(user.accessToken));

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

describe("owner calendar", () => {
  it("validates the range", async () => {
    const user = await registerUser("cal-validate");
    expect((await calendar(user, "2031-06-01", "nope")).status).toBe(400);
    expect((await calendar(user, "2031-06-30", "2031-06-01")).status).toBe(400);
    expect((await calendar(user, "2031-01-01", "2031-12-31")).status).toBe(400);
  });

  it("shows bookings, manual blocks and pending requests that touch the range", async () => {
    const owner = await registerUser("cal-owner");
    const renter = await registerUser("cal-renter");
    const item = await createItem(owner, { title: "Cal Item" });

    const booked = await createAndAcceptRental(owner, renter, item.id, { startDate: "2031-06-28", endDate: "2031-07-02" });
    await request(app)
      .post(`/api/items/${item.id}/availability-blocks`)
      .set(authHeader(owner.accessToken))
      .send({ startDate: "2031-07-10", endDate: "2031-07-12" });
    const pending = await request(app)
      .post("/api/rentals")
      .set(authHeader(renter.accessToken))
      .send({ itemId: item.id, startDate: "2031-07-20", endDate: "2031-07-21" });
    // Outside July entirely.
    await createAndAcceptRental(owner, renter, item.id, { startDate: "2031-09-01", endDate: "2031-09-02" });

    const res = await calendar(owner, "2031-07-01", "2031-07-31");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([{ id: item.id, title: "Cal Item" }]);
    const byKind = Object.fromEntries(res.body.entries.map((e: { kind: string }) => [e.kind, e]));
    expect(res.body.entries).toHaveLength(3);
    // A booking that started in June still shows in July.
    expect(byKind.rental).toMatchObject({ itemId: item.id, startDate: "2031-06-28", endDate: "2031-07-02", rentalId: booked.id, renterName: renter.user.fullName });
    expect(byKind.manual).toMatchObject({ startDate: "2031-07-10", endDate: "2031-07-12", rentalId: null, renterName: null });
    expect(byKind.pending).toMatchObject({ startDate: "2031-07-20", rentalId: pending.body.rental.id });

    // Another user's calendar never includes these.
    const other = await calendar(renter, "2031-07-01", "2031-07-31");
    expect(other.body).toEqual({ items: [], entries: [] });
  });
});
