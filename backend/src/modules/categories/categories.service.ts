import { AppError } from "../../utils/AppError";
import { categoriesRepository } from "./categories.repository";
import { toCategoryDto } from "./categories.types";

export const categoriesService = {
  async list() {
    const categories = await categoriesRepository.listActive();
    return categories.map(toCategoryDto);
  },

  async getActiveById(id: string) {
    const category = await categoriesRepository.findById(id);
    if (!category || !category.is_active) {
      throw AppError.badRequest("Invalid category", "INVALID_CATEGORY");
    }
    return category;
  },
};
