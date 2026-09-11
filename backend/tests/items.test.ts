import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app, authHeader, createItem, getCategoryBySlug, registerUser, type TestUser } from "./helpers";

describe("items", () => {
  let owner: TestUser;
  let other: TestUser;
  let cameraCategory: { id: string; defaultRiskLevel: string };
  let campCategory: { id: string };

  beforeAll(async () => {
    owner = await registerUser("items-owner");
    other = await registerUser("items-other");
    cameraCategory = await getCategoryBySlug("kamera-ve-fotograf");
    campCategory = await getCategoryBySlug("kamp-ekipmanlari");
  });

  it("clamps the risk level to the category default and never lets it be lowered", async () => {
    const highRisk = await createItem(owner, { categoryId: cameraCategory.id });
    expect(highRisk.riskLevel).toBe("high");

    const attempt = await request(app)
      .post("/api/items")
      .set(authHeader(owner.accessToken))
      .send({
        title: "Attempted low-risk camera",
        description: "Trying to under-declare risk on a high-risk category.",
        categoryId: cameraCategory.id,
        riskLevel: "low",
        dailyPrice: 50,
      });
    expect(attempt.status).toBe(201);
    expect(attempt.body.item.riskLevel).toBe("high");
  });

  it("lets the owner edit an item but forbids other users from editing it", async () => {
    const item = await createItem(owner, { categoryId: campCategory.id });

    const forbidden = await request(app)
      .patch(`/api/items/${item.id}`)
      .set(authHeader(other.accessToken))
      .send({ title: "Hijacked title" });
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .patch(`/api/items/${item.id}`)
      .set(authHeader(owner.accessToken))
      .send({ dailyPrice: 250 });
    expect(allowed.status).toBe(200);
    expect(allowed.body.item.dailyPrice).toBe("250.00");
  });

  it("finds items by full-text search and respects price range filters", async () => {
    const item = await createItem(owner, {
      title: "Unique Searchable Drone Title",
      categoryId: campCategory.id,
      dailyPrice: 120,
    });

    const found = await request(app).get("/api/items").query({ q: "Searchable Drone" });
    expect(found.body.items.some((i: { id: string }) => i.id === item.id)).toBe(true);

    const tooExpensive = await request(app).get("/api/items").query({ q: "Searchable Drone", maxPrice: 50 });
    expect(tooExpensive.body.items.some((i: { id: string }) => i.id === item.id)).toBe(false);
  });

  it("excludes items whose booked dates overlap the search window", async () => {
    const item = await createItem(owner, { title: "Date Filtered Item", categoryId: campCategory.id });

    await request(app)
      .post(`/api/items/${item.id}/availability-blocks`)
      .set(authHeader(owner.accessToken))
      .send({ startDate: "2027-06-10", endDate: "2027-06-20" });

    const overlapping = await request(app)
      .get("/api/items")
      .query({ q: "Date Filtered Item", startDate: "2027-06-15", endDate: "2027-06-16" });
    expect(overlapping.body.total).toBe(0);

    const nonOverlapping = await request(app)
      .get("/api/items")
      .query({ q: "Date Filtered Item", startDate: "2027-07-01", endDate: "2027-07-02" });
    expect(nonOverlapping.body.total).toBe(1);
  });

  it("hides draft items from everyone but the owner, and soft-deleted items from everyone", async () => {
    const draft = await createItem(owner, { title: "Draft Item", categoryId: campCategory.id, status: "draft" });

    const ownerView = await request(app).get(`/api/items/${draft.id}`).set(authHeader(owner.accessToken));
    expect(ownerView.status).toBe(200);

    const otherView = await request(app).get(`/api/items/${draft.id}`).set(authHeader(other.accessToken));
    expect(otherView.status).toBe(404);

    const anonymousView = await request(app).get(`/api/items/${draft.id}`);
    expect(anonymousView.status).toBe(404);

    const active = await createItem(owner, { title: "To Be Deleted", categoryId: campCategory.id });
    const del = await request(app).delete(`/api/items/${active.id}`).set(authHeader(owner.accessToken));
    expect(del.status).toBe(204);

    const afterDelete = await request(app).get(`/api/items/${active.id}`).set(authHeader(owner.accessToken));
    expect(afterDelete.status).toBe(404);
  });

  it("uploads an image and serves it back over the static route", async () => {
    const item = await createItem(owner, { categoryId: campCategory.id });
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

    const upload = await request(app)
      .post(`/api/items/${item.id}/images`)
      .set(authHeader(owner.accessToken))
      .attach("images", png, { filename: "cover.png", contentType: "image/png" });
    expect(upload.status).toBe(201);
    expect(upload.body.images[0].isCover).toBe(true);

    const served = await request(app).get(upload.body.images[0].url);
    expect(served.status).toBe(200);
    expect(served.headers["content-type"]).toContain("image/png");
  });
});
