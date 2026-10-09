/**
 * Adds clearly-labelled demo reviews so the review UI and its AI summary can
 * be seen on a fresh site, and removes them again.
 *
 *   node dist/db/seed-demo-reviews.js            add (does nothing if already added)
 *   node dist/db/seed-demo-reviews.js --remove   remove everything it added
 *
 * Reviews come from three demo accounts whose names end in "(Demo)" and that
 * cannot sign in. Each review sits on a past, completed rental between a
 * demo account and a real listing's owner, and the owner reviews back, so
 * the reveal rule shows it straight away. Those rentals also count toward
 * the owner's completed rentals (trust score, earnings) until removed.
 * Removing deletes the demo accounts and their rentals; reviews, handover
 * records and the like go with the rentals through ON DELETE CASCADE.
 */
import { db } from ".";

const DEMO_EMAIL_DOMAIN = "@demo.paylasimlik.invalid";
const REVIEWERS = ["Ayşe K. (Demo)", "Can T. (Demo)", "Zeynep A. (Demo)"];
/** Enough for an AI summary to appear. */
const REVIEWS_PER_OWNER = 4;

const COMMENTS: [number, string][] = [
  [5, "Eşya tertemiz ve anlatıldığı gibiydi, teslimde her şeyi tek tek gösterdi."],
  [5, "Çok hızlı dönüş yaptı, buluşma saatine tam uydu. Tekrar kiralarım."],
  [4, "Ürün sorunsuzdu, sadece teslimde 15 dakika kadar gecikti."],
  [5, "Kullanımıyla ilgili güzel ipuçları verdi, iletişimi çok iyiydi."],
  [5, "Aksesuarlar eksiksizdi, kutusuyla birlikte verdi. Güvenilir biri."],
  [4, "Genel olarak memnun kaldım, ürünün üzerinde birkaç küçük çizik vardı ama önceden söylemişti."],
  [5, "Depozito iadesi ve teslim süreci çok rahat geçti."],
  [3, "Ürün iyiydi ama mesajlara biraz geç dönüyor."],
];

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

async function demoUserIds() {
  const rows = await db.selectFrom("users").select("id").where("email", "like", `%${DEMO_EMAIL_DOMAIN}`).execute();
  return rows.map((r) => r.id);
}

async function add() {
  if ((await demoUserIds()).length > 0) {
    console.log("Demo reviews are already there. Run with --remove first to recreate them.");
    return;
  }

  const reviewers = [];
  for (const [i, name] of REVIEWERS.entries()) {
    reviewers.push(
      await db
        .insertInto("users")
        .values({ email: `reviewer${i + 1}${DEMO_EMAIL_DOMAIN}`, full_name: name, password_hash: null })
        .returning("id")
        .executeTakeFirstOrThrow(),
    );
  }

  const items = await db
    .selectFrom("items")
    .innerJoin("users", "users.id", "items.owner_id")
    .select(["items.id", "items.owner_id", "items.title", "items.daily_price", "items.deposit_amount", "items.delivery_method"])
    .where("items.status", "=", "active")
    .where("users.status", "=", "active")
    .orderBy("items.created_at")
    .execute();

  const byOwner = new Map<string, typeof items>();
  for (const item of items) byOwner.set(item.owner_id, [...(byOwner.get(item.owner_id) ?? []), item]);

  let commentIndex = 0;
  let created = 0;
  for (const [ownerId, ownerItems] of byOwner) {
    for (let n = 0; n < REVIEWS_PER_OWNER; n++) {
      // Spread over the owner's listings; an owner with one listing gets several rentals of it.
      const item = ownerItems[n % ownerItems.length]!;
      const reviewer = reviewers[n % reviewers.length]!;
      const [rating, comment] = COMMENTS[commentIndex++ % COMMENTS.length]!;
      const days = 2;
      const endDaysAgo = 10 + created * 6;
      const price = Number(item.daily_price) * days;
      const fee = Math.round(price * 0.1 * 100) / 100;
      const completedAt = new Date(Date.now() - (endDaysAgo - 1) * 86_400_000);

      const rental = await db
        .insertInto("rentals")
        .values({
          item_id: item.id,
          renter_id: reviewer.id,
          owner_id: ownerId,
          start_date: isoDaysAgo(endDaysAgo + days - 1),
          end_date: isoDaysAgo(endDaysAgo),
          daily_price_snapshot: item.daily_price,
          rental_price: String(price),
          deposit_amount: item.deposit_amount,
          platform_fee: String(fee),
          total_amount: String(price + fee + Number(item.deposit_amount)),
          status: "COMPLETED",
          delivery_method: item.delivery_method === "delivery" ? "delivery" : "pickup",
          accepted_at: new Date(Date.now() - (endDaysAgo + days + 2) * 86_400_000),
          completed_at: completedAt,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      // Both sides review, so the existing reveal rule makes it public at once.
      await db
        .insertInto("reviews")
        .values([
          { rental_id: rental.id, reviewer_id: reviewer.id, reviewee_id: ownerId, rating, comment, created_at: completedAt },
          { rental_id: rental.id, reviewer_id: ownerId, reviewee_id: reviewer.id, rating: 5, comment: null, created_at: completedAt },
        ])
        .execute();
      created++;
      console.log(`  ${rating}★ on "${item.title}"`);
    }
  }
  console.log(`Added ${created} demo reviews for ${byOwner.size} owner(s).`);
}

async function remove() {
  const ids = await demoUserIds();
  if (ids.length === 0) {
    console.log("No demo reviews to remove.");
    return;
  }
  const rentals = await db.deleteFrom("rentals").where("renter_id", "in", ids).executeTakeFirst();
  await db.deleteFrom("users").where("id", "in", ids).execute();
  console.log(`Removed ${Number(rentals.numDeletedRows)} demo rentals with their reviews, and ${ids.length} demo accounts.`);
}

(process.argv.includes("--remove") ? remove() : add())
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
