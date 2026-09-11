"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createReview, listRentalReviews, type Review } from "@/lib/api/reviews";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

function Stars({ rating }: { rating: number }) {
  return <span className="text-amber-500">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>;
}

export function ReviewSection({ rentalId, isCompleted, viewerId }: { rentalId: string; isCompleted: boolean; viewerId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { reviews } = await listRentalReviews(rentalId);
      setReviews(reviews);
    } finally {
      setIsLoading(false);
    }
  }, [rentalId]);

  useEffect(() => {
    async function run() {
      if (!isCompleted) {
        setIsLoading(false);
        return;
      }
      await load();
    }
    run();
  }, [isCompleted, load]);

  if (!isCompleted || isLoading) return null;

  const myReview = reviews.find((r) => r.reviewerId === viewerId);
  const otherReview = reviews.find((r) => r.reviewerId !== viewerId);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createReview(rentalId, { rating, comment: comment || undefined });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Değerlendirme gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-stone-900">Değerlendirme</h3>

      {myReview ? (
        <div className="mt-2 rounded-xl bg-stone-50 p-3">
          <div className="flex items-center justify-between">
            <Stars rating={myReview.rating!} />
            <span className="text-xs text-stone-400">{formatDate(myReview.createdAt)}</span>
          </div>
          {myReview.comment && <p className="mt-1 text-sm text-stone-600">{myReview.comment}</p>}
          <p className="mt-1 text-xs text-stone-400">Senin değerlendirmen</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`text-2xl ${n <= rating ? "text-amber-500" : "text-stone-300"}`}
                aria-label={`${n} yıldız`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Deneyimini paylaş (opsiyonel)"
            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-fit rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            Değerlendirmeyi Gönder
          </button>
        </form>
      )}

      <div className="mt-3 border-t border-stone-100 pt-3">
        {otherReview ? (
          otherReview.revealed ? (
            <div className="rounded-xl bg-stone-50 p-3">
              <div className="flex items-center justify-between">
                <Stars rating={otherReview.rating!} />
                <span className="text-xs text-stone-400">{formatDate(otherReview.createdAt)}</span>
              </div>
              {otherReview.comment && <p className="mt-1 text-sm text-stone-600">{otherReview.comment}</p>}
              <p className="mt-1 text-xs text-stone-400">Karşı tarafın değerlendirmesi</p>
            </div>
          ) : (
            <p className="text-sm text-stone-500">
              Karşı taraf değerlendirme yaptı — sen de değerlendirme yaptığında görünür olacak.
            </p>
          )
        ) : (
          <p className="text-sm text-stone-500">Karşı taraf henüz değerlendirme yapmadı.</p>
        )}
      </div>
    </section>
  );
}
