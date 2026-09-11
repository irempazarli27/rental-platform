"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { getAdminDisputeDetail, resolveDispute, type AdminDisputeDetail } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatDate, formatPrice } from "@/lib/format";
import { HandoverGallery } from "@/components/handover/HandoverGallery";

const RESOLUTION_LABELS: Record<string, string> = {
  resolved_favor_owner: "Eşya sahibi lehine (güvence bedeli sahibe)",
  resolved_favor_renter: "Kiracı lehine (güvence bedeli iade)",
  resolved_split: "Paylaştır (kısmi kesinti)",
};

export default function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [detail, setDetail] = useState<AdminDisputeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<"resolved_favor_owner" | "resolved_favor_renter" | "resolved_split">(
    "resolved_favor_renter",
  );
  const [notes, setNotes] = useState("");
  const [claimedAmount, setClaimedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getAdminDisputeDetail(id);
      setDetail(data);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    async function run() {
      await load();
    }
    run();
  }, [load]);

  async function handleResolve(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await resolveDispute(id, {
        status,
        resolutionNotes: notes,
        claimedAmount: status === "resolved_split" ? Number(claimedAmount) : undefined,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sonuçlandırılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-zinc-500">Yükleniyor...</div>;
  if (!detail) return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-red-600">Uyuşmazlık bulunamadı.</div>;

  const { dispute, openedByName, rental, handover, damageReports, messages } = detail;
  const isOpen = dispute.status === "open" || dispute.status === "under_review";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-semibold text-zinc-900">Uyuşmazlık Detayı</h1>

      <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-500">
          {openedByName} tarafından açıldı — {formatDate(dispute.createdAt)}
        </p>
        <p className="mt-2 text-sm text-zinc-900">{dispute.reason}</p>
        {dispute.resolutionNotes && (
          <p className="mt-2 rounded-md bg-emerald-50 p-2 text-sm text-emerald-800">
            Sonuç: {dispute.resolutionNotes}
          </p>
        )}
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Kiralama</h2>
          <p className="mt-2 text-sm text-zinc-700">{rental.item?.title}</p>
          <p className="text-xs text-zinc-500">
            {formatDate(rental.startDate)} – {formatDate(rental.endDate)}
          </p>
          <p className="mt-2 text-sm text-zinc-700">Kiracı: {rental.renter?.fullName}</p>
          <p className="text-sm text-zinc-700">Sahip: {rental.owner?.fullName}</p>
          <p className="mt-2 text-sm font-medium text-zinc-900">Güvence bedeli: {formatPrice(rental.depositAmount)}</p>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Hasar Bildirimleri</h2>
          {damageReports.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Yok</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {damageReports.map((r) => (
                <div key={r.id} className="rounded-md bg-zinc-50 p-2 text-sm">
                  <p className="font-medium text-zinc-900">{r.severity}</p>
                  <p className="text-zinc-600">{r.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {dispute.evidence.length > 0 && (
        <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Kanıtlar</h2>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {dispute.evidence.map((e) => (
              <div key={e.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${e.mediaUrl}`}
                  alt={e.description ?? "Kanıt"}
                  className="aspect-square w-full rounded-md object-cover"
                />
                {e.description && <p className="mt-1 text-xs text-zinc-500">{e.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <HandoverGallery title="Teslim Belgeleri" record={handover.pickup} />
        <HandoverGallery title="İade Belgeleri" record={handover.return} />
      </div>

      {messages.length > 0 && (
        <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Taraf Mesajları</h2>
          <div className="mt-2 flex flex-col gap-1">
            {messages.map((m) => (
              <p key={m.id} className="text-sm text-zinc-700">
                <span className="text-xs text-zinc-400">{formatDate(m.createdAt)}:</span> {m.content}
              </p>
            ))}
          </div>
        </section>
      )}

      {isOpen && (
        <section className="mt-4 rounded-lg border border-zinc-300 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Sonuçlandır</h2>
          <form onSubmit={handleResolve} className="mt-2 flex flex-col gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-fit rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            >
              {Object.entries(RESOLUTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {status === "resolved_split" && (
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={claimedAmount}
                onChange={(e) => setClaimedAmount(e.target.value)}
                placeholder="Sahibe kesilecek tutar (₺)"
                className="w-fit rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
            )}

            <textarea
              required
              minLength={10}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Karar gerekçesi..."
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Sonuçlandır
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
