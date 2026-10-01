import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Stand in for a configured SMTP server: the service should deliver the code
// through the mailer and keep it out of the HTTP response.
const { sendVerificationCode } = vi.hoisted(() => ({ sendVerificationCode: vi.fn() }));
vi.mock("../src/modules/verification/mailer", () => ({
  mailer: { isConfigured: () => true, sendVerificationCode },
}));

import { app, authHeader, registerUser, type TestUser } from "./helpers";

const post = (user: TestUser, path: string, body: object = {}) =>
  request(app).post(`/api/verification${path}`).set(authHeader(user.accessToken)).send(body);

describe("email verification with a real mail provider", () => {
  beforeEach(() => {
    sendVerificationCode.mockReset();
  });

  it("emails the code instead of returning it, and the emailed code verifies", async () => {
    const user = await registerUser("ver-mail");
    const sent = await post(user, "/email/send");

    expect(sent.status).toBe(200);
    expect(sent.body).toEqual({ sent: true, expiresInMinutes: 10 });
    expect(sendVerificationCode).toHaveBeenCalledTimes(1);
    const [to, code] = sendVerificationCode.mock.calls[0]!;
    expect(to).toBe(user.user.email);
    expect(code).toMatch(/^\d{6}$/);

    const ok = await post(user, "/email/confirm", { code });
    expect(ok.status).toBe(200);
    expect(ok.body.verification).toMatchObject({ level: "email", email: { verified: true }, realEmail: true });
  });

  it("reports a delivery failure instead of pretending the code was sent", async () => {
    sendVerificationCode.mockRejectedValueOnce(new Error("smtp down"));
    const user = await registerUser("ver-mail-fail");
    const res = await post(user, "/email/send");
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("EMAIL_SEND_FAILED");
  });

  it("still hands phone codes back in demo mode", async () => {
    const user = await registerUser("ver-mail-phone");
    await post(user, "/email/send");
    await post(user, "/email/confirm", { code: sendVerificationCode.mock.calls[0]![1] });
    const phone = `0533${String(Date.now()).slice(-7)}`;
    const sent = await post(user, "/phone/send", { phone });
    expect(sent.status).toBe(200);
    expect(sent.body.demoCode).toMatch(/^\d{6}$/);
  });
});
