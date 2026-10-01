"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createDamageReport, listDamageReports, type DamageReport } from "@/lib/api/damage";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

const SEVERITY_LABELS: Record<string, string> = { minor: "Hafif", moderate: "Orta", severe: "Ciddi" };

export function DamageReports({ rentalId }: { rentalId: string }) {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"minor" | "moderate" | "severe">("minor");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { reports } = await listDamageReports(rentalId);
      setReports(reports);
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
      await createDamageReport(rentalId, { description, severity });
      setDescription("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bildirim gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;

  return (
    <section className="rounded-2xl border border-stone-200 bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-900">Hasar Bildirimleri</h3>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="text-xs font-medium text-stone-700 underline">
            Hasar Bildir
          </button>
        )}
      </div>

      {reports.length === 0 && !showForm && <p className="mt-2 text-sm text-stone-500">Bildirilen hasar yok.</p>}

      <div className="mt-2 flex flex-col gap-2">
        {reports.map((r) => (
          <div key={r.id} className="rounded-xl bg-stone-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-stone-900">{SEVERITY_LABELS[r.severity]}</span>
              <span className="text-xs text-stone-400">{formatDate(r.createdAt)}</span>
            </div>
            <p className="mt-1 text-stone-600">{r.description}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
          <textarea
            required
            minLength={5}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Hasarı açıkla..."
            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as typeof severity)}
            className="w-fit rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
          >
            <option value="minor">Hafif</option>
            <option value="moderate">Orta</option>
            <option value="severe">Ciddi</option>
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Gönder
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
    </section>
  );
}
