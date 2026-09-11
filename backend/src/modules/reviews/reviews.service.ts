import { AppError } from "../../utils/AppError";
import { notificationsService } from "../notifications/notifications.service";
import { rentalsRepository } from "../rentals/rentals.repository";
import { usersRepository } from "../users/users.repository";
import { reviewsRepository } from "./reviews.repository";
import { toReviewDto, type PublicReviewDto, type ReviewDto } from "./reviews.types";
import type { CreateReviewInput } from "./reviews.validation";

// Double-blind window: a lone review stays hidden from the reviewee (and everyone else)
// until the counterparty also reviews, or this much time has passed since completion —
// whichever comes first. Prevents reading the other side's review before writing your own.
const REVEAL_TIMEOUT_MS = 14 * 24 * 60 * 60 * 1000;

function isRevealed(reviewCountForRental: number, completedAt: Date | string | null): boolean {
  if (reviewCountForRental >= 2) return true;
  if (!completedAt) return false;
  const deadline = new Date(completedAt).getTime() + REVEAL_TIMEOUT_MS;
  return Date.now() >= deadline;
}

export const reviewsService = {
  async create(rentalId: string, reviewerId: string, input: CreateReviewInput): Promise<ReviewDto> {
    const rental = await rentalsRepository.findById(rentalId);
    if (!rental) throw AppError.notFound("Rental not found");
    if (rental.renter_id !== reviewerId && rental.owner_id !== reviewerId) {
      throw AppError.notFound("Rental not found");
    }
    if (rental.status !== "COMPLETED") {
      throw AppError.conflict("Only completed rentals can be reviewed", "NOT_COMPLETED");
    }

    const existing = await reviewsRepository.findByRentalAndReviewer(rentalId, reviewerId);
    if (existing) {
      throw AppError.conflict("You have already reviewed this rental", "ALREADY_REVIEWED");
    }

    const revieweeId = reviewerId === rental.renter_id ? rental.owner_id : rental.renter_id;
    const row = await reviewsRepository.create({
      rentalId,
      reviewerId,
      revieweeId,
      rating: input.rating,
      comment: input.comment ?? null,
    });

    await notificationsService.notify(
      revieweeId,
      "review_received",
      "Yeni bir değerlendirme aldın",
      "Kiralaman için bir değerlendirme bırakıldı. Sen de değerlendirme yaparsan görebilirsin.",
      { type: "rental", id: rentalId },
    );

    return toReviewDto(row, true);
  },

  async listForRental(rentalId: string, requesterId: string): Promise<ReviewDto[]> {
    const rental = await rentalsRepository.findById(rentalId);
    if (!rental) throw AppError.notFound("Rental not found");
    if (rental.renter_id !== requesterId && rental.owner_id !== requesterId) {
      throw AppError.notFound("Rental not found");
    }

    const reviews = await reviewsRepository.listForRental(rentalId);
    const revealed = isRevealed(reviews.length, rental.completed_at);

    return reviews.map((row) => toReviewDto(row, row.reviewer_id === requesterId || revealed));
  },

  async listPublicForUser(userId: string): Promise<PublicReviewDto[]> {
    const reviews = await reviewsRepository.listByRevieweeId(userId);
    if (reviews.length === 0) return [];

    const rentalIds = [...new Set(reviews.map((r) => r.rental_id))];
    const [rentals, siblingReviews] = await Promise.all([
      rentalsRepository.findByIds(rentalIds),
      reviewsRepository.listForRentals(rentalIds),
    ]);
    const completedAtByRental = new Map(rentals.map((r) => [r.id, r.completed_at]));
    const countByRental = new Map<string, number>();
    for (const r of siblingReviews) {
      countByRental.set(r.rental_id, (countByRental.get(r.rental_id) ?? 0) + 1);
    }

    const revealedReviews = reviews.filter((r) => {
      const count = countByRental.get(r.rental_id) ?? 1;
      return isRevealed(count, completedAtByRental.get(r.rental_id) ?? null);
    });

    const reviewerIds = [...new Set(revealedReviews.map((r) => r.reviewer_id))];
    const reviewers = await usersRepository.findByIds(reviewerIds);
    const reviewerById = new Map(reviewers.map((u) => [u.id, u]));

    return revealedReviews.map((r) => {
      const reviewer = reviewerById.get(r.reviewer_id);
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        reviewer: reviewer ? { id: reviewer.id, fullName: reviewer.full_name, avatarUrl: reviewer.avatar_url } : null,
        createdAt: r.created_at,
      };
    });
  },

  async getRatingStats(userId: string): Promise<{ ratingAvg: number; ratingCount: number }> {
    const publicReviews = await this.listPublicForUser(userId);
    if (publicReviews.length === 0) return { ratingAvg: 0, ratingCount: 0 };
    const sum = publicReviews.reduce((acc, r) => acc + r.rating, 0);
    return { ratingAvg: Math.round((sum / publicReviews.length) * 100) / 100, ratingCount: publicReviews.length };
  },
};
