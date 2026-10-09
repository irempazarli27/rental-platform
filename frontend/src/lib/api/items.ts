import { apiRequest } from "./client";
import type { PublicUserDto } from "./users";

export type ItemCondition = "new" | "like_new" | "good" | "fair";
export type RiskLevel = "low" | "medium" | "high";
export type DeliveryMethod = "pickup" | "delivery" | "both";
export type ItemStatus = "draft" | "active" | "paused" | "deleted";

export interface ItemAccessory {
  id: string;
  name: string;
  quantity: number;
}

export interface ItemImage {
  id: string;
  url: string;
  sortOrder: number;
  isCover: boolean;
}

export interface ItemSummary {
  id: string;
  ownerId: string;
  categoryId: string;
  title: string;
  brand: string | null;
  model: string | null;
  condition: ItemCondition;
  riskLevel: RiskLevel;
  dailyPrice: string;
  weeklyPrice: string | null;
  depositAmount: string;
  currency: string;
  deliveryMethod: DeliveryMethod;
  city: string | null;
  district: string | null;
  status: ItemStatus;
  coverImageUrl: string | null;
  /** From public renter reviews of this item; 0 / 0 when it has none. */
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
}

export interface ItemDetail extends ItemSummary {
  description: string;
  serialNumber: string | null;
  lat: number | null;
  lng: number | null;
  updatedAt: string;
  images: ItemImage[];
  accessories: ItemAccessory[];
  category: { id: string; name: string; slug: string } | null;
  owner: PublicUserDto | null;
}

export interface AvailabilityBlock {
  id: string;
  item_id: string;
  start_date: string;
  end_date: string;
  reason: "manual" | "rental";
}

export interface ItemAccessoryInput {
  name: string;
  quantity: number;
}

export interface CreateItemInput {
  title: string;
  description: string;
  categoryId: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  condition: ItemCondition;
  riskLevel?: RiskLevel;
  dailyPrice: number;
  weeklyPrice?: number;
  depositAmount: number;
  deliveryMethod: DeliveryMethod;
  city?: string;
  district?: string;
  lat?: number;
  lng?: number;
  status: "draft" | "active";
  accessories: ItemAccessoryInput[];
}

export type UpdateItemInput = Partial<Omit<CreateItemInput, "status">> & {
  status?: "draft" | "active" | "paused";
};

export interface SearchItemsQuery {
  q?: string;
  categoryId?: string;
  ownerId?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  condition?: ItemCondition;
  riskLevel?: RiskLevel;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchItemsResult {
  items: ItemSummary[];
  total: number;
  page: number;
  pageSize: number;
}

function toQueryString(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query as Record<string, string | number | undefined>)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function searchItems(query: SearchItemsQuery) {
  return apiRequest<SearchItemsResult>(`/api/items${toQueryString(query)}`, { auth: false });
}

export function getItem(id: string) {
  // Not auth:false — an owner viewing their own draft/paused listing needs the
  // token attached so the backend recognizes them and returns it instead of 404.
  return apiRequest<{ item: ItemDetail }>(`/api/items/${id}`);
}

export function createItem(input: CreateItemInput) {
  return apiRequest<{ item: ItemDetail }>("/api/items", { method: "POST", body: input });
}

export function updateItem(id: string, input: UpdateItemInput) {
  return apiRequest<{ item: ItemDetail }>(`/api/items/${id}`, { method: "PATCH", body: input });
}

export function deleteItem(id: string) {
  return apiRequest<void>(`/api/items/${id}`, { method: "DELETE" });
}

export function uploadItemImages(id: string, files: File[]) {
  const formData = new FormData();
  for (const file of files) formData.append("images", file);
  return apiRequest<{ images: ItemImage[] }>(`/api/items/${id}/images`, {
    method: "POST",
    body: formData,
  });
}

export function deleteItemImage(id: string, imageId: string) {
  return apiRequest<void>(`/api/items/${id}/images/${imageId}`, { method: "DELETE" });
}

export function listAvailability(id: string) {
  return apiRequest<{ blocks: AvailabilityBlock[] }>(`/api/items/${id}/availability`, { auth: false });
}

export function createAvailabilityBlock(id: string, input: { startDate: string; endDate: string }) {
  return apiRequest<{ block: AvailabilityBlock }>(`/api/items/${id}/availability-blocks`, {
    method: "POST",
    body: input,
  });
}

export function deleteAvailabilityBlock(id: string, blockId: string) {
  return apiRequest<void>(`/api/items/${id}/availability-blocks/${blockId}`, { method: "DELETE" });
}

export function myListings() {
  return apiRequest<{ items: ItemSummary[] }>("/api/users/me/listings");
}
