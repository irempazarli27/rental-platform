"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReviewSummaryCard } from "@/components/ReviewSummaryCard";
import { listUserReviews, type PublicReview } from "@/lib/api/reviews";
import { getPublicProfile, type PublicUserDto } from "@/lib/api/users";
import { formatDate } from "@/lib/format";

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating} / 5`}>
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

/**
 * The latest public reviews about one user, with the AI summary when there is
 * one, and a link to the full list on their profile. Renders nothing until
 * loaded, and nothing at all when `hideWhenEmpty` and there are no reviews.
 */
export function ReviewsPreview({
  userId,
  title,
  limit = 3,
  hideWhenEmpty = false,
  emptyText = "Henüz değerlendirme yok.",
}: {
  userId: string;
  title: string;
  limit?: number;
  hideWhenEmpty?: boolean;
  emptyText?: string;
}) {
  const [data, setData] = useState<{ reviews: PublicReview[]; profile: PublicUserDto | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listUserReviews(userId).then((r) => r.reviews),
      getPublicProfile(userId)
        .then((r) => r.user)
        .catch(() => null),
    ])
      .then(([reviews, profile]) => !cancelled && setData({ reviews, profile }))
      .catch(() => !cancelled && setData({ reviews: [], profile: null }));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!data || (hideWhenEmpty && data.reviews.length === 0)) return null;
  const { reviews, profile } = data;
  const allHref = `/profile/${userId}#degerlendirmeler`;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
        {reviews.length > 0 && (
          <Link href={allHref} className="shrink-0 text-sm font-medium text-stone-700 underline">
            Tümünü gör ({reviews.length})
          </Link>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">{emptyText}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {profile && profile.ratingCount > 0 && (
            <p className="text-sm text-stone-700">
              <Stars rating={Math.round(profile.ratingAvg)} />{" "}
              <span className="font-medium">{profile.ratingAvg.toFixed(1)}</span>
              <span className="text-stone-500"> · {profile.ratingCount} değerlendirme</span>
            </p>
          )}
          {profile?.reviewSummary && <ReviewSummaryCard summary={profile.reviewSummary} />}
          {reviews.slice(0, limit).map((review) => (
            <div key={review.id} className="rounded-2xl border border-stone-200 bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-stone-900">{review.reviewer?.fullName ?? "Kullanıcı"}</span>
                  <Stars rating={review.rating} />
                </div>
                <span className="shrink-0 text-xs text-stone-400">{formatDate(review.createdAt)}</span>
              </div>
              {review.comment && <p className="mt-2 text-sm text-stone-600">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
