import request from "supertest";
import { app } from "../src/app";

export { app };

let counter = 0;
/** Unique-per-process suffix so parallel test files never collide on email/slug uniqueness. */
export function unique(label: string): string {
  counter += 1;
  return `${label}-${Date.now()}-${counter}`;
}

export interface TestUser {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string; role: string };
}

export async function registerUser(label: string): Promise<TestUser> {
  const email = `${unique(label)}@example.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email, password: "password123", fullName: `Test ${label}` });
  if (res.status !== 201) {
    throw new Error(`registerUser(${label}) failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

export async function loginAs(email: string, password = "password123"): Promise<TestUser> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`loginAs(${email}) failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getFirstCategory() {
  const res = await request(app).get("/api/categories");
  if (res.status !== 200 || res.body.categories.length === 0) {
    throw new Error("No categories seeded — did global setup run?");
  }
  return res.body.categories[0] as { id: string; slug: string; defaultRiskLevel: string };
}

export async function getCategoryBySlug(slug: string) {
  const res = await request(app).get("/api/categories");
  const category = res.body.categories.find((c: { slug: string }) => c.slug === slug);
  if (!category) throw new Error(`Category with slug "${slug}" not found — did global setup run?`);
  return category as { id: string; slug: string; defaultRiskLevel: string };
}

export interface CreateItemOverrides {
  title?: string;
  categoryId?: string;
  dailyPrice?: number;
  weeklyPrice?: number;
  depositAmount?: number;
  serialNumber?: string;
  accessories?: { name: string; quantity: number }[];
  status?: "draft" | "active";
}

export async function createItem(owner: TestUser, overrides: CreateItemOverrides = {}) {
  const category = overrides.categoryId ? { id: overrides.categoryId } : await getFirstCategory();
  const res = await request(app)
    .post("/api/items")
    .set(authHeader(owner.accessToken))
    .send({
      title: overrides.title ?? unique("Test Item"),
      description: "An item created for automated integration tests.",
      categoryId: category.id,
      dailyPrice: overrides.dailyPrice ?? 100,
      weeklyPrice: overrides.weeklyPrice,
      depositAmount: overrides.depositAmount ?? 0,
      serialNumber: overrides.serialNumber,
      accessories: overrides.accessories ?? [],
      status: overrides.status ?? "active",
    });
  if (res.status !== 201) {
    throw new Error(`createItem failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.item;
}

export async function createAndAcceptRental(
  owner: TestUser,
  renter: TestUser,
  itemId: string,
  dates: { startDate: string; endDate: string },
) {
  const createRes = await request(app)
    .post("/api/rentals")
    .set(authHeader(renter.accessToken))
    .send({ itemId, ...dates });
  if (createRes.status !== 201) {
    throw new Error(`create rental failed: ${createRes.status} ${JSON.stringify(createRes.body)}`);
  }
  const rental = createRes.body.rental;

  const acceptRes = await request(app).patch(`/api/rentals/${rental.id}/accept`).set(authHeader(owner.accessToken));
  if (acceptRes.status !== 200) {
    throw new Error(`accept rental failed: ${acceptRes.status} ${JSON.stringify(acceptRes.body)}`);
  }
  return acceptRes.body.rental;
}

const PNG_BUFFER = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const FAKE_VIDEO_BUFFER = Buffer.from("faketestvideodata");

export async function uploadHandoverStep(
  rentalId: string,
  actor: TestUser,
  phase: "pickup" | "return",
  step: string,
  isVideo = false,
) {
  return request(app)
    .post(`/api/rentals/${rentalId}/handover/${phase}/media`)
    .set(authHeader(actor.accessToken))
    .field("step", step)
    .attach("media", isVideo ? FAKE_VIDEO_BUFFER : PNG_BUFFER, {
      filename: isVideo ? "video.mp4" : "photo.png",
      contentType: isVideo ? "video/mp4" : "image/png",
    });
}

const ALL_STEPS = ["FRONT", "BACK", "LEFT", "RIGHT"] as const;

/** Uploads FRONT/BACK/LEFT/RIGHT + VIDEO, plus SERIAL/ACCESSORIES when the item has them, then marks ready. */
export async function completeHandoverPhase(
  rentalId: string,
  actor: TestUser,
  phase: "pickup" | "return",
  options: { hasSerial?: boolean; hasAccessories?: boolean } = {},
) {
  for (const step of ALL_STEPS) {
    await uploadHandoverStep(rentalId, actor, phase, step);
  }
  if (options.hasSerial) await uploadHandoverStep(rentalId, actor, phase, "SERIAL");
  if (options.hasAccessories) await uploadHandoverStep(rentalId, actor, phase, "ACCESSORIES");
  await uploadHandoverStep(rentalId, actor, phase, "VIDEO", true);

  const readyRes = await request(app)
    .patch(`/api/rentals/${rentalId}/handover/${phase}/ready`)
    .set(authHeader(actor.accessToken))
    .send({});
  if (readyRes.status !== 200) {
    throw new Error(`mark ${phase} ready failed: ${readyRes.status} ${JSON.stringify(readyRes.body)}`);
  }
  return readyRes.body.rental;
}

/** Full ACCEPTED -> ACTIVE walk: owner documents pickup, renter confirms receipt. */
export async function advanceToActive(
  owner: TestUser,
  renter: TestUser,
  rentalId: string,
  options: { hasSerial?: boolean; hasAccessories?: boolean } = {},
) {
  await completeHandoverPhase(rentalId, owner, "pickup", options);
  const confirmRes = await request(app)
    .patch(`/api/rentals/${rentalId}/handover/pickup/confirm`)
    .set(authHeader(renter.accessToken))
    .send({});
  if (confirmRes.status !== 200) {
    throw new Error(`confirm pickup failed: ${confirmRes.status} ${JSON.stringify(confirmRes.body)}`);
  }
  return confirmRes.body.rental;
}

/** Full ACTIVE -> COMPLETED walk: renter documents return, owner confirms. */
export async function advanceToCompleted(
  owner: TestUser,
  renter: TestUser,
  rentalId: string,
  options: { hasSerial?: boolean; hasAccessories?: boolean } = {},
) {
  await completeHandoverPhase(rentalId, renter, "return", options);
  const confirmRes = await request(app)
    .patch(`/api/rentals/${rentalId}/handover/return/confirm`)
    .set(authHeader(owner.accessToken))
    .send({});
  if (confirmRes.status !== 200) {
    throw new Error(`confirm return failed: ${confirmRes.status} ${JSON.stringify(confirmRes.body)}`);
  }
  return confirmRes.body.rental;
}

export async function promoteToAdmin(userId: string) {
  // Tests reach directly into the DB rather than going through the CLI script,
  // since there is deliberately no HTTP endpoint for self-service admin creation.
  const { db } = await import("../src/db");
  await db.updateTable("users").set({ role: "admin" }).where("id", "=", userId).execute();
}
