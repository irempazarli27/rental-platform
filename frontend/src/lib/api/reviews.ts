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
  createdAt: string;
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
