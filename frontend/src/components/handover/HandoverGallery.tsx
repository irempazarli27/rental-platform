import type { HandoverRecord } from "@/lib/api/handover";
import { STEP_ORDER, STEP_LABELS } from "./steps";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function HandoverGallery({ title, record }: { title: string; record: HandoverRecord | null }) {
  if (!record) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4">
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
        <p className="mt-1 text-sm text-stone-500">Henüz belge yok.</p>
      </div>
    );
  }

  const steps = STEP_ORDER.filter((step) => (record.mediaByStep[step]?.length ?? 0) > 0);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
        {record.status === "completed" ? (
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Onaylandı</span>
        ) : (
          <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Onay bekliyor</span>
        )}
      </div>
      {record.conditionNotes && <p className="mt-2 text-xs text-stone-600">Not: {record.conditionNotes}</p>}
      <div className="mt-3 flex flex-col gap-3">
        {steps.map((step) => (
          <div key={step}>
            <p className="text-xs font-medium text-stone-500">{STEP_LABELS[step]}</p>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {record.mediaByStep[step]!.map((m) =>
                m.mediaType === "video" ? (
                  <video key={m.id} src={`${API_URL}${m.url}`} controls className="aspect-square w-full rounded-xl bg-black object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={`${API_URL}${m.url}`} alt={STEP_LABELS[step]} className="aspect-square w-full rounded-xl object-cover" />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
