"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { addDisputeEvidence, listRentalDisputes, openDispute, type Dispute } from "@/lib/api/disputes";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const STATUS_LABELS: Record<Dispute["status"], string> = {
  open: "Açık",
  under_review: "İnceleniyor",
  resolved_favor_owner: "Eşya sahibi lehine sonuçlandı",
  resolved_favor_renter: "Kiracı lehine sonuçlandı",
  resolved_split: "Kısmen paylaştırıldı",
};

export function DisputeSection({
  rentalId,
  canOpen,
  onOpened,
}: {
  rentalId: string;
  canOpen: boolean;
  onOpened?: () => void;
}) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const { disputes } = await listRentalDisputes(rentalId);
      setDisputes(disputes);
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await openDispute(rentalId, reason);
      setShowForm(false);
      setReason("");
      await load();
      onOpened?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Uyuşmazlık açılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEvidenceUpload(disputeId: string, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingId(disputeId);
    try {
      await addDisputeEvidence(disputeId, file);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kanıt yüklenemedi.");
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (isLoading) return null;

  const activeDispute = disputes.find((d) => d.status === "open" || d.status === "under_review");
  const resolvedDisputes = disputes.filter((d) => d.status !== "open" && d.status !== "under_review");

  if (disputes.length === 0 && !canOpen) return null;

  return (
    <section className="rounded-2xl border border-stone-200 bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-900">Uyuşmazlık</h3>
        {canOpen && !activeDispute && !showForm && (
          <button onClick={() => setShowForm(true)} className="text-xs font-medium text-red-600 underline">
            Uyuşmazlık Aç
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
          <textarea
            required
            minLength={10}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sorunu açıkla (ör. iade edilen üründe yeni hasar var)..."
            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Uyuşmazlığı Başlat
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}

      {activeDispute && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800">{STATUS_LABELS[activeDispute.status]}</p>
          <p className="mt-1 text-sm text-stone-700">{activeDispute.reason}</p>
          <p className="mt-1 text-xs text-stone-400">{formatDate(activeDispute.createdAt)}</p>

          {activeDispute.evidence.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {activeDispute.evidence.map((e) => (
                <div key={e.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${API_URL}${e.mediaUrl}`} alt={e.description ?? "Kanıt"} className="aspect-square w-full rounded-xl object-cover" />
                  {e.description && <p className="mt-1 text-xs text-stone-500">{e.description}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              disabled={uploadingId === activeDispute.id}
              onChange={(e) => handleEvidenceUpload(activeDispute.id, e.target.files)}
              className="text-sm text-stone-600"
            />
            <p className="mt-1 text-xs text-stone-500">Kanıt olarak fotoğraf/video ekleyebilirsin. Bir admin bu kaydı inceleyecek.</p>
          </div>
        </div>
      )}

      {resolvedDisputes.map((d) => (
        <div key={d.id} className="mt-3 rounded-xl bg-stone-50 p-3">
          <p className="text-sm font-medium text-stone-900">{STATUS_LABELS[d.status]}</p>
          <p className="mt-1 text-sm text-stone-600">{d.reason}</p>
          {d.resolutionNotes && <p className="mt-1 text-sm text-stone-500">Admin notu: {d.resolutionNotes}</p>}
        </div>
      ))}
    </section>
  );
}
