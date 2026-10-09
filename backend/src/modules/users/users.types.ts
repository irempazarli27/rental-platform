import type { User } from "../../db/types";

export interface PrivateUserDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  district: string | null;
  ratingAvg: number;
  ratingCount: number;
  verificationLevel: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  role: string;
  status: string;
  /** False for Google-only accounts, which confirm sensitive actions by other means. */
  hasPassword: boolean;
  createdAt: Date | string;
}

export interface PublicUserDto {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  ratingAvg: number;
  ratingCount: number;
  verificationLevel: string;
  memberSince: Date | string;
}

export function toPrivateUserDto(user: User): PrivateUserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    city: user.city,
    district: user.district,
    ratingAvg: Number(user.rating_avg),
    ratingCount: user.rating_count,
    verificationLevel: user.verification_level,
    emailVerified: user.email_verified_at !== null,
    phoneVerified: user.phone_verified_at !== null,
    role: user.role,
    status: user.status,
    hasPassword: user.password_hash !== null,
    createdAt: user.created_at,
  };
}

export function toPublicUserDto(user: User): PublicUserDto {
  return {
    id: user.id,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    city: user.city,
    ratingAvg: Number(user.rating_avg),
    ratingCount: user.rating_count,
    verificationLevel: user.verification_level,
    memberSince: user.created_at,
  };
}
