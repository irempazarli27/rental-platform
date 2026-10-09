import type { ReviewSummary } from "@/components/ReviewSummaryCard";
import { apiRequest } from "./client";

export interface PublicUserDto {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  ratingAvg: number;
  ratingCount: number;
  verificationLevel: string;
  memberSince: string;
  /** AI digest of their reviews; null below three reviews or when AI is off. */
  reviewSummary?: ReviewSummary | null;
}

export function getPublicProfile(id: string) {
  return apiRequest<{ user: PublicUserDto }>(`/api/users/${id}`, { auth: false });
}
