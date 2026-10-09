import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatRequest } from "../src/ai/AiProvider";

// The fake model runs whatever tool a test asks for and echoes its result,
// which lets these tests check what the tools expose without calling Gemini.
const { chat } = vi.hoisted(() => ({ chat: vi.fn() }));
vi.mock("../src/ai/provider", () => ({
  provider: { name: "fake", generateStructured: vi.fn(), chat },
}));

import { app, authHeader, createAndAcceptRental, createItem, registerUser, type TestUser } from "./helpers";

const ask = (user: TestUser, messages: object[]) =>
  request(app).post("/api/ai/assistant").set(authHeader(user.accessToken)).send({ messages });

function runTool(name: string, args: Record<string, unknown> = {}) {
  chat.mockImplementationOnce(async (req: ChatRequest) => {
    const tool = req.tools.find((t) => t.name === name)!;
    const result = await tool.run(args).catch((e: Error) => ({ thrown: e.message }));
    return { text: JSON.stringify(result), model: "fake" };
  });
}

describe("help assistant", () => {
  beforeEach(() => chat.mockReset());

  it("reports whether AI is available, without login", async () => {
    const res = await request(app).get("/api/ai/status");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enabled: true });
  });

  it("requires login and a final user message", async () => {
    expect((await request(app).post("/api/ai/assistant").send({ messages: [{ role: "user", text: "Merhaba" }] })).status).toBe(401);
    const user = await registerUser("asst-validate");
    expect((await ask(user, [])).status).toBe(400);
    expect((await ask(user, [{ role: "assistant", text: "Selam" }])).status).toBe(400);
    expect((await ask(user, [{ role: "user", text: "x".repeat(1001) }])).status).toBe(400);
    expect(chat).not.toHaveBeenCalled();
  });

  it("answers with the model's reply and keeps only the recent history", async () => {
    chat.mockResolvedValueOnce({ text: "  Merhaba!  ", model: "fake" });
    const user = await registerUser("asst-reply");
    const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `mesaj ${i}` }));
    history.push({ role: "user", text: "Son soru" });
    const res = await ask(user, history);
    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Merhaba!");
    const sent = (chat.mock.calls[0]![0] as ChatRequest).messages;
    expect(sent.length).toBeLessThanOrEqual(12);
    expect(sent[0]!.role).toBe("user");
    expect(sent.at(-1)!.text).toBe("Son soru");
  });

  it("lists only the asker's own rentals, in Turkish and without the other person's details", async () => {
    const owner = await registerUser("asst-owner");
    const renter = await registerUser("asst-renter");
    const item = await createItem(owner, { title: "Asistan Kamerası" });
    await createAndAcceptRental(owner, renter, item.id, { startDate: "2034-03-01", endDate: "2034-03-02" });

    runTool("list_my_rentals");
    const mine = JSON.parse((await ask(owner, [{ role: "user", text: "Kiralamalarım?" }])).body.reply);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ item: "Asistan Kamerası", myRole: "eşya sahibi", status: "Kabul Edildi" });
    const raw = JSON.stringify(mine);
    expect(raw).not.toContain(renter.user.fullName);
    expect(raw).not.toContain(renter.user.email);

    const stranger = await registerUser("asst-stranger");
    runTool("list_my_rentals");
    expect(JSON.parse((await ask(stranger, [{ role: "user", text: "Kiralamalarım?" }])).body.reply)).toEqual([]);
  });

  it("can't read someone else's rental", async () => {
    const owner = await registerUser("asst-own2");
    const renter = await registerUser("asst-ren2");
    const item = await createItem(owner);
    const rental = await createAndAcceptRental(owner, renter, item.id, { startDate: "2034-04-01", endDate: "2034-04-02" });

    runTool("get_rental", { rentalId: rental.id });
    const forRenter = JSON.parse((await ask(renter, [{ role: "user", text: "Depozitom?" }])).body.reply);
    expect(forRenter).toMatchObject({ myRole: "kiracı", deposit: { status: "bloke edildi, henüz iade edilmedi" } });

    const stranger = await registerUser("asst-str2");
    runTool("get_rental", { rentalId: rental.id });
    const forStranger = JSON.parse((await ask(stranger, [{ role: "user", text: "Bu kiralama?" }])).body.reply);
    expect(forStranger.thrown).toBeDefined();
    expect(JSON.stringify(forStranger)).not.toContain(item.title);
  });
});
