import request from "supertest";
import { describe, expect, it } from "vitest";
import { db } from "../src/db";
import {
  app,
  authHeader,
  createAndAcceptRental,
  createItem,
  loginAs,
  promoteToAdmin,
  registerUser,
  type TestUser,
} from "./helpers";

const del = (user: TestUser, body: object) =>
  request(app).delete("/api/users/me").set(authHeader(user.accessToken)).send(body);

describe("account deletion", () => {
  it("requires the password and leaves the account alone when it's wrong", async () => {
    const user = await registerUser("del-wrongpw");
    const res = await del(user, { password: "not-it" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_PASSWORD");
    expect((await request(app).get("/api/users/me").set(authHeader(user.accessToken))).status).toBe(200);
  });

  it("erases personal data, hides listings and ends every session", async () => {
    const user = await registerUser("del-ok");
    const email = user.user.email;
    const item = await createItem(user, { status: "active" });
    const owner = await registerUser("del-ok-owner");
    const theirs = await createItem(owner, { status: "active" });
    await request(app).put(`/api/favorites/${theirs.id}`).set(authHeader(user.accessToken));

    expect((await del(user, { password: "password123" })).status).toBe(204);

    const row = await db.selectFrom("users").selectAll().where("id", "=", user.user.id).executeTakeFirstOrThrow();
    expect(row).toMatchObject({ status: "deleted", full_name: "Silinmiş kullanıcı", password_hash: null, phone: null, bio: null });
    expect(row.email).not.toBe(email);
    expect(row.deleted_at).not.toBeNull();

    expect((await request(app).get(`/api/items/${item.id}`)).status).toBe(404);
    expect((await request(app).get(`/api/users/${user.user.id}`)).status).toBe(404);
    expect(await db.selectFrom("favorites").select("item_id").where("user_id", "=", user.user.id).execute()).toEqual([]);

    // Can't sign in, can't refresh, and the address is free to register again.
    expect((await request(app).post("/api/auth/login").send({ email, password: "password123" })).status).toBe(401);
    expect((await request(app).post("/api/auth/refresh").send({ refreshToken: user.refreshToken })).status).toBe(401);
    const again = await request(app).post("/api/auth/register").send({ email, password: "password123", fullName: "Back Again" });
    expect(again.status).toBe(201);
  });

  it("refuses while a rental is under way", async () => {
    const owner = await registerUser("del-busy-owner");
    const renter = await registerUser("del-busy-renter");
    const item = await createItem(owner, { status: "active" });
    await createAndAcceptRental(owner, renter, item.id, { startDate: "2032-01-10", endDate: "2032-01-12" });

    for (const [user] of [[owner], [renter]] as const) {
      const res = await del(user, { password: "password123" });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("ACTIVE_RENTALS");
    }
  });

  it("closes unanswered requests on both sides and tells the other person", async () => {
    const owner = await registerUser("del-pend-owner");
    const renter = await registerUser("del-pend-renter");
    const item = await createItem(owner, { status: "active" });
    const sent = await request(app)
      .post("/api/rentals")
      .set(authHeader(renter.accessToken))
      .send({ itemId: item.id, startDate: "2032-02-01", endDate: "2032-02-02" });

    expect((await del(renter, { password: "password123" })).status).toBe(204);
    const rental = await db.selectFrom("rentals").select("status").where("id", "=", sent.body.rental.id).executeTakeFirstOrThrow();
    expect(rental.status).toBe("CANCELLED");
    const notes = await request(app).get("/api/notifications").set(authHeader(owner.accessToken));
    expect(notes.body.notifications.map((n: { type: string }) => n.type)).toContain("rental_cancelled");
  });

  it("stops new messages to a deleted account but keeps the history", async () => {
    const a = await registerUser("del-msg-a");
    const b = await registerUser("del-msg-b");
    const convo = await request(app).post("/api/conversations").set(authHeader(a.accessToken)).send({ recipientId: b.user.id });
    const convoId = convo.body.conversation.id;
    await request(app).post(`/api/conversations/${convoId}/messages`).set(authHeader(a.accessToken)).send({ content: "Merhaba" });

    await del(b, { password: "password123" });

    const send = await request(app).post(`/api/conversations/${convoId}/messages`).set(authHeader(a.accessToken)).send({ content: "Orada mısın?" });
    expect(send.status).toBe(409);
    expect(send.body.error.code).toBe("RECIPIENT_DELETED");
    const history = await request(app).get(`/api/conversations/${convoId}/messages`).set(authHeader(a.accessToken));
    expect(history.status).toBe(200);
    expect((await request(app).post("/api/conversations").set(authHeader(a.accessToken)).send({ recipientId: b.user.id })).status).toBe(404);
  });

  it("confirms Google-only accounts by email, and admins can't revive them", async () => {
    const user = await registerUser("del-google");
    await db.updateTable("users").set({ password_hash: null, auth_provider: "google" }).where("id", "=", user.user.id).execute();
    expect((await del(user, { confirmEmail: "wrong@example.com" })).body.error.code).toBe("CONFIRMATION_MISMATCH");
    expect((await del(user, { confirmEmail: user.user.email.toUpperCase() })).status).toBe(204);

    const admin = await registerUser("del-admin");
    await promoteToAdmin(admin.user.id);
    const adminSession = await loginAs(admin.user.email);
    const revive = await request(app).patch(`/api/admin/users/${user.user.id}/activate`).set(authHeader(adminSession.accessToken));
    expect(revive.status).toBe(409);
  });
});
