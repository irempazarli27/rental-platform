import Link from "next/link";
import type { PublicReview } from "@/lib/api/reviews";
import { formatDate } from "@/lib/format";

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating} / 5`}>
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

/** One public review. `showItem` names the listing it came from, for lists that mix several. */
export function ReviewCard({ review, showItem = false }: { review: PublicReview; showItem?: boolean }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {review.reviewer ? (
            <Link href={`/profile/${review.reviewer.id}`} className="truncate text-sm font-medium text-stone-900 hover:underline">
              {review.reviewer.fullName}
            </Link>
          ) : (
            <span className="text-sm font-medium text-stone-900">Kullanıcı</span>
          )}
          <Stars rating={review.rating} />
        </div>
        <span className="shrink-0 text-xs text-stone-400">{formatDate(review.createdAt)}</span>
      </div>
      {showItem && review.item && (
        <Link href={`/items/${review.item.id}`} className="mt-0.5 block truncate text-xs text-stone-500 hover:underline">
          {review.item.title} kiralaması
        </Link>
      )}
      {review.comment && <p className="mt-2 text-sm text-stone-600">{review.comment}</p>}
    </div>
  );
}
