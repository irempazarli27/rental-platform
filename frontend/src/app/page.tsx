import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ItemCard } from "@/components/items/ItemCard";
import type { Category } from "@/lib/api/categories";
import type { ItemSummary } from "@/lib/api/items";

// Server-side rendering runs inside the frontend container, so it talks to the
// backend over the internal Docker network directly rather than going out
// through the public HTTPS origin and back in.
const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function getHomeData(): Promise<{ categories: Category[]; items: ItemSummary[] }> {
  try {
    const [categoriesRes, itemsRes] = await Promise.all([
      fetch(`${API_URL}/api/categories`, { cache: "no-store" }),
      fetch(`${API_URL}/api/items?pageSize=8`, { cache: "no-store" }),
    ]);
    const categoriesBody = categoriesRes.ok ? await categoriesRes.json() : { categories: [] };
    const itemsBody = itemsRes.ok ? await itemsRes.json() : { items: [] };
    return { categories: categoriesBody.categories, items: itemsBody.items };
  } catch {
    return { categories: [], items: [] };
  }
}

export default async function HomePage() {
  const { categories, items } = await getHomeData();

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-50 via-stone-50 to-stone-50">
        <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            İhtiyacın olan eşyayı satın alma, güvenle kirala.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-stone-600">
            Kamera, kamp ekipmanı, elektrikli alet ve daha fazlası — teslim ve iade süreci
            fotoğraf/video kayıtlarıyla güvence altında.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700"
            >
              Eşya Ara
            </Link>
            <Link
              href="/items/new"
              className="rounded-full border border-stone-300 bg-surface px-6 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Eşyanı Kiraya Ver
            </Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-xl font-semibold text-stone-900">Popüler Kategoriler</h2>
          <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/search?categoryId=${category.id}`}
                className="group flex shrink-0 flex-col items-center gap-2.5 rounded-2xl border border-stone-200 bg-surface px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 group-hover:bg-rose-100">
                  <CategoryIcon icon={category.icon} className="h-5 w-5" />
                </span>
                <span className="whitespace-nowrap text-xs font-medium text-stone-700">{category.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-stone-900">Öne Çıkan İlanlar</h2>
            <Link
              href="/search"
              className="flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
            >
              Tümünü gör <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
