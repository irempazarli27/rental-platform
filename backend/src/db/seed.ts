import { db } from ".";
import type { RiskLevel } from "./types";

interface SeedCategory {
  name: string;
  slug: string;
  icon: string;
  defaultRiskLevel: RiskLevel;
  sortOrder: number;
}

const CATEGORIES: SeedCategory[] = [
  { name: "Kamera ve Fotoğraf Ekipmanları", slug: "kamera-ve-fotograf", icon: "camera", defaultRiskLevel: "high", sortOrder: 10 },
  { name: "Kamp Ekipmanları", slug: "kamp-ekipmanlari", icon: "tent", defaultRiskLevel: "low", sortOrder: 20 },
  { name: "Elektrikli Aletler", slug: "elektrikli-aletler", icon: "drill", defaultRiskLevel: "medium", sortOrder: 30 },
  { name: "Projeksiyon", slug: "projeksiyon", icon: "projector", defaultRiskLevel: "medium", sortOrder: 40 },
  { name: "Oyun Konsolları", slug: "oyun-konsollari", icon: "gamepad", defaultRiskLevel: "medium", sortOrder: 50 },
  { name: "Spor Ekipmanları", slug: "spor-ekipmanlari", icon: "dumbbell", defaultRiskLevel: "low", sortOrder: 60 },
  { name: "Organizasyon ve Parti Ekipmanları", slug: "organizasyon-parti-ekipmanlari", icon: "party-popper", defaultRiskLevel: "low", sortOrder: 70 },
  { name: "Müzik Ekipmanları", slug: "muzik-ekipmanlari", icon: "music", defaultRiskLevel: "medium", sortOrder: 80 },
  { name: "Valiz", slug: "valiz", icon: "briefcase", defaultRiskLevel: "low", sortOrder: 90 },
  { name: "Bisiklet", slug: "bisiklet", icon: "bike", defaultRiskLevel: "medium", sortOrder: 100 },
  { name: "Ev Aletleri", slug: "ev-aletleri", icon: "home", defaultRiskLevel: "low", sortOrder: 110 },
  { name: "Diğer", slug: "diger", icon: "grid", defaultRiskLevel: "low", sortOrder: 999 },
];

async function seed() {
  for (const category of CATEGORIES) {
    await db
      .insertInto("categories")
      .values({
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        default_risk_level: category.defaultRiskLevel,
        sort_order: category.sortOrder,
      })
      .onConflict((oc) =>
        oc.column("slug").doUpdateSet({
          name: category.name,
          icon: category.icon,
          default_risk_level: category.defaultRiskLevel,
          sort_order: category.sortOrder,
        }),
      )
      .execute();
  }

  console.log(`Seeded ${CATEGORIES.length} categories.`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
