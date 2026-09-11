import type { Selectable } from "kysely";
import type { ReviewsTable } from "../../db/types";

export type ReviewRow = Selectable<ReviewsTable>;

/** The reviewer always sees their own submission in full. Everyone else — including the
 * reviewee — sees a placeholder until both sides have reviewed (or the reveal window lapses),
 * so nobody can tailor or retaliate after reading what was said about them first. */
export type ReviewDto =
  | {
      id: string;
      rentalId: string;
      reviewerId: string;
      revieweeId: string;
      rating: number;
      comment: string | null;
      createdAt: Date | string;
      revealed: true;
    }
  | {
      id: string;
      rentalId: string;
      reviewerId: string;
      revieweeId: string;
      createdAt: Date | string;
      revealed: false;
    };

export function toReviewDto(row: ReviewRow, revealed: boolean): ReviewDto {
  if (revealed) {
    return {
      id: row.id,
      rentalId: row.rental_id,
      reviewerId: row.reviewer_id,
      revieweeId: row.reviewee_id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
      revealed: true,
    };
  }
  return {
    id: row.id,
    rentalId: row.rental_id,
    reviewerId: row.reviewer_id,
    revieweeId: row.reviewee_id,
    createdAt: row.created_at,
    revealed: false,
  };
}

export interface PublicReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  reviewer: { id: string; fullName: string; avatarUrl: string | null } | null;
  createdAt: Date | string;
}
