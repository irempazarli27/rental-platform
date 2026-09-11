"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getHandoverSummary,
  markHandoverReady,
  uploadHandoverMedia,
  type HandoverPhase,
  type HandoverSummary,
} from "@/lib/api/handover";
import { ApiError } from "@/lib/api/client";
import { STEP_LABELS, buildWizardSteps } from "./steps";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function HandoverWizard({ rentalId, phase }: { rentalId: string; phase: HandoverPhase }) {
  const router = useRouter();

  const [summary, setSummary] = useState<HandoverSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await getHandoverSummary(rentalId);
      setSummary(data);
    } catch {
      setLoadError("Teslim bilgileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [rentalId]);

  useEffect(() => {
    async function run() {
      await load();
    }
    run();
  }, [load]);

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Yükleniyor...</p>;
  }

  if (loadError || !summary) {
    return <p className="text-sm text-red-600">{loadError ?? "Bir hata oluştu."}</p>;
  }

  const wizardSteps = buildWizardSteps(summary.requiredSteps);
  const record = phase === "pickup" ? summary.pickup : summary.return;
  const current = wizardSteps[stepIndex];
  const isLastStep = stepIndex === wizardSteps.length - 1;
  const existingMedia = current ? record?.mediaByStep[current.step] ?? [] : [];

  const allRequiredDone = wizardSteps
    .filter((s) => s.required)
    .every((s) => (record?.mediaByStep[s.step]?.length ?? 0) > 0);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !current) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadHandoverMedia(rentalId, phase, current.step, file);
      await load();
      if (!isLastStep) setStepIndex((i) => i + 1);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Yükleme başarısız oldu.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleFinish() {
    setFinishing(true);
    setFinishError(null);
    try {
      await markHandoverReady(rentalId, phase, notes || undefined);
      router.push(`/dashboard/rentals/${rentalId}`);
    } catch (err) {
      setFinishError(err instanceof ApiError ? err.message : "Tamamlanamadı.");
      setFinishing(false);
    }
  }

  if (!current) {
    return <p className="text-sm text-zinc-500">Bu eşya için gösterilecek adım yok.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {wizardSteps.map((s, i) => {
          const done = (record?.mediaByStep[s.step]?.length ?? 0) > 0;
          return (
            <button
              key={s.step}
              onClick={() => setStepIndex(i)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                i === stepIndex
                  ? "bg-zinc-900 text-white"
                  : done
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {done ? "✓ " : ""}
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
        <p className="text-xs font-medium text-zinc-500">
          Adım {stepIndex + 1} / {wizardSteps.length}
          {!current.required && " (opsiyonel)"}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-900">{STEP_LABELS[current.step]}</h2>

        {existingMedia.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {existingMedia.map((m) =>
              m.mediaType === "video" ? (
                <video key={m.id} src={`${API_URL}${m.url}`} controls className="aspect-square w-full rounded-md bg-black object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={m.id} src={`${API_URL}${m.url}`} alt={STEP_LABELS[current.step]} className="aspect-square w-full rounded-md object-cover" />
              ),
            )}
          </div>
        )}

        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept={current.step === "VIDEO" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp"}
            capture="environment"
            disabled={uploading}
            onChange={handleFileChange}
            className="text-sm text-zinc-600"
          />
          {uploading && <p className="mt-1 text-xs text-zinc-500">Yükleniyor...</p>}
          {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
          >
            Önceki
          </button>
          <button
            disabled={isLastStep}
            onClick={() => setStepIndex((i) => Math.min(wizardSteps.length - 1, i + 1))}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
          >
            Sonraki
          </button>
        </div>
      </div>

      {allRequiredDone && (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
          <label htmlFor="handover-notes" className="block text-sm font-medium text-zinc-700">
            Ek not (opsiyonel)
          </label>
          <textarea
            id="handover-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Örn: Sağ alt köşede küçük bir çizik mevcut."
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
          {finishError && <p className="mt-2 text-sm text-red-600">{finishError}</p>}
          <button
            disabled={finishing}
            onClick={handleFinish}
            className="mt-3 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {finishing
              ? "Kaydediliyor..."
              : phase === "pickup"
                ? "Teslim Belgelerini Tamamla"
                : "İade Belgelerini Tamamla"}
          </button>
        </div>
      )}
    </div>
  );
}
