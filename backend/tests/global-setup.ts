import { config } from "dotenv";
import { Client } from "pg";

const CATEGORIES = [
  { name: "Kamera ve Fotoğraf Ekipmanları", slug: "kamera-ve-fotograf", icon: "camera", defaultRiskLevel: "high", sortOrder: 10 },
  { name: "Kamp Ekipmanları", slug: "kamp-ekipmanlari", icon: "tent", defaultRiskLevel: "low", sortOrder: 20 },
  { name: "Elektrikli Aletler", slug: "elektrikli-aletler", icon: "drill", defaultRiskLevel: "medium", sortOrder: 30 },
] as const;

const TABLES_IN_FK_ORDER = [
  "admin_actions",
  "payments",
  "deposit_holds",
  "notifications",
  "dispute_evidence",
  "disputes",
  "messages",
  "conversations",
  "reviews",
  "damage_reports",
  "handover_media",
  "handover_records",
  "rentals",
  "item_availability_blocks",
  "item_images",
  "item_accessories",
  "items",
  "categories",
  "refresh_tokens",
  "users",
];

export default async function globalSetup() {
  config({ path: ".env.test", override: true });

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(`TRUNCATE TABLE ${TABLES_IN_FK_ORDER.join(", ")} RESTART IDENTITY CASCADE`);

    for (const c of CATEGORIES) {
      await client.query(
        `INSERT INTO categories (name, slug, icon, default_risk_level, sort_order) VALUES ($1, $2, $3, $4, $5)`,
        [c.name, c.slug, c.icon, c.defaultRiskLevel, c.sortOrder],
      );
    }
  } finally {
    await client.end();
  }
}
