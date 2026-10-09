import { Sparkles } from "lucide-react";

export interface ReviewSummary {
  summary: string;
  positives: string[];
  negatives: string[];
}

/** AI-written digest of a user's public reviews, labelled as such so it's never mistaken for a review. */
export function ReviewSummaryCard({ summary }: { summary: ReviewSummary }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        Yorumların özeti · Yapay zeka
      </p>
      <p className="mt-2 text-sm text-stone-700">{summary.summary}</p>
      {(summary.positives.length > 0 || summary.negatives.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {summary.positives.map((p) => (
            <span key={`+${p}`} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              {p}
            </span>
          ))}
          {summary.negatives.map((n) => (
            <span key={`-${n}`} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              {n}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-stone-400">Bu özet aşağıdaki yorumlardan otomatik oluşturulur ve hata içerebilir.</p>
    </div>
  );
}
