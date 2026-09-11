import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(150).optional(),
  phone: z.string().trim().min(7).max(30).nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  district: z.string().trim().max(100).nullable().optional(),
  avatarUrl: z.string().trim().url().nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
