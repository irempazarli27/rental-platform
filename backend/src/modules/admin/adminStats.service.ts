import { billingRepository } from "../rentals/billing.repository";
import { rentalsRepository } from "../rentals/rentals.repository";
import { itemsRepository } from "../items/items.repository";
import { usersRepository } from "../users/users.repository";
import { disputesRepository } from "../disputes/disputes.repository";

export const adminStatsService = {
  async getStats() {
    const [userCount, itemsByStatus, rentalsByStatus, openDisputes, platformFees] = await Promise.all([
      usersRepository.countAll(),
      itemsRepository.countByStatus(),
      rentalsRepository.countByStatus(),
      disputesRepository.countOpen(),
      billingRepository.sumPlatformFees(),
    ]);

    return {
      totalUsers: Number(userCount?.count ?? 0),
      itemsByStatus: Object.fromEntries(itemsByStatus.map((r) => [r.status, Number(r.count)])),
      rentalsByStatus: Object.fromEntries(rentalsByStatus.map((r) => [r.status, Number(r.count)])),
      openDisputes: Number(openDisputes?.count ?? 0),
      totalPlatformFeeRevenue: Number(platformFees?.total ?? 0),
    };
  },
};
