import request from "supertest";
import { describe, expect, it } from "vitest";
import { isValidTckn, maxLevel, normalizeTrPhone } from "../src/modules/verification/verification.rules";
import { app, authHeader, registerUser, type TestUser } from "./helpers";

// A well-known structurally valid (but fictional) test ID number.
const VALID_TCKN = "10000000146";
let phoneCounter = 0;
const nextPhone = () => `0532${String(1000000 + ++phoneCounter + Math.floor(Math.random() * 500000)).slice(-7)}`;

const post = (user: TestUser, path: string, body: object = {}) =>
  request(app).post(`/api/verification${path}`).set(authHeader(user.accessToken)).send(body);

async function verifyEmail(user: TestUser) {
  const sent = await post(user, "/email/send");
  return post(user, "/email/confirm", { code: sent.body.demoCode });
}

async function verifyPhone(user: TestUser, phone = nextPhone()) {
  const sent = await post(user, "/phone/send", { phone });
  return post(user, "/phone/confirm", { code: sent.body.demoCode });
}

describe("verification rules (pure)", () => {
  it("validates the T.C. kimlik checksum", () => {
    expect(isValidTckn(VALID_TCKN)).toBe(true);
    expect(isValidTckn("10000000147")).toBe(false); // wrong check digit
    expect(isValidTckn("01234567890")).toBe(false); // leading zero
    expect(isValidTckn("1234567890")).toBe(false); // too short
    expect(isValidTckn("abcdefghijk")).toBe(false);
  });

  it("normalizes Turkish mobile numbers", () => {
    for (const v of ["0532 123 45 67", "5321234567", "+90 532 123 45 67", "905321234567", "0(532)123-45-67"]) {
      expect(normalizeTrPhone(v)).toBe("5321234567");
    }
    expect(normalizeTrPhone("02121234567")).toBeNull();
    expect(normalizeTrPhone("12345")).toBeNull();
  });

  it("never lowers a level", () => {
    expect(maxLevel("phone", "email")).toBe("phone");
    expect(maxLevel("email", "id_verified")).toBe("id_verified");
  });
});

describe("verification flow", () => {
  it("starts unverified", async () => {
    const user = await registerUser("ver-start");
    const res = await request(app).get("/api/verification").set(authHeader(user.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.verification).toMatchObject({
      level: "none",
      email: { verified: false },
      phone: { verified: false },
      id: { verified: false },
      demoMode: true,
      points: { email: 3, phone: 3, id: 9 },
    });
  });

  it("requires authentication", async () => {
    expect((await request(app).get("/api/verification")).status).toBe(401);
  });

  it("verifies email with the right code and rejects a wrong one", async () => {
    const user = await registerUser("ver-email");
    const sent = await post(user, "/email/send");
    expect(sent.status).toBe(200);
    expect(sent.body.demoCode).toMatch(/^\d{6}$/);

    const wrong = await post(user, "/email/confirm", { code: sent.body.demoCode === "000000" ? "111111" : "000000" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe("INVALID_CODE");

    const ok = await post(user, "/email/confirm", { code: sent.body.demoCode });
    expect(ok.status).toBe(200);
    expect(ok.body.verification.level).toBe("email");
    expect(ok.body.verification.email.verified).toBe(true);

    // A used code can't be replayed, and verifying again is a conflict.
    expect((await post(user, "/email/confirm", { code: sent.body.demoCode })).status).toBe(400);
    expect((await post(user, "/email/send")).status).toBe(409);
  });

  it("locks a code after too many wrong attempts", async () => {
    const user = await registerUser("ver-lock");
    const sent = await post(user, "/email/send");
    const bad = sent.body.demoCode === "999999" ? "888888" : "999999";
    for (let i = 0; i < 5; i++) await post(user, "/email/confirm", { code: bad });

    const res = await post(user, "/email/confirm", { code: sent.body.demoCode });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TOO_MANY_ATTEMPTS");
  });

  it("enforces the ladder: phone needs email, ID needs phone", async () => {
    const user = await registerUser("ver-ladder");

    const phoneFirst = await post(user, "/phone/send", { phone: nextPhone() });
    expect(phoneFirst.status).toBe(409);
    expect(phoneFirst.body.error.code).toBe("EMAIL_NOT_VERIFIED");

    await verifyEmail(user);
    const idFirst = await post(user, "/id", { tckn: VALID_TCKN, consent: true });
    expect(idFirst.status).toBe(409);
    expect(idFirst.body.error.code).toBe("PHONE_NOT_VERIFIED");
  });

  it("verifies phone, rejecting malformed numbers", async () => {
    const user = await registerUser("ver-phone");
    await verifyEmail(user);

    const bad = await post(user, "/phone/send", { phone: "02121234567" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_PHONE");

    const ok = await verifyPhone(user);
    expect(ok.status).toBe(200);
    expect(ok.body.verification.level).toBe("phone");
    expect(ok.body.verification.phone.verified).toBe(true);
  });

  it("does not let two accounts verify the same phone number", async () => {
    const a = await registerUser("ver-phone-a");
    const b = await registerUser("ver-phone-b");
    await verifyEmail(a);
    await verifyEmail(b);
    const shared = nextPhone();
    expect((await verifyPhone(a, shared)).status).toBe(200);

    const res = await post(b, "/phone/send", { phone: shared });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PHONE_TAKEN");
  });

  it("verifies ID (demo), needs consent and a well-formed number, and raises the trust score", async () => {
    const user = await registerUser("ver-id");
    await verifyEmail(user);
    await verifyPhone(user);

    const noConsent = await post(user, "/id", { tckn: VALID_TCKN, consent: false });
    expect(noConsent.status).toBe(400);

    const malformed = await post(user, "/id", { tckn: "10000000147", consent: true });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe("INVALID_ID_NUMBER");

    const ok = await post(user, "/id", { tckn: VALID_TCKN, consent: true });
    expect(ok.status).toBe(200);
    expect(ok.body.verification).toMatchObject({ level: "id_verified", id: { verified: true } });

    const me = await request(app).get("/api/users/me").set(authHeader(user.accessToken));
    expect(me.body.user.trust.breakdown.verification).toBe(15);
    expect(me.body.user.emailVerified).toBe(true);
    expect(me.body.user.phoneVerified).toBe(true);

    expect((await post(user, "/id", { tckn: VALID_TCKN, consent: true })).status).toBe(409);
  });

  it("does not let one ID number verify two accounts", async () => {
    // Reuse the number the previous test already burned on another account.
    const other = await registerUser("ver-id-dup");
    await verifyEmail(other);
    await verifyPhone(other);

    const res = await post(other, "/id", { tckn: VALID_TCKN, consent: true });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ID_ALREADY_USED");
  });

  it("awards trust points per step (email 3, phone 6 total)", async () => {
    const user = await registerUser("ver-trust");
    await verifyEmail(user);
    let me = await request(app).get("/api/users/me").set(authHeader(user.accessToken));
    expect(me.body.user.trust.breakdown.verification).toBe(3);

    await verifyPhone(user);
    me = await request(app).get("/api/users/me").set(authHeader(user.accessToken));
    expect(me.body.user.trust.breakdown.verification).toBe(6);
  });
});
