import { TrustBadge, VerificationChips } from "@/components/TrustBadge";
import type { TrustLevel } from "@/lib/api/auth";
import type { RenterProfile } from "@/lib/api/rentals";

/**
 * What an owner needs to judge a renter without leaving the page: rating,
 * finished rentals, trust level and verification. `compact` fits a list row.
 */
export function RenterSummary({ profile, compact = false }: { profile: RenterProfile; compact?: boolean }) {
  const rating =
    profile.ratingCount > 0 ? (
      <>
        <span className="text-amber-500">★</span> <span className="font-medium text-stone-900">{profile.ratingAvg.toFixed(1)}</span>{" "}
        <span className="text-stone-500">({profile.ratingCount})</span>
      </>
    ) : (
      <span className="text-stone-500">Henüz değerlendirme yok</span>
    );
  const record =
    profile.completedRentals > 0 ? `${profile.completedRentals} tamamlanan kiralama` : "İlk kiralaması";

  if (compact) {
    return (
      <p className="flex flex-wrap items-center gap-x-1.5 text-xs">
        {rating}
        <span className="text-stone-300">·</span>
        <span className="text-stone-500">{record}</span>
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
        {rating}
        <span className="text-stone-300">·</span>
        <span className="text-stone-600">{record}</span>
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <TrustBadge level={profile.trust.level as TrustLevel} score={profile.trust.score} />
        <VerificationChips level={profile.verificationLevel} />
        {profile.verificationLevel === "none" && <span className="text-xs text-stone-500">Hesabını doğrulamamış</span>}
      </div>
    </div>
  );
}
