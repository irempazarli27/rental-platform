"use client";

import { useEffect, useState } from "react";
import { ReviewSummaryCard } from "@/components/ReviewSummaryCard";
import { listItemReviews, type ItemReviews as ItemReviewsData } from "@/lib/api/reviews";
import { ReviewCard, Stars } from "./ReviewCard";

const INITIAL = 5;

/** What renters said about this particular listing: rating, AI summary, and the reviews themselves. */
export function ItemReviews({ itemId }: { itemId: string }) {
  const [data, setData] = useState<ItemReviewsData | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listItemReviews(itemId)
      .then((d) => !cancelled && setData(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  if (!data) return null;
  const visible = showAll ? data.reviews : data.reviews.slice(0, INITIAL);

  return (
    <section id="urun-degerlendirmeleri" className="scroll-mt-24">
      <h2 className="text-sm font-semibold text-stone-900">Bu ürünün değerlendirmeleri</h2>
      {data.ratingCount === 0 ? (
        <p className="mt-2 text-sm text-stone-500">Bu ürün için henüz değerlendirme yok.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-stone-700">
            <Stars rating={Math.round(data.ratingAvg)} /> <span className="font-medium">{data.ratingAvg.toFixed(1)}</span>
            <span className="text-stone-500"> · {data.ratingCount} değerlendirme</span>
          </p>
          {data.summary && <ReviewSummaryCard summary={data.summary} />}
          {visible.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
          {data.reviews.length > INITIAL && !showAll && (
            <button onClick={() => setShowAll(true)} className="self-start text-sm font-medium text-stone-700 underline">
              Tüm değerlendirmeleri göster ({data.reviews.length})
            </button>
          )}
        </div>
      )}
    </section>
  );
}
