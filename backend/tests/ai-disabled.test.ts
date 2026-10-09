import request from "supertest";
import { describe, expect, it } from "vitest";
import { ai } from "../src/ai";
import { app, registerUser } from "./helpers";

// The test environment has no GEMINI_API_KEY: every AI feature must stay off
// and out of the way.
describe("without an AI key", () => {
  it("reports AI as disabled and profiles carry no summary", async () => {
    expect(ai.isEnabled()).toBe(false);
    const user = await registerUser("ai-off");
    const res = await request(app).get(`/api/users/${user.user.id}`);
    expect(res.status).toBe(200);
    expect(res.body.user.reviewSummary).toBeNull();
  });
});
