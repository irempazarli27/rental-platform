import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { reviewsService } from "../reviews/reviews.service";
import { usersRepository } from "../users/users.repository";
import { computeTrust, type TrustBreakdown, type TrustLevel } from "./trust.score";
import { trustRepository } from "./trust.repository";

export interface TrustDto {
  score: number;
  level: TrustLevel;
  breakdown: TrustBreakdown;
  /** Whether this user currently meets the minimum to request high-risk items. */
  canRentHighRisk: boolean;
  highRiskMinScore: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const trustService = {
  async getTrust(userId: string): Promise<TrustDto> {
    return (await this.compute(userId)).trust;
  },

  /**
   * What an owner needs to judge a renter at a glance: rating, track record,
   * trust level and verification. Everything here is already public on the
   * renter's profile except the completed-rental count.
   */
  async getRenterSummary(userId: string) {
    const { trust, completedRentals, rating, verificationLevel } = await this.compute(userId);
    return {
      ratingAvg: rating.ratingAvg,
      ratingCount: rating.ratingCount,
      completedRentals,
      verificationLevel,
      trust: { score: trust.score, level: trust.level },
    };
  },

  async compute(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");

    const [completedRentals, lostDisputes, rating] = await Promise.all([
      trustRepository.countCompletedRentals(userId),
      trustRepository.countLostDisputes(userId),
      reviewsService.getRatingStats(userId),
    ]);

    const { score, level, breakdown } = computeTrust({
      completedRentals,
      ratingAvg: rating.ratingAvg,
      ratingCount: rating.ratingCount,
      verificationLevel: user.verification_level,
      accountAgeDays: (Date.now() - new Date(user.created_at).getTime()) / DAY_MS,
      lostDisputes,
      suspended: user.status === "suspended",
    });

    const trust: TrustDto = {
      score,
      level,
      breakdown,
      canRentHighRisk: score >= env.highRiskMinTrust,
      highRiskMinScore: env.highRiskMinTrust,
    };
    return { trust, completedRentals, rating, verificationLevel: user.verification_level };
  },

  /** Throws unless the renter is trusted enough for a high-risk item. */
  async assertCanRent(renterId: string, itemRiskLevel: string) {
    if (itemRiskLevel !== "high") return;
    const trust = await this.getTrust(renterId);
    if (!trust.canRentHighRisk) {
      throw new AppError(
        403,
        `Bu ilan yüksek riskli. Kiralamak için güven puanın en az ${trust.highRiskMinScore} olmalı (şu an: ${trust.score}). Önce düşük riskli eşyalarla başlayıp puan kazanabilirsin.`,
        "TRUST_TOO_LOW",
      );
    }
  },
};
