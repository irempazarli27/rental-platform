import { AppError } from "../../utils/AppError";
import { itemsRepository } from "../items/items.repository";
import { itemsService } from "../items/items.service";
import { favoritesRepository } from "./favorites.repository";

export const favoritesService = {
  async list(userId: string) {
    return itemsService.toSummaries(await favoritesRepository.listItems(userId));
  },

  async add(userId: string, itemId: string) {
    const item = await itemsRepository.findById(itemId);
    if (!item || item.status !== "active") throw AppError.notFound("Item not found");
    await favoritesRepository.add(userId, itemId);
  },

  async remove(userId: string, itemId: string) {
    await favoritesRepository.remove(userId, itemId);
  },
};
