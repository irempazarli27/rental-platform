import { apiRequest } from "./client";
import type { ItemSummary } from "./items";

export function listFavorites() {
  return apiRequest<{ items: ItemSummary[] }>("/api/favorites");
}

export function addFavorite(itemId: string) {
  return apiRequest<void>(`/api/favorites/${itemId}`, { method: "PUT" });
}

export function removeFavorite(itemId: string) {
  return apiRequest<void>(`/api/favorites/${itemId}`, { method: "DELETE" });
}
