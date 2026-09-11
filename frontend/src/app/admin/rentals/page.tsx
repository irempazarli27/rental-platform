"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listAdminRentals } from "@/lib/api/admin";
import type { Rental, RentalStatus } from "@/lib/api/rentals";
import { RENTAL_STATUS_BADGE_CLASSES, RENTAL_STATUS_LABELS, formatDate, formatPrice } from "@/lib/format";

export default function AdminRentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<RentalStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (statusFilter?: RentalStatus) => {
    setIsLoading(true);
    try {
      const { rentals, total } = await listAdminRentals({ status: statusFilter, pageSize: 50 });
      setRentals(rentals);
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-stone-900">Kiralamalar</h1>

      <select
        value={status}
        onChange={(e) => {
          const v = e.target.value as RentalStatus | "";
          setStatus(v);
          load(v || undefined);
        }}
        className="mt-4 w-fit rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
      >
        <option value="">Tüm Durumlar</option>
        {Object.entries(RENTAL_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {isLoading ? (
        <p className="mt-6 text-sm text-stone-500">Yükleniyor...</p>
      ) : (
        <>
          <p className="mt-4 text-xs text-stone-500">{total} kiralama</p>
          <div className="mt-2 flex flex-col gap-2">
            {rentals.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/rentals/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 hover:border-stone-300"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-900">{r.item?.title ?? "İlan"}</p>
                  <p className="text-xs text-stone-500">
                    {formatDate(r.startDate)} – {formatDate(r.endDate)} · {r.renter?.fullName} → {r.owner?.fullName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${RENTAL_STATUS_BADGE_CLASSES[r.status]}`}>
                    {RENTAL_STATUS_LABELS[r.status]}
                  </span>
                  <p className="mt-1 text-xs text-stone-400">{formatPrice(r.totalAmount)}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
