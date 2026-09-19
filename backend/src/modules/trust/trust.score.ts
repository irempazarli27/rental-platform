export type TrustLevel = "new" | "trusted" | "highly_trusted";

export interface TrustInputs {
  completedRentals: number;
  ratingAvg: number;
  ratingCount: number;
  verificationLevel: "none" | "email" | "phone" | "id_verified";
  accountAgeDays: number;
  lostDisputes: number;
  suspended: boolean;
}

export interface TrustBreakdown {
  rentals: number;
  ratings: number;
  verification: number;
  accountAge: number;
  penalty: number;
}

export const TRUST_MAX = {
  rentals: 40,
  ratings: 30,
  verification: 15,
  accountAge: 15,
} as const;

const POINTS_PER_COMPLETED_RENTAL = 8;
const RENTALS_CAP = 5;
const RATINGS_FULL_WEIGHT_AT = 5;
const ACCOUNT_AGE_FULL_AT_DAYS = 60;
const PENALTY_PER_LOST_DISPUTE = 20;

// Points are the running total for a level, not per step. Identity carries most of
// the weight since e-mail and phone are cheap to fake.
export const VERIFICATION_POINTS: Record<TrustInputs["verificationLevel"], number> = {
  none: 0,
  email: 3,
  phone: 6,
  id_verified: 15,
};

export const LEVEL_THRESHOLDS = { trusted: 40, highlyTrusted: 70 } as const;

export function levelForScore(score: number): TrustLevel {
  if (score >= LEVEL_THRESHOLDS.highlyTrusted) return "highly_trusted";
  if (score >= LEVEL_THRESHOLDS.trusted) return "trusted";
  return "new";
}

/**
 * Pure scoring function: 0-100 from completed rentals, review quality,
 * verification, account age, minus a penalty per dispute lost. Suspended
 * accounts always score 0.
 */
export function computeTrust(input: TrustInputs): { score: number; level: TrustLevel; breakdown: TrustBreakdown } {
  if (input.suspended) {
    return { score: 0, level: "new", breakdown: { rentals: 0, ratings: 0, verification: 0, accountAge: 0, penalty: 0 } };
  }

  const rentals = Math.min(input.completedRentals, RENTALS_CAP) * POINTS_PER_COMPLETED_RENTAL;

  // Rating quality (1-5 mapped to 0-1), weighted by how many reviews back it up so one
  // lucky 5-star review can't max the category out.
  const quality = input.ratingCount > 0 ? Math.max(0, (input.ratingAvg - 1) / 4) : 0;
  const weight = Math.min(input.ratingCount, RATINGS_FULL_WEIGHT_AT) / RATINGS_FULL_WEIGHT_AT;
  const ratings = Math.round(quality * weight * TRUST_MAX.ratings);

  const verification = VERIFICATION_POINTS[input.verificationLevel];
  const accountAge = Math.round((Math.min(Math.max(input.accountAgeDays, 0), ACCOUNT_AGE_FULL_AT_DAYS) / ACCOUNT_AGE_FULL_AT_DAYS) * TRUST_MAX.accountAge);
  const penalty = input.lostDisputes * PENALTY_PER_LOST_DISPUTE;

  const score = Math.max(0, Math.min(100, rentals + ratings + verification + accountAge - penalty));
  return { score, level: levelForScore(score), breakdown: { rentals, ratings, verification, accountAge, penalty } };
}
