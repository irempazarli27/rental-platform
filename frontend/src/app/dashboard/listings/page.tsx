"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { deleteItem, myListings, updateItem, type ItemSummary } from "@/lib/api/items";
import { ApiError } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  active: "Yayında",
  paused: "Pasif",
};

export default function MyListingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<ItemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { items } = await myListings();
      setItems(items);
    } catch {
      setError("İlanlar yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;

    async function run() {
      await load();
    }
    run();
  }, [authLoading, user, router, load]);

  async function toggleStatus(item: ItemSummary) {
    setBusyId(item.id);
    setError(null);
    try {
      await updateItem(item.id, { status: item.status === "active" ? "paused" : "active" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Durum güncellenemedi.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: ItemSummary) {
    if (!window.confirm(`"${item.title}" ilanını silmek istediğine emin misin?`)) return;
    setBusyId(item.id);
    setError(null);
    try {
      await deleteItem(item.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İlan silinemedi.");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || isLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">İlanlarım</h1>
        <Link
          href="/items/new"
          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Yeni İlan
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <p className="mt-8 text-sm text-stone-500">Henüz bir ilanın yok.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <Link href={`/items/${item.id}`} className="block truncate text-sm font-medium text-stone-900 hover:underline">
                  {item.title}
                </Link>
                <p className="text-xs text-stone-500">
                  {STATUS_LABELS[item.status] ?? item.status} · {formatPrice(item.dailyPrice, item.currency)} / gün
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/items/${item.id}/edit`}
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
                >
                  Düzenle
                </Link>
                {item.status !== "draft" && (
                  <button
                    disabled={busyId === item.id}
                    onClick={() => toggleStatus(item)}
                    className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
                  >
                    {item.status === "active" ? "Pasife Al" : "Yayına Al"}
                  </button>
                )}
                <button
                  disabled={busyId === item.id}
                  onClick={() => remove(item)}
                  className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
