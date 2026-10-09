import { AppError } from "../../utils/AppError";
import { omitUndefined } from "../../utils/object";
import { reviewSummaryService } from "../reviews/reviewSummary.service";
import { reviewsService } from "../reviews/reviews.service";
import { trustService } from "../trust/trust.service";
import { usersRepository } from "./users.repository";
import type { UpdateProfileInput } from "./users.validation";
import { toPrivateUserDto, toPublicUserDto } from "./users.types";

export const usersService = {
  async getMe(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    const [stats, trust] = await Promise.all([reviewsService.getRatingStats(userId), trustService.getTrust(userId)]);
    return { ...toPrivateUserDto(user), ...stats, trust };
  },

  async getPublicProfile(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user || user.status === "deleted") throw AppError.notFound("User not found");
    const [stats, trust, reviewSummary] = await Promise.all([
      reviewsService.getRatingStats(userId),
      trustService.getTrust(userId),
      reviewSummaryService.getForUser(userId),
    ]);
    // The breakdown (e.g. lost-dispute penalties) is private to the user; the public
    // profile only shows the resulting score and level.
    return { ...toPublicUserDto(user), ...stats, trust: { score: trust.score, level: trust.level }, reviewSummary };
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
