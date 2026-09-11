"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createRentalRequest } from "@/lib/api/rentals";
import { ApiError } from "@/lib/api/client";
import { computePricingPreview } from "@/lib/pricing";
import { formatPrice } from "@/lib/format";

export function RentalRequestForm({
  itemId,
  dailyPrice,
  weeklyPrice,
  depositAmount,
  currency,
  isLoggedIn,
}: {
  itemId: string;
  dailyPrice: string;
  weeklyPrice: string | null;
  depositAmount: string;
  currency: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = computePricingPreview(
    Number(dailyPrice),
    weeklyPrice ? Number(weeklyPrice) : null,
    Number(depositAmount),
    startDate,
    endDate,
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { rental } = await createRentalRequest({ itemId, startDate, endDate });
      router.push(`/dashboard/rentals/${rental.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kiralama talebi gönderilemedi.");
      setSubmitting(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="mt-5 block rounded-full bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-rose-700"
      >
        Kiralamak için giriş yap
      </Link>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 border-t border-stone-100 pt-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="rental-start" className="block text-xs font-medium text-stone-700">
            Başlangıç
          </label>
          <input
            id="rental-start"
            type="date"
            required
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-stone-300 px-2 py-1.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
        </div>
        <div>
          <label htmlFor="rental-end" className="block text-xs font-medium text-stone-700">
            Bitiş
          </label>
          <input
            id="rental-end"
            type="date"
            required
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-stone-300 px-2 py-1.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
        </div>
      </div>

      {preview && (
        <dl className="mt-3 space-y-1 text-xs text-stone-600">
          <div className="flex justify-between">
            <dt>
              Kira bedeli ({preview.days} gün)
            </dt>
            <dd>{formatPrice(preview.rentalPrice, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Platform hizmet bedeli</dt>
            <dd>{formatPrice(preview.platformFee, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Güvence bedeli (iade edilir)</dt>
            <dd>{formatPrice(preview.depositAmount, currency)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-stone-900">
            <dt>Toplam</dt>
            <dd>{formatPrice(preview.totalAmount, currency)}</dd>
          </div>
        </dl>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !preview}
        className="mt-4 w-full rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {submitting ? "Gönderiliyor..." : "Kiralama Talebi Gönder"}
      </button>
      <p className="mt-2 text-center text-xs text-stone-400">
        Ödeme alınmaz — bu bir talep ve fiyat önizlemesidir, eşya sahibi onayladıktan sonra süreç başlar.
      </p>
    </form>
  );
}
