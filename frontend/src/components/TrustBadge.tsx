import { Check, ShieldCheck } from "lucide-react";
import type { TrustLevel } from "@/lib/api/auth";

export const TRUST_LEVEL_LABELS: Record<TrustLevel, string> = {
  new: "Yeni",
  trusted: "Güvenilir",
  highly_trusted: "Çok güvenilir",
};

const STYLES: Record<TrustLevel, string> = {
  new: "bg-stone-100 text-stone-600",
  trusted: "bg-emerald-50 text-emerald-700",
  highly_trusted: "bg-amber-50 text-amber-700",
};

export function TrustBadge({ level, score }: { level: TrustLevel; score?: number }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[level]}`}>
      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
      {TRUST_LEVEL_LABELS[level]}
      {score !== undefined && <span className="opacity-70">· {score}</span>}
    </span>
  );
}

const LEVEL_RANK: Record<string, number> = { none: 0, email: 1, phone: 2, id_verified: 3 };

/** Which verification steps a user has completed, as small check pills. */
export function VerificationChips({ level }: { level: string }) {
  const rank = LEVEL_RANK[level] ?? 0;
  const steps = [
    { label: "E-posta", done: rank >= 1 },
    { label: "Telefon", done: rank >= 2 },
    { label: "Kimlik", done: rank >= 3 },
  ].filter((s) => s.done);
  if (steps.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {steps.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          <Check className="h-3 w-3" strokeWidth={2.5} />
          {s.label}
        </span>
      ))}
    </div>
  );
}
