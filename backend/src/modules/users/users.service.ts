import { AppError } from "../../utils/AppError";
import { omitUndefined } from "../../utils/object";
import { reviewsService } from "../reviews/reviews.service";
import { usersRepository } from "./users.repository";
import type { UpdateProfileInput } from "./users.validation";
import { toPrivateUserDto, toPublicUserDto } from "./users.types";

export const usersService = {
  async getMe(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    const stats = await reviewsService.getRatingStats(userId);
    return { ...toPrivateUserDto(user), ...stats };
  },

  async getPublicProfile(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    const stats = await reviewsService.getRatingStats(userId);
    return { ...toPublicUserDto(user), ...stats };
  },

  async updateMe(userId: string, input: UpdateProfileInput) {
    const patch = omitUndefined({
      full_name: input.fullName,
      phone: input.phone,
      bio: input.bio,
      city: input.city,
      district: input.district,
      avatar_url: input.avatarUrl,
    });
    const updated = Object.keys(patch).length
      ? await usersRepository.update(userId, patch)
      : await usersRepository.findById(userId);
    if (!updated) throw AppError.notFound("User not found");
    const stats = await reviewsService.getRatingStats(userId);
    return { ...toPrivateUserDto(updated), ...stats };
  },
};
