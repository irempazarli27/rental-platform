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
}

export function getPublicProfile(id: string) {
  return apiRequest<{ user: PublicUserDto }>(`/api/users/${id}`, { auth: false });
}
