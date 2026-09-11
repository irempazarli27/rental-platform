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
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Hasar Bildirimleri</h3>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="text-xs font-medium text-zinc-700 underline">
            Hasar Bildir
          </button>
        )}
      </div>

      {reports.length === 0 && !showForm && <p className="mt-2 text-sm text-zinc-500">Bildirilen hasar yok.</p>}

      <div className="mt-2 flex flex-col gap-2">
        {reports.map((r) => (
          <div key={r.id} className="rounded-md bg-zinc-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-900">{SEVERITY_LABELS[r.severity]}</span>
              <span className="text-xs text-zinc-400">{formatDate(r.createdAt)}</span>
            </div>
            <p className="mt-1 text-zinc-600">{r.description}</p>
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
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as typeof severity)}
            className="w-fit rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
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
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Gönder
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
