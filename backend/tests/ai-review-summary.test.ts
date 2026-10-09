import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Stand-in for Gemini: no network, and every call is inspectable.
const { generateStructured } = vi.hoisted(() => ({ generateStructured: vi.fn() }));
vi.mock("../src/ai/provider", () => ({
  provider: { name: "fake", generateStructured, chat: vi.fn() },
}));

import { ai } from "../src/ai";
import { db } from "../src/db";
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

const SUMMARY = { summary: "Eşyalarını özenle teslim ediyor.", positives: ["Dakik"], negatives: [] };

/** A completed rental reviewed by both sides, so the owner's review becomes public. */
async function reviewedRental(owner: TestUser, renter: TestUser, itemId: string, startDate: string, comment: string) {
  const rental = await createAndAcceptRental(owner, renter, itemId, { startDate, endDate: startDate });
  await advanceToActive(owner, renter, rental.id);
  await advanceToCompleted(owner, renter, rental.id);
  await request(app).post(`/api/rentals/${rental.id}/reviews`).set(authHeader(renter.accessToken)).send({ rating: 5, comment });
  await request(app).post(`/api/rentals/${rental.id}/reviews`).set(authHeader(owner.accessToken)).send({ rating: 5 });
}

const profile = (userId: string) => request(app).get(`/api/users/${userId}`);

describe("review summary", () => {
  beforeEach(() => {
    ai._resetFailures();
    generateStructured.mockReset();
    generateStructured.mockResolvedValue({ value: SUMMARY, model: "fake-model" });
  });

  it("is absent below three reviews and never calls the model", async () => {
    const owner = await registerUser("sum-few");
    const res = await profile(owner.user.id);
    expect(res.status).toBe(200);
    expect(res.body.user.reviewSummary).toBeNull();
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("is prepared in the background, then served from storage without another call", async () => {
    const owner = await registerUser("sum-owner");
    const renter = await registerUser("sum-renter");
    const item = await createItem(owner);
    for (const [i, day] of ["2033-01-05", "2033-01-10", "2033-01-15"].entries()) {
      await reviewedRental(owner, renter, item.id, day, `Yorum ${i}: çok iyiydi`);
    }

    // First view: nothing stored yet, so no summary — but generation has started.
    expect((await profile(owner.user.id)).body.user.reviewSummary).toBeNull();
    await vi.waitFor(async () => expect((await profile(owner.user.id)).body.user.reviewSummary).toEqual(SUMMARY));
    expect(generateStructured).toHaveBeenCalledTimes(1);

    // The model saw the review text, but no names or ids of the people involved.
    const sent = JSON.stringify(generateStructured.mock.calls[0]![0].parts);
    expect(sent).toContain("Yorum 0: çok iyiydi");
    expect(sent).not.toContain(renter.user.fullName);
    expect(sent).not.toContain(renter.user.id);

    await profile(owner.user.id);
    expect(generateStructured).toHaveBeenCalledTimes(1);
  });

  it("keeps the profile working when the model returns something unusable", async () => {
    generateStructured.mockResolvedValue({ value: { summary: 42 }, model: "fake-model" });
    const owner = await registerUser("sum-bad");
    const renter = await registerUser("sum-bad-renter");
    const item = await createItem(owner);
    for (const day of ["2033-02-05", "2033-02-10", "2033-02-15"]) {
      await reviewedRental(owner, renter, item.id, day, "İyi");
    }
    const res = await profile(owner.user.id);
    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(generateStructured).toHaveBeenCalled());
    expect((await profile(owner.user.id)).body.user.reviewSummary).toBeNull();

    // After a failure, further views don't retry until the cooldown passes —
    // otherwise an outage or a full quota would cost a call per page view.
    for (let i = 0; i < 3; i++) await profile(owner.user.id);
    await new Promise((r) => setTimeout(r, 200));
    expect(generateStructured).toHaveBeenCalledTimes(1);
  });
});

describe("AI budget", () => {
  it("stops a user at the daily cap", async () => {
    const user = await registerUser("ai-cap");
    await db
      .insertInto("ai_requests")
      .values(Array.from({ length: 30 }, () => ({ user_id: user.user.id, kind: "test" })))
      .execute();
    await expect(
      ai.structured({
        kind: "test",
        userId: user.user.id,
        tier: "fast",
        system: "x",
        parts: [{ text: "x" }],
        schema: {},
        validator: (await import("zod")).z.unknown(),
      }),
    ).rejects.toMatchObject({ code: "AI_USER_CAP", statusCode: 429 });
    // Only this test's call is checked: a summary refresh started by an earlier
    // test may still be finishing in the background.
    expect(generateStructured.mock.calls.filter(([req]) => req.system === "x")).toEqual([]);
  });
});

describe("item reviews", () => {
  beforeEach(() => {
    ai._resetFailures();
    generateStructured.mockReset();
    generateStructured.mockResolvedValue({ value: SUMMARY, model: "fake-model" });
  });

  it("lists only what renters wrote about this item, with its own rating and summary", async () => {
    const owner = await registerUser("itemrev-owner");
    const renter = await registerUser("itemrev-renter");
    const camera = await createItem(owner, { title: "Kamera İnceleme" });
    const tent = await createItem(owner, { title: "Çadır İnceleme" });
    for (const [i, day] of ["2035-01-05", "2035-01-10", "2035-01-15"].entries()) {
      await reviewedRental(owner, renter, camera.id, day, `Kamera yorumu ${i}`);
    }
    await reviewedRental(owner, renter, tent.id, "2035-01-20", "Çadır yorumu");

    const res = await request(app).get(`/api/items/${camera.id}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.ratingCount).toBe(3);
    expect(res.body.ratingAvg).toBe(5);
    // Only renter-written reviews of this item: no tent review, and none of the owner's reviews of the renter.
    expect(res.body.reviews.map((r: { comment: string }) => r.comment).sort()).toEqual(["Kamera yorumu 0", "Kamera yorumu 1", "Kamera yorumu 2"]);
    expect(res.body.reviews[0].item).toEqual({ id: camera.id, title: "Kamera İnceleme" });

    await vi.waitFor(async () => expect((await request(app).get(`/api/items/${camera.id}/reviews`)).body.summary).toEqual(SUMMARY));
    const prompt = generateStructured.mock.calls.find(([req]) => req.kind === "item_review_summary" || JSON.stringify(req.parts).includes("Kamera yorumu"))![0];
    expect(prompt.system).toContain("one particular listed item");

    const tentRes = await request(app).get(`/api/items/${tent.id}/reviews`);
    expect(tentRes.body.ratingCount).toBe(1);
    expect(tentRes.body.summary).toBeNull();
  });

  it("is 404 for an item that does not exist", async () => {
    expect((await request(app).get("/api/items/44444444-4444-4444-8444-444444444444/reviews")).status).toBe(404);
  });
});
