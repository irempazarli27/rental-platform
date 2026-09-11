"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listAdminItems, removeAdminItem } from "@/lib/api/admin";
import type { ItemStatus, ItemSummary } from "@/lib/api/items";
import { ApiError } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = { draft: "Taslak", active: "Yayında", paused: "Pasif", deleted: "Silindi" };

export default function AdminItemsPage() {
  const [items, setItems] = useState<(ItemSummary & { ownerName: string | null })[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<ItemStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (statusFilter?: ItemStatus) => {
    setIsLoading(true);
    try {
      const { items, total } = await listAdminItems({ status: statusFilter, pageSize: 50 });
      setItems(items);
      setTotal(total);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function run() {
      await load();
    }
    run();
  }, [load]);

  async function handleRemove(item: ItemSummary) {
    const reason = window.prompt(`"${item.title}" ilanını neden kaldırıyorsun?`);
    if (!reason) return;
    setBusyId(item.id);
    setError(null);
    try {
      await removeAdminItem(item.id, reason);
      await load(status || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İşlem başarısız oldu.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">İlanlar</h1>

      <select
        value={status}
        onChange={(e) => {
          const v = e.target.value as ItemStatus | "";
          setStatus(v);
          load(v || undefined);
        }}
        className="mt-4 w-fit rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      >
        <option value="">Tüm Durumlar</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="mt-6 text-sm text-zinc-500">Yükleniyor...</p>
      ) : (
        <>
          <p className="mt-4 text-xs text-zinc-500">{total} ilan</p>
          <div className="mt-2 flex flex-col gap-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4">
                <div className="min-w-0">
                  <Link href={`/items/${item.id}`} className="truncate text-sm font-medium text-zinc-900 hover:underline">
                    {item.title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {STATUS_LABELS[item.status] ?? item.status} · {formatPrice(item.dailyPrice, item.currency)} / gün · Sahip: {item.ownerName ?? "—"}
                  </p>
                </div>
                {item.status !== "deleted" && (
                  <button
                    disabled={busyId === item.id}
                    onClick={() => handleRemove(item)}
                    className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Kaldır
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
