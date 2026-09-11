"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAdminDisputes, type AdminDisputeSummary } from "@/lib/api/admin";
import { formatDate } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  open: "Açık",
  under_review: "İnceleniyor",
  resolved_favor_owner: "Sahip lehine",
  resolved_favor_renter: "Kiracı lehine",
  resolved_split: "Paylaştırıldı",
};

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<AdminDisputeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function run() {
      try {
        const { disputes } = await listAdminDisputes();
        setDisputes(disputes);
      } finally {
        setIsLoading(false);
      }
    }
    run();
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Uyuşmazlıklar</h1>

      {isLoading ? (
        <p className="mt-6 text-sm text-zinc-500">Yükleniyor...</p>
      ) : disputes.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">Uyuşmazlık kaydı yok.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {disputes.map((d) => (
            <Link
              key={d.id}
              href={`/admin/disputes/${d.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">{d.itemTitle ?? "İlan"}</p>
                <p className="truncate text-xs text-zinc-500">{d.reason}</p>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    d.status === "open" || d.status === "under_review"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {STATUS_LABELS[d.status] ?? d.status}
                </span>
                <p className="mt-1 text-xs text-zinc-400">{formatDate(d.createdAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
