import Image from "next/image";
import Link from "next/link";
import { ItemCard } from "@/components/items/ItemCard";
import { ReviewSummaryCard, type ReviewSummary } from "@/components/ReviewSummaryCard";
import { TrustBadge, VerificationChips } from "@/components/TrustBadge";
import type { TrustLevel } from "@/lib/api/auth";
import { formatDate } from "@/lib/format";
import type { ItemSummary } from "@/lib/api/items";
import type { PublicReview } from "@/lib/api/reviews";

// See app/page.tsx for why server-rendered fetches use the internal Docker
// network address instead of the public (self-signed HTTPS) origin.
const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ProfileUser {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  ratingAvg: number;
  ratingCount: number;
  verificationLevel: string;
  memberSince: string;
  trust?: { score: number; level: TrustLevel };
  /** Null until the user has enough public reviews, or when AI is switched off. */
  reviewSummary?: ReviewSummary | null;
}

async function getProfileData(id: string) {
  const [userRes, reviewsRes, itemsRes] = await Promise.all([
    fetch(`${API_URL}/api/users/${id}`, { cache: "no-store" }),
    fetch(`${API_URL}/api/users/${id}/reviews`, { cache: "no-store" }),
    fetch(`${API_URL}/api/items?ownerId=${id}&pageSize=12`, { cache: "no-store" }),
  ]);

  if (!userRes.ok) return null;

  const user: ProfileUser = (await userRes.json()).user;
  const reviews: PublicReview[] = reviewsRes.ok ? (await reviewsRes.json()).reviews : [];
  const items: ItemSummary[] = itemsRes.ok ? (await itemsRes.json()).items : [];
  return { user, reviews, items };
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProfileData(id);

  if (!data) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-stone-500">Kullanıcı bulunamadı.</div>;
  }

  const { user, reviews, items } = data;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-4">
        {user.avatarUrl ? (
          <Image src={user.avatarUrl} alt={user.fullName} width={64} height={64} unoptimized className="rounded-full" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-200 text-xl font-medium text-stone-600">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-stone-900">{user.fullName}</h1>
            {user.trust && <TrustBadge level={user.trust.level} score={user.trust.score} />}
          </div>
          <p className="text-sm text-stone-500">
            {user.ratingCount > 0 ? `⭐ ${user.ratingAvg.toFixed(1)} (${user.ratingCount} değerlendirme)` : "Henüz değerlendirme yok"}
          </p>
          <p className="text-xs text-stone-400">{formatDate(user.memberSince)} tarihinden beri üye</p>
          <div className="mt-1.5">
            <VerificationChips level={user.verificationLevel} />
          </div>
        </div>
      </div>

      {user.bio && <p className="mt-4 text-sm text-stone-700">{user.bio}</p>}
      {user.city && <p className="mt-1 text-sm text-stone-500">📍 {user.city}</p>}

      {items.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-stone-900">İlanlar</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section id="degerlendirmeler" className="mt-10 scroll-mt-24">
        <h2 className="text-sm font-semibold text-stone-900">Değerlendirmeler</h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">Henüz değerlendirme yok.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {user.reviewSummary && <ReviewSummaryCard summary={user.reviewSummary} />}
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-stone-200 bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {review.reviewer ? (
                      <Link href={`/profile/${review.reviewer.id}`} className="text-sm font-medium text-stone-900 hover:underline">
                        {review.reviewer.fullName}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-stone-900">Kullanıcı</span>
                    )}
                    <span className="text-amber-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                  </div>
                  <span className="text-xs text-stone-400">{formatDate(review.createdAt)}</span>
                </div>
                {review.comment && <p className="mt-2 text-sm text-stone-600">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
