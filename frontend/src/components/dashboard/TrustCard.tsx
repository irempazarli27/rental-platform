import Link from "next/link";
import { TrustBadge } from "@/components/TrustBadge";
import type { TrustInfo } from "@/lib/api/auth";

const ROWS: { key: keyof TrustInfo["breakdown"]; label: string; max: number; hint: string }[] = [
  { key: "rentals", label: "Tamamlanan kiralamalar", max: 40, hint: "Her sorunsuz kiralama +8 (en fazla 5)" },
  { key: "ratings", label: "Değerlendirmeler", max: 30, hint: "Yüksek puan ve daha çok yorum" },
  { key: "verification", label: "Doğrulama", max: 15, hint: "E-posta, telefon ve özellikle kimlik" },
  { key: "accountAge", label: "Hesap yaşı", max: 15, hint: "60 günde tam puan" },
];

export function TrustCard({ trust, verificationLevel }: { trust: TrustInfo; verificationLevel: string }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">Güven Puanın</h2>
        <TrustBadge level={trust.level} />
      </div>

      <div className="mt-4 flex items-end gap-2">
        <p className="text-4xl font-semibold text-stone-900">{trust.score}</p>
        <p className="pb-1 text-sm text-stone-500">/ 100</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-rose-600 transition-all" style={{ width: `${trust.score}%` }} />
      </div>

      <p className={`mt-3 text-sm ${trust.canRentHighRisk ? "text-emerald-700" : "text-amber-700"}`}>
        {trust.canRentHighRisk
          ? "Yüksek riskli ilanlara kiralama talebi gönderebilirsin."
          : `Yüksek riskli ilanlar için en az ${trust.highRiskMinScore} puan gerekir. Düşük riskli eşyalarla başlayıp puan kazanabilirsin.`}
      </p>

      {verificationLevel !== "id_verified" && (
        <Link
          href="/dashboard/verification"
          className="mt-3 inline-block rounded-full bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-700"
        >
          Hesabını doğrula, puan kazan
        </Link>
      )}

      <dl className="mt-4 space-y-2 border-t border-stone-100 pt-4 text-sm">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <dt className="text-stone-700">{row.label}</dt>
              <dd className="text-xs text-stone-400">{row.hint}</dd>
            </div>
            <span className="shrink-0 text-stone-900">
              {trust.breakdown[row.key]}
              <span className="text-stone-400"> / {row.max}</span>
            </span>
          </div>
        ))}
        {trust.breakdown.penalty > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-red-600">Aleyhine sonuçlanan uyuşmazlıklar</dt>
            <span className="shrink-0 text-red-600">−{trust.breakdown.penalty}</span>
          </div>
        )}
      </dl>
    </section>
  );
}
