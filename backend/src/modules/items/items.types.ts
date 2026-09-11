import type { Selectable } from "kysely";
import type { ItemAccessoriesTable, ItemImagesTable, ItemsTable } from "../../db/types";
import type { CategoryDto } from "../categories/categories.types";
import type { PublicUserDto } from "../users/users.types";

type ItemRow = Selectable<ItemsTable>;
type ItemImageRow = Selectable<ItemImagesTable>;
type ItemAccessoryRow = Selectable<ItemAccessoriesTable>;

export interface ItemImageDto {
  id: string;
  url: string;
  sortOrder: number;
  isCover: boolean;
}

export interface ItemAccessoryDto {
  id: string;
  name: string;
  quantity: number;
}

export interface ItemSummaryDto {
  id: string;
  ownerId: string;
  categoryId: string;
  title: string;
  brand: string | null;
  model: string | null;
  condition: string;
  riskLevel: string;
  dailyPrice: string;
  weeklyPrice: string | null;
  depositAmount: string;
  currency: string;
  deliveryMethod: string;
  city: string | null;
  district: string | null;
  status: string;
  coverImageUrl: string | null;
  createdAt: Date | string;
}

export interface ItemDetailDto extends ItemSummaryDto {
  description: string;
  serialNumber: string | null;
  lat: number | null;
  lng: number | null;
  updatedAt: Date | string;
  images: ItemImageDto[];
  accessories: ItemAccessoryDto[];
  category: CategoryDto | null;
  owner: PublicUserDto | null;
}

export function toItemSummaryDto(item: ItemRow, coverImageUrl: string | null): ItemSummaryDto {
  return {
    id: item.id,
    ownerId: item.owner_id,
    categoryId: item.category_id,
    title: item.title,
    brand: item.brand,
    model: item.model,
    condition: item.condition,
    riskLevel: item.risk_level,
    dailyPrice: item.daily_price,
    weeklyPrice: item.weekly_price,
    depositAmount: item.deposit_amount,
    currency: item.currency,
    deliveryMethod: item.delivery_method,
    city: item.city,
    district: item.district,
    status: item.status,
    coverImageUrl,
    createdAt: item.created_at,
  };
}

export function toItemImageDto(image: ItemImageRow): ItemImageDto {
  return { id: image.id, url: image.url, sortOrder: image.sort_order, isCover: image.is_cover };
}

export function toItemAccessoryDto(accessory: ItemAccessoryRow): ItemAccessoryDto {
  return { id: accessory.id, name: accessory.name, quantity: accessory.quantity };
}
