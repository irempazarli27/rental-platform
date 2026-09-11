"use client";

import { useEffect, useState } from "react";
import { getAdminStats, type AdminStats } from "@/lib/api/admin";
import { RENTAL_STATUS_LABELS } from "@/lib/format";
import { formatPrice } from "@/lib/format";

const ITEM_STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  active: "Yayında",
  paused: "Pasif",
  deleted: "Silindi",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function run() {
      try {
        const data = await getAdminStats();
        setStats(data);
      } finally {
        setIsLoading(false);
      }
    }
    run();
  }, []);

  if (isLoading || !stats) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-stone-500">Yükleniyor...</div>;
  }

  const totalItems = Object.values(stats.itemsByStatus).reduce((a, b) => a + b, 0);
  const totalRentals = Object.values(stats.rentalsByStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-stone-900">Sistem Özeti</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Toplam Kullanıcı" value={stats.totalUsers} />
        <StatCard label="Toplam İlan" value={totalItems} />
        <StatCard label="Toplam Kiralama" value={totalRentals} />
        <StatCard label="Açık Uyuşmazlık" value={stats.openDisputes} />
      </div>

      <div className="mt-4">
        <StatCard label="Toplam Platform Komisyonu (kabul edilen kiralamalar)" value={formatPrice(stats.totalPlatformFeeRevenue)} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-900">İlan Durumları</h2>
          <dl className="mt-2 space-y-1 text-sm">
            {Object.entries(stats.itemsByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <dt className="text-stone-500">{ITEM_STATUS_LABELS[status] ?? status}</dt>
                <dd className="text-stone-900">{count}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-900">Kiralama Durumları</h2>
          <dl className="mt-2 space-y-1 text-sm">
            {Object.entries(stats.rentalsByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <dt className="text-stone-500">{RENTAL_STATUS_LABELS[status] ?? status}</dt>
                <dd className="text-stone-900">{count}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
