import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("google-auth-library", () => {
  class OAuth2Client {
    async verifyIdToken({ idToken }: { idToken: string }) {
      if (idToken === "invalid-token") throw new Error("invalid token");
      return {
        getPayload: () => ({
          sub: `sub-${idToken}`,
          email: `${idToken}@example.com`,
          email_verified: true,
          name: `Google User ${idToken}`,
          picture: "https://example.com/avatar.png",
        }),
      };
    }
  }
  return { OAuth2Client };
});

import { app, registerUser, unique } from "./helpers";

describe("google auth", () => {
  it("creates a new account on first Google sign-in", async () => {
    const idToken = unique("google-new");
    const res = await request(app).post("/api/auth/google").send({ idToken });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(`${idToken}@example.com`);
    expect(res.body.user.emailVerified).toBe(true);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.refreshToken).toBeTypeOf("string");
  });

  it("logs the same Google user back in on a second sign-in instead of duplicating", async () => {
    const idToken = unique("google-repeat");
    const first = await request(app).post("/api/auth/google").send({ idToken });
    const second = await request(app).post("/api/auth/google").send({ idToken });

    expect(second.status).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  it("links a Google identity to an existing password account with the same email", async () => {
    const passwordUser = await registerUser("google-link");
    const idToken = passwordUser.user.email.split("@")[0];

    const res = await request(app).post("/api/auth/google").send({ idToken });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(passwordUser.user.id);
  });

  it("rejects an invalid Google credential", async () => {
    const res = await request(app).post("/api/auth/google").send({ idToken: "invalid-token" });
    expect(res.status).toBe(401);
  });
});
