import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, authHeader, registerUser, unique } from "./helpers";

describe("auth", () => {
  it("registers a new user and returns a token pair", async () => {
    const email = `${unique("register")}@example.com`;
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password: "password123", fullName: "Register Test" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe("user");
    expect(res.body.user.status).toBe("active");
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.refreshToken).toBeTypeOf("string");
  });

  it("rejects a duplicate email with 409", async () => {
    const email = `${unique("dup")}@example.com`;
    await request(app).post("/api/auth/register").send({ email, password: "password123", fullName: "First" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password: "password123", fullName: "Second" });

    expect(res.status).toBe(409);
  });

  it("logs in with correct credentials and rejects a wrong password", async () => {
    const user = await registerUser("login");

    const ok = await request(app).post("/api/auth/login").send({ email: user.user.email, password: "password123" });
    expect(ok.status).toBe(200);

    const bad = await request(app).post("/api/auth/login").send({ email: user.user.email, password: "wrong" });
    expect(bad.status).toBe(401);
  });

  it("returns the caller's own profile from /me and rejects requests with no token", async () => {
    const user = await registerUser("me");

    const withToken = await request(app).get("/api/users/me").set(authHeader(user.accessToken));
    expect(withToken.status).toBe(200);
    expect(withToken.body.user.id).toBe(user.user.id);

    const withoutToken = await request(app).get("/api/users/me");
    expect(withoutToken.status).toBe(401);
  });

  it("updates the profile and leaves untouched fields alone", async () => {
    const user = await registerUser("update");

    const res = await request(app)
      .patch("/api/users/me")
      .set(authHeader(user.accessToken))
      .send({ bio: "Hello from the test suite" });

    expect(res.status).toBe(200);
    expect(res.body.user.bio).toBe("Hello from the test suite");
    expect(res.body.user.fullName).toBe(user.user.fullName);
  });

  it("rotates refresh tokens and detects reuse of an already-rotated token", async () => {
    const user = await registerUser("refresh");

    const firstRefresh = await request(app).post("/api/auth/refresh").send({ refreshToken: user.refreshToken });
    expect(firstRefresh.status).toBe(200);
    const rotated = firstRefresh.body.refreshToken;
    expect(rotated).not.toBe(user.refreshToken);

    const reuse = await request(app).post("/api/auth/refresh").send({ refreshToken: user.refreshToken });
    expect(reuse.status).toBe(401);

    // Reuse detection revokes every session for the user, so even the freshly
    // rotated token should now be dead.
    const afterTheftDetected = await request(app).post("/api/auth/refresh").send({ refreshToken: rotated });
    expect(afterTheftDetected.status).toBe(401);
  });

  it("exposes a public profile without the private fields", async () => {
    const user = await registerUser("public");

    const res = await request(app).get(`/api/users/${user.user.id}`);
    expect(res.status).toBe(200);
    expect(res.body.user.fullName).toBe(user.user.fullName);
    expect(res.body.user.email).toBeUndefined();
  });

  it("logout revokes the refresh token", async () => {
    const user = await registerUser("logout");

    const logoutRes = await request(app).post("/api/auth/logout").send({ refreshToken: user.refreshToken });
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogout = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: user.refreshToken });
    expect(refreshAfterLogout.status).toBe(401);
  });
});
