"use client";

import Image from "next/image";
import Link from "next/link";
import type { Rental } from "@/lib/api/rentals";
import { RENTAL_STATUS_BADGE_CLASSES, RENTAL_STATUS_LABELS, formatDate, formatPrice } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function RentalCard({
  rental,
  viewerRole,
  onAccept,
  onReject,
  onCancel,
  busy,
}: {
  rental: Rental;
  viewerRole: "renter" | "owner";
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
  busy?: boolean;
}) {
  const counterparty = viewerRole === "renter" ? rental.owner : rental.renter;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
        {rental.item?.coverImageUrl ? (
          <Image src={`${API_URL}${rental.item.coverImageUrl}`} alt={rental.item.title} fill unoptimized className="object-cover" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <Link href={`/dashboard/rentals/${rental.id}`} className="truncate text-sm font-medium text-stone-900 hover:underline">
          {rental.item?.title ?? "İlan"}
        </Link>
        <p className="text-xs text-stone-500">
          {formatDate(rental.startDate)} – {formatDate(rental.endDate)} · {counterparty?.fullName ?? "—"}
        </p>
        <p className="text-xs font-medium text-stone-700">{formatPrice(rental.totalAmount)}</p>
      </div>

      <span className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${RENTAL_STATUS_BADGE_CLASSES[rental.status]}`}>
        {RENTAL_STATUS_LABELS[rental.status]}
      </span>

      <div className="flex shrink-0 gap-2">
        {viewerRole === "owner" && rental.status === "PENDING" && (
          <>
            <button
              disabled={busy}
              onClick={() => onAccept?.(rental.id)}
              className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Kabul Et
            </button>
            <button
              disabled={busy}
              onClick={() => onReject?.(rental.id)}
              className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
            >
              Reddet
            </button>
          </>
        )}
        {((viewerRole === "renter" && (rental.status === "PENDING" || rental.status === "ACCEPTED")) ||
          (viewerRole === "owner" && rental.status === "ACCEPTED")) && (
          <button
            disabled={busy}
            onClick={() => onCancel?.(rental.id)}
            className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            İptal Et
          </button>
        )}
      </div>
    </div>
  );
}
