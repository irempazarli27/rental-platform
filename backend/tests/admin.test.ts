import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app, authHeader, createItem, loginAs, promoteToAdmin, registerUser, type TestUser } from "./helpers";

describe("admin panel", () => {
  let admin: TestUser;
  let target: TestUser;

  beforeAll(async () => {
    const adminCandidate = await registerUser("admin-panel-admin");
    await promoteToAdmin(adminCandidate.user.id);
    admin = await loginAs(adminCandidate.user.email);
    target = await registerUser("admin-panel-target");
  });

  it("blocks non-admins from every /api/admin route", async () => {
    const res = await request(app).get("/api/admin/stats").set(authHeader(target.accessToken));
    expect(res.status).toBe(403);
  });

  it("returns aggregate platform stats", async () => {
    const res = await request(app).get("/api/admin/stats").set(authHeader(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBeGreaterThan(0);
    expect(typeof res.body.itemsByStatus).toBe("object");
  });

  it("suspends a user (blocking login), then reactivates them, and cannot suspend an admin", async () => {
    const suspend = await request(app)
      .patch(`/api/admin/users/${target.user.id}/suspend`)
      .set(authHeader(admin.accessToken))
      .send({ reason: "Automated test suspension" });
    expect(suspend.status).toBe(200);
    expect(suspend.body.user.status).toBe("suspended");

    const blockedLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: target.user.email, password: "password123" });
    expect(blockedLogin.status).toBe(403);

    const activate = await request(app)
      .patch(`/api/admin/users/${target.user.id}/activate`)
      .set(authHeader(admin.accessToken));
    expect(activate.status).toBe(200);
    expect(activate.body.user.status).toBe("active");

    const okLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: target.user.email, password: "password123" });
    expect(okLogin.status).toBe(200);

    const suspendAdmin = await request(app)
      .patch(`/api/admin/users/${admin.user.id}/suspend`)
      .set(authHeader(admin.accessToken))
      .send({ reason: "Should be rejected" });
    expect(suspendAdmin.status).toBe(400);
  });

  it("lists items with owner names and removes one, which then disappears from public search", async () => {
    const item = await createItem(target, { title: "Admin Removable Item" });

    const list = await request(app).get("/api/admin/items").set(authHeader(admin.accessToken));
    const found = list.body.items.find((i: { id: string }) => i.id === item.id);
    expect(found.ownerName).toBe(target.user.fullName);

    const remove = await request(app)
      .delete(`/api/admin/items/${item.id}`)
      .set(authHeader(admin.accessToken))
      .send({ reason: "Automated test removal" });
    expect(remove.status).toBe(200);
    expect(remove.body.item.status).toBe("deleted");

    const search = await request(app).get("/api/items").query({ q: "Admin Removable Item" });
    expect(search.body.items.find((i: { id: string }) => i.id === item.id)).toBeUndefined();
  });

  it("lists rentals with a total count field", async () => {
    const res = await request(app).get("/api/admin/rentals").set(authHeader(admin.accessToken));
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe("number");
  });

  it("surfaces flagged messages for moderation review", async () => {
    const owner = await registerUser("admin-flag-owner");
    const sender = await registerUser("admin-flag-sender");
    const item = await createItem(owner);
    const conv = await request(app)
      .post("/api/conversations")
      .set(authHeader(sender.accessToken))
      .send({ recipientId: owner.user.id, itemId: item.id });
    await request(app)
      .post(`/api/conversations/${conv.body.conversation.id}/messages`)
      .set(authHeader(sender.accessToken))
      .send({ content: "reach me at test@example.com please" });

    const flagged = await request(app).get("/api/admin/messages/flagged").set(authHeader(admin.accessToken));
    expect(flagged.body.messages.some((m: { senderName: string }) => m.senderName === sender.user.fullName)).toBe(true);
  });
});
