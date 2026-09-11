import type { RentalStatus } from "../../db/types";
import { rentalsRepository } from "../rentals/rentals.repository";
import { rentalsService } from "../rentals/rentals.service";

export const adminRentalsService = {
  async list(page: number, pageSize: number, status?: RentalStatus) {
    const { rows, total } = await rentalsRepository.listAllForAdmin(page, pageSize, status);
    const rentals = await Promise.all(rows.map((row) => rentalsService.getDetailForAdmin(row.id)));
    return { rentals, total, page, pageSize };
  },
};
