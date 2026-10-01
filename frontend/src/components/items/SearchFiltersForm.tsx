"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import type { Category } from "@/lib/api/categories";
import { TURKISH_CITIES } from "@/lib/turkishCities";

export interface SearchFilters {
  q: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  city: string;
}

const fieldClasses =
  "rounded-xl border border-stone-300 bg-surface px-3 py-2.5 text-sm text-stone-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100";

export function SearchFiltersForm({
  initial,
  categories,
  onSubmit,
}: {
  initial: SearchFilters;
  categories: Category[];
  onSubmit: (filters: SearchFilters) => void;
}) {
  const [formState, setFormState] = useState(initial);
  const sortedCities = useMemo(() => [...TURKISH_CITIES].sort((a, b) => a.localeCompare(b, "tr")), []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(formState);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 rounded-2xl border border-stone-200 bg-surface p-4 shadow-sm sm:grid-cols-6"
    >
      <input
        type="text"
        placeholder="Ne arıyorsun?"
        value={formState.q}
        onChange={(e) => setFormState((s) => ({ ...s, q: e.target.value }))}
        className={`col-span-2 ${fieldClasses} sm:col-span-2`}
      />
      <select
        value={formState.categoryId}
        onChange={(e) => setFormState((s) => ({ ...s, categoryId: e.target.value }))}
        className={`col-span-2 ${fieldClasses} sm:col-span-1`}
      >
        <option value="">Tüm Kategoriler</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        placeholder="Min ₺/gün"
        value={formState.minPrice}
        onChange={(e) => setFormState((s) => ({ ...s, minPrice: e.target.value }))}
        className={fieldClasses}
      />
      <input
        type="number"
        min={0}
        placeholder="Maks ₺/gün"
        value={formState.maxPrice}
        onChange={(e) => setFormState((s) => ({ ...s, maxPrice: e.target.value }))}
        className={fieldClasses}
      />
      <select
        value={formState.city}
        onChange={(e) => setFormState((s) => ({ ...s, city: e.target.value }))}
        className={`col-span-2 ${fieldClasses} sm:col-span-1`}
      >
        <option value="">Tüm Şehirler</option>
        {sortedCities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 sm:col-span-6"
      >
        <Search className="h-4 w-4" strokeWidth={2} />
        Ara
      </button>
    </form>
  );
}
