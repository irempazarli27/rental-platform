import { ShieldCheck } from "lucide-react";
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
