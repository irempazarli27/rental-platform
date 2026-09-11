// One-off seeder: walks a full rental through request -> accept -> pickup
// handover -> active -> return handover -> completed -> both reviews, using
// the real HTTP API end to end, so there's an actual example of a completed
// rental + visible review to look at instead of an empty state.
const API_URL = process.env.SEED_API_URL ?? "http://localhost:4000";

const OWNER = { email: "demo.sahip@example.com", password: "DemoSahip123!" };
const RENTER = {
  email: "demo.kiraci@example.com",
  password: "DemoKiraci123!",
  fullName: "Mert Yılmaz",
  phone: "5559876543",
};

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method ?? "GET"} ${path} -> ${res.status}: ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

async function loginOrRegister(creds) {
  try {
    const { accessToken, user } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: creds.email, password: creds.password }),
    });
    return { accessToken, user };
  } catch {
    const { accessToken, user } = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(creds),
    });
    return { accessToken, user };
  }
}

async function fetchImageBuffer(seed) {
  const res = await fetch(`https://picsum.photos/seed/${seed}/600/450`);
  return Buffer.from(await res.arrayBuffer());
}

const STEPS = ["FRONT", "BACK", "LEFT", "RIGHT"];

async function uploadHandoverMedia(rentalId, token, phase, step, isVideo = false) {
  const form = new FormData();
  form.append("step", step);
  const bytes = isVideo ? Buffer.from("fake-demo-video-bytes") : await fetchImageBuffer(`${rentalId}-${phase}-${step}`);
  form.append(
    "media",
    new Blob([bytes], { type: isVideo ? "video/mp4" : "image/jpeg" }),
    isVideo ? "video.mp4" : `${step}.jpg`,
  );
  const res = await fetch(`${API_URL}/api/rentals/${rentalId}/handover/${phase}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`upload ${phase}/${step} failed: ${res.status} ${await res.text()}`);
}

async function completeHandoverPhase(rentalId, token, phase) {
  for (const step of STEPS) {
    await uploadHandoverMedia(rentalId, token, phase, step);
  }
  await uploadHandoverMedia(rentalId, token, phase, "VIDEO", true);
  await api(`/api/rentals/${rentalId}/handover/${phase}/ready`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
}

async function main() {
  const owner = await loginOrRegister(OWNER);
  const renter = await loginOrRegister(RENTER);
  console.log("owner:", owner.user.id, "| renter:", renter.user.id);

  const { items } = await api(`/api/items?ownerId=${owner.user.id}&pageSize=50`);
  const item = items.find((i) => i.title.includes("Samsonite"));
  if (!item) throw new Error("Could not find the Samsonite demo item to rent — run seed-demo-items.mjs first.");
  console.log("renting item:", item.title, item.id);

  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date();
  end.setDate(end.getDate() + 3);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const { rental } = await api("/api/rentals", {
    method: "POST",
    headers: { Authorization: `Bearer ${renter.accessToken}` },
    body: JSON.stringify({ itemId: item.id, startDate: fmt(start), endDate: fmt(end) }),
  });
  console.log("created rental:", rental.id);

  await api(`/api/rentals/${rental.id}/accept`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${owner.accessToken}` },
  });
  console.log("accepted");

  await completeHandoverPhase(rental.id, owner.accessToken, "pickup");
  await api(`/api/rentals/${rental.id}/handover/pickup/confirm`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${renter.accessToken}` },
    body: JSON.stringify({}),
  });
  console.log("pickup complete, rental active");

  await completeHandoverPhase(rental.id, renter.accessToken, "return");
  await api(`/api/rentals/${rental.id}/handover/return/confirm`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    body: JSON.stringify({}),
  });
  console.log("return complete, rental completed");

  await api(`/api/rentals/${rental.id}/reviews`, {
    method: "POST",
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    body: JSON.stringify({ rating: 5, comment: "Valiz tam zamanında ve açıklandığı gibi geri geldi, teşekkürler!" }),
  });
  await api(`/api/rentals/${rental.id}/reviews`, {
    method: "POST",
    headers: { Authorization: `Bearer ${renter.accessToken}` },
    body: JSON.stringify({ rating: 5, comment: "Sorunsuz bir kiralama deneyimiydi, eşya açıklandığı gibiydi." }),
  });
  console.log("both reviews submitted");

  console.log(`\nDone. Rental detail: /dashboard/rentals/${rental.id}`);
  console.log(`Owner profile: /profile/${owner.user.id}`);
  console.log(`Renter profile: /profile/${renter.user.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
