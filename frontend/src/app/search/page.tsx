"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listCategories, type Category } from "@/lib/api/categories";
import { searchItems, type ItemSummary } from "@/lib/api/items";
import { ItemCard } from "@/components/items/ItemCard";
import { SearchFiltersForm, type SearchFilters } from "@/components/items/SearchFiltersForm";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const city = searchParams.get("city") ?? "";

  useEffect(() => {
    listCategories()
      .then(({ categories }) => setCategories(categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await searchItems({
          q: q || undefined,
          categoryId: categoryId || undefined,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          city: city || undefined,
          pageSize: 24,
        });
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      } catch {
        if (!cancelled) setError("İlanlar yüklenemedi.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [q, categoryId, minPrice, maxPrice, city]);

  function handleSubmit(filters: SearchFilters) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.minPrice) params.set("minPrice", filters.minPrice);
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
    if (filters.city) params.set("city", filters.city);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-stone-900">İlanlarda Ara</h1>

      <div className="mt-6">
        <SearchFiltersForm
          key={searchParams.toString()}
          initial={{ q, categoryId, minPrice, maxPrice, city }}
          categories={categories}
          onSubmit={handleSubmit}
        />
      </div>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-stone-500">Yükleniyor...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500">Bu kriterlere uygun ilan bulunamadı.</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-stone-500">{total} ilan bulundu</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
