import type { ReviewSummary } from "@/components/ReviewSummaryCard";
import { apiRequest } from "./client";

export interface Review {
  id: string;
  rentalId: string;
  reviewerId: string;
  revieweeId: string;
  rating?: number;
  comment?: string | null;
  createdAt: string;
  revealed: boolean;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  reviewer: { id: string; fullName: string; avatarUrl: string | null } | null;
  /** The listing the rental was for. */
  item: { id: string; title: string } | null;
  createdAt: string;
}

export interface ItemReviews {
  reviews: PublicReview[];
  ratingAvg: number;
  ratingCount: number;
  summary: ReviewSummary | null;
}

export function createReview(rentalId: string, input: { rating: number; comment?: string }) {
  return apiRequest<{ review: Review }>(`/api/rentals/${rentalId}/reviews`, { method: "POST", body: input });
}

export function listRentalReviews(rentalId: string) {
  return apiRequest<{ reviews: Review[] }>(`/api/rentals/${rentalId}/reviews`);
}

export function listUserReviews(userId: string) {
  return apiRequest<{ reviews: PublicReview[] }>(`/api/users/${userId}/reviews`, { auth: false });
}

export function listItemReviews(itemId: string) {
  return apiRequest<ItemReviews>(`/api/items/${itemId}/reviews`, { auth: false });
}
