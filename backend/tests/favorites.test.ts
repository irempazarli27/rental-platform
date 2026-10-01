import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, authHeader, createItem, registerUser, type TestUser } from "./helpers";

const fav = (user: TestUser, method: "put" | "delete", itemId: string) =>
  request(app)[method](`/api/favorites/${itemId}`).set(authHeader(user.accessToken));
const list = (user: TestUser) => request(app).get("/api/favorites").set(authHeader(user.accessToken));

describe("favorites", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/api/favorites")).status).toBe(401);
  });

  it("adds, lists newest-first, and removes", async () => {
    const owner = await registerUser("fav-owner");
    const user = await registerUser("fav-user");
    const first = await createItem(owner, { status: "active" });
    const second = await createItem(owner, { status: "active" });

    expect((await fav(user, "put", first.id)).status).toBe(204);
    expect((await fav(user, "put", second.id)).status).toBe(204);
    // Favouriting again is a no-op rather than an error or a duplicate.
    expect((await fav(user, "put", first.id)).status).toBe(204);

    const listed = await list(user);
    expect(listed.status).toBe(200);
    expect(listed.body.items.map((i: { id: string }) => i.id)).toEqual([second.id, first.id]);
    expect(listed.body.items[0]).toMatchObject({ id: second.id, title: second.title, coverImageUrl: null });

    expect((await fav(user, "delete", second.id)).status).toBe(204);
    expect((await list(user)).body.items.map((i: { id: string }) => i.id)).toEqual([first.id]);
  });

  it("keeps each user's favourites separate", async () => {
    const owner = await registerUser("fav-owner2");
    const a = await registerUser("fav-a");
    const b = await registerUser("fav-b");
    const item = await createItem(owner, { status: "active" });
    await fav(a, "put", item.id);
    expect((await list(b)).body.items).toEqual([]);
  });

  it("rejects items that are not listed and hides ones that stop being listed", async () => {
    const owner = await registerUser("fav-owner3");
    const user = await registerUser("fav-user3");
    const draft = await createItem(owner, { status: "draft" });
    expect((await fav(user, "put", draft.id)).status).toBe(404);
    expect((await fav(user, "put", "33333333-3333-4333-8333-333333333333")).status).toBe(404);
    expect((await fav(user, "put", "not-a-uuid")).status).toBe(400);

    const item = await createItem(owner, { status: "active" });
    await fav(user, "put", item.id);
    await request(app).patch(`/api/items/${item.id}`).set(authHeader(owner.accessToken)).send({ status: "paused" });
    expect((await list(user)).body.items).toEqual([]);
  });
});
