"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MonthlyEarningsChart } from "@/components/dashboard/MonthlyEarningsChart";
import { getEarnings, type Earnings } from "@/lib/api/owner";
import { formatPrice } from "@/lib/format";

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-surface p-5">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export default function EarningsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;
    let cancelled = false;
    getEarnings()
      .then((res) => !cancelled && setEarnings(res.earnings))
      .catch(() => !cancelled && setError("Kazanç bilgileri yüklenemedi."));
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  if (authLoading || !user || (!earnings && !error)) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="text-sm text-stone-500 hover:text-stone-700">
        ← Profilim
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">Kazançlarım</h1>
      <p className="mt-1 text-sm text-stone-600">
        Tutarlar kiralama kayıtlarından hesaplanır ve platform hizmet bedeli hariçtir. Ödeme sistemi henüz bağlı olmadığı için
        gerçek bir para hareketini göstermez.
      </p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {earnings && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Toplam kazanç"
              value={formatPrice(earnings.totals.earned, earnings.currency)}
              hint={`${earnings.totals.completedCount} tamamlanan kiralama`}
            />
            <StatTile
              label="Beklenen"
              value={formatPrice(earnings.totals.upcoming, earnings.currency)}
              hint={`${earnings.totals.inProgressCount} devam eden kiralama`}
            />
            <StatTile label="Tamamlanan kiralama" value={String(earnings.totals.completedCount)} />
            <StatTile
              label="Bekleyen talep"
              value={String(earnings.totals.pendingCount)}
              hint={earnings.totals.pendingCount > 0 ? "Yanıtını bekliyor" : undefined}
            />
          </div>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-surface p-6">
            <h2 className="text-sm font-semibold text-stone-900">Son 6 ayda tamamlanan kiralamalardan kazanç</h2>
            <div className="mt-6">
              <MonthlyEarningsChart months={earnings.months} currency={earnings.currency} />
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-surface p-6">
            <h2 className="text-sm font-semibold text-stone-900">İlanlara göre</h2>
            {earnings.items.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">
                Henüz ilanın yok.{" "}
                <Link href="/items/new" className="font-medium text-rose-600 hover:text-rose-700">
                  İlk ilanını ver
                </Link>
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                      <th className="py-2 pr-4 font-medium">İlan</th>
                      <th className="py-2 pr-4 text-right font-medium">Kiralama</th>
                      <th className="py-2 pr-4 text-right font-medium">Kiralanan gün</th>
                      <th className="py-2 text-right font-medium">Kazanç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.items.map((item) => (
                      <tr key={item.id} className="border-b border-stone-100 last:border-0">
                        <td className="py-2.5 pr-4">
                          <Link href={`/items/${item.id}`} className="font-medium text-stone-900 hover:underline">
                            {item.title}
                          </Link>
                          {item.status !== "active" && <span className="ml-2 text-xs text-stone-400">yayında değil</span>}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-stone-700">{item.completedCount}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-stone-700">{item.rentedDays}</td>
                        <td className="py-2.5 text-right font-medium tabular-nums text-stone-900">
                          {formatPrice(item.earned, earnings.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
