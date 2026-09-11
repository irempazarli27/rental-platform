// One-off demo-content seeder: creates a demo owner account, then creates a
// handful of realistic listings (with real photos) across most categories so
// the home page and item detail page have something to look at besides
// "Fotoğraf yok" placeholders. Safe to re-run — the owner account is reused
// via login-if-exists, and each run just adds another batch of items.
const API_URL = process.env.SEED_API_URL ?? "http://localhost:4000";

const OWNER = {
  email: "demo.sahip@example.com",
  password: "DemoSahip123!",
  fullName: "Elif Demir",
  phone: "5551112233",
};

const ITEMS = [
  {
    title: "Sony A7 III Aynasız Fotoğraf Makinesi",
    description:
      "Profesyonel çekimler için Sony A7 III, 28-70mm kit lens ile birlikte. Az kullanılmış, tüm fonksiyonları sorunsuz çalışıyor. Düğün, etkinlik ve seyahat çekimleri için idealdir.",
    categorySlug: "kamera-ve-fotograf",
    brand: "Sony",
    model: "A7 III",
    condition: "like_new",
    riskLevel: "high",
    dailyPrice: 350,
    weeklyPrice: 2000,
    depositAmount: 5000,
    deliveryMethod: "both",
    city: "İstanbul",
    district: "Kadıköy",
    accessories: [{ name: "50mm f1.8 Lens" }, { name: "Ekstra Batarya", quantity: 2 }, { name: "64GB Hafıza Kartı" }],
    images: ["camera-a7iii-a", "camera-a7iii-b"],
  },
  {
    title: "Coleman 4 Kişilik Su Geçirmez Kamp Çadırı",
    description:
      "Kolay kurulumlu, su geçirmez 4 kişilik kamp çadırı. Geçtiğimiz yaz birkaç kez kullanıldı, hiçbir yırtık veya hasarı yok. Kamp poşetiyle birlikte teslim edilir.",
    categorySlug: "kamp-ekipmanlari",
    brand: "Coleman",
    condition: "good",
    riskLevel: "low",
    dailyPrice: 80,
    weeklyPrice: 450,
    depositAmount: 300,
    deliveryMethod: "pickup",
    city: "Muğla",
    district: "Bodrum",
    accessories: [{ name: "Taşıma Çantası" }, { name: "Kazık Seti" }],
    images: ["tent-a", "tent-b"],
  },
  {
    title: "Bosch Darbeli Matkap Seti",
    description:
      "Ev içi tadilat ve montaj işleri için Bosch profesyonel darbeli matkap. Uç seti ve taşıma çantasıyla birlikte kiralanır.",
    categorySlug: "elektrikli-aletler",
    brand: "Bosch",
    model: "GSB 13 RE",
    condition: "good",
    riskLevel: "medium",
    dailyPrice: 120,
    weeklyPrice: 700,
    depositAmount: 500,
    deliveryMethod: "both",
    city: "Ankara",
    district: "Çankaya",
    accessories: [{ name: "Matkap Ucu Seti" }, { name: "Taşıma Çantası" }],
    images: ["drill-a", "drill-b"],
  },
  {
    title: "Epson Ev Sinema Projeksiyon Cihazı",
    description:
      "Full HD çözünürlükte, parlak ve net görüntü sunan ev sinema projeksiyonu. Film geceleri ve sunumlar için idealdir. HDMI kablo dahildir.",
    categorySlug: "projeksiyon",
    brand: "Epson",
    model: "EH-TW740",
    condition: "like_new",
    riskLevel: "medium",
    dailyPrice: 200,
    weeklyPrice: 1100,
    depositAmount: 1500,
    deliveryMethod: "delivery",
    city: "İzmir",
    district: "Bornova",
    accessories: [{ name: "HDMI Kablo" }, { name: "Projeksiyon Perdesi" }],
    images: ["projector-a", "projector-b"],
  },
  {
    title: "PlayStation 5 + 2 Kol",
    description:
      "Sıfır ayarında PS5, iki DualSense kol ve birkaç popüler oyunla birlikte kiralanır. Arkadaş buluşmaları ve etkinlikler için harika.",
    categorySlug: "oyun-konsollari",
    brand: "Sony",
    model: "PlayStation 5",
    condition: "new",
    riskLevel: "medium",
    dailyPrice: 250,
    weeklyPrice: 1400,
    depositAmount: 3000,
    deliveryMethod: "both",
    city: "İstanbul",
    district: "Beşiktaş",
    accessories: [{ name: "Ekstra DualSense Kol" }, { name: "FIFA 24" }, { name: "Spider-Man 2" }],
    images: ["ps5-a", "ps5-b"],
  },
  {
    title: "Profesyonel Spin Bike",
    description:
      "Ev egzersizleri için ayarlanabilir dirençli, sessiz çalışan spin bike. Kısa süreli antrenman programları için ideal.",
    categorySlug: "spor-ekipmanlari",
    condition: "good",
    riskLevel: "low",
    dailyPrice: 90,
    weeklyPrice: 500,
    depositAmount: 400,
    deliveryMethod: "pickup",
    city: "Antalya",
    district: "Muratpaşa",
    images: ["spinbike-a", "spinbike-b"],
  },
  {
    title: "LED Parti Aydınlatma ve Ses Sistemi",
    description:
      "Doğum günü, kutlama ve küçük organizasyonlar için LED sahne aydınlatması ve taşınabilir ses sistemi seti.",
    categorySlug: "organizasyon-parti-ekipmanlari",
    condition: "good",
    riskLevel: "low",
    dailyPrice: 300,
    weeklyPrice: 1600,
    depositAmount: 1000,
    deliveryMethod: "both",
    city: "İstanbul",
    district: "Şişli",
    images: ["party-a", "party-b"],
  },
  {
    title: "Yamaha Akustik Gitar",
    description:
      "Yeni başlayanlar ve etkinlikler için ideal, temiz sesli Yamaha akustik gitar. Kılıf ve akort cihazıyla birlikte teslim edilir.",
    categorySlug: "muzik-ekipmanlari",
    brand: "Yamaha",
    model: "FG800",
    condition: "like_new",
    riskLevel: "medium",
    dailyPrice: 100,
    weeklyPrice: 550,
    depositAmount: 800,
    deliveryMethod: "pickup",
    city: "Bursa",
    district: "Nilüfer",
    accessories: [{ name: "Gitar Kılıfı" }, { name: "Akort Cihazı" }],
    images: ["guitar-a", "guitar-b"],
  },
  {
    title: "Samsonite Kabin Boy Valiz",
    description:
      "Hafif ve dayanıklı, dört tekerlekli kabin boy valiz. Kısa seyahatler için idealdir, hiçbir çizik veya kırık yoktur.",
    categorySlug: "valiz",
    brand: "Samsonite",
    condition: "good",
    riskLevel: "low",
    dailyPrice: 60,
    weeklyPrice: 300,
    depositAmount: 200,
    deliveryMethod: "pickup",
    city: "İstanbul",
    district: "Maltepe",
    images: ["suitcase-a", "suitcase-b"],
  },
  {
    title: "Trek Dağ Bisikleti",
    description:
      "Arazi ve şehir kullanımına uygun, 21 vitesli Trek dağ bisikleti. Fren ve vites ayarları yeni yapıldı.",
    categorySlug: "bisiklet",
    brand: "Trek",
    model: "Marlin 7",
    condition: "good",
    riskLevel: "medium",
    dailyPrice: 150,
    weeklyPrice: 800,
    depositAmount: 1200,
    deliveryMethod: "both",
    city: "İzmir",
    district: "Karşıyaka",
    images: ["bike-a", "bike-b"],
  },
  {
    title: "Karcher Yüksek Basınçlı Yıkama Makinesi",
    description:
      "Araç, bahçe ve balkon temizliği için güçlü Karcher yüksek basınçlı yıkama makinesi. Hortum ve uçlarıyla birlikte kiralanır.",
    categorySlug: "ev-aletleri",
    brand: "Karcher",
    condition: "good",
    riskLevel: "low",
    dailyPrice: 100,
    weeklyPrice: 550,
    depositAmount: 400,
    deliveryMethod: "both",
    city: "Kocaeli",
    district: "İzmit",
    images: ["karcher-a", "karcher-b"],
  },
];

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

async function getOwnerToken() {
  try {
    const { accessToken } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: OWNER.email, password: OWNER.password }),
    });
    console.log("Reusing existing demo owner account.");
    return accessToken;
  } catch {
    const { accessToken } = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(OWNER),
    });
    console.log("Created new demo owner account.");
    return accessToken;
  }
}

async function fetchImage(seed) {
  const res = await fetch(`https://picsum.photos/seed/${seed}/900/675`);
  if (!res.ok) throw new Error(`Failed to fetch placeholder image for seed ${seed}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const token = await getOwnerToken();
  const { categories } = await api("/api/categories");
  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  for (const def of ITEMS) {
    const categoryId = categoryBySlug[def.categorySlug];
    if (!categoryId) {
      console.warn(`Skipping "${def.title}" — unknown category slug "${def.categorySlug}"`);
      continue;
    }

    const { item } = await api("/api/items", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: def.title,
        description: def.description,
        categoryId,
        brand: def.brand,
        model: def.model,
        condition: def.condition,
        riskLevel: def.riskLevel,
        dailyPrice: def.dailyPrice,
        weeklyPrice: def.weeklyPrice,
        depositAmount: def.depositAmount,
        deliveryMethod: def.deliveryMethod,
        city: def.city,
        district: def.district,
        status: "active",
        accessories: def.accessories ?? [],
      }),
    });

    const form = new FormData();
    for (const seed of def.images) {
      const bytes = await fetchImage(seed);
      form.append("images", new Blob([bytes], { type: "image/jpeg" }), `${seed}.jpg`);
    }
    const uploadRes = await fetch(`${API_URL}/api/items/${item.id}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!uploadRes.ok) {
      throw new Error(`Image upload failed for "${def.title}": ${uploadRes.status} ${await uploadRes.text()}`);
    }

    console.log(`Created "${def.title}" (${def.images.length} photos)`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
