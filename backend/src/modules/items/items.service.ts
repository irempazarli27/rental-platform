import { randomUUID } from "node:crypto";
import type { Updateable } from "kysely";
import type { ItemsTable } from "../../db/types";
import { AppError } from "../../utils/AppError";
import { storage } from "../../storage";
import { categoriesService } from "../categories/categories.service";
import { categoriesRepository } from "../categories/categories.repository";
import { toCategoryDto } from "../categories/categories.types";
import { reviewsRepository } from "../reviews/reviews.repository";
import { reviewsService } from "../reviews/reviews.service";
import { usersRepository } from "../users/users.repository";
import { toPublicUserDto } from "../users/users.types";
import { availabilityRepository } from "./availability.repository";
import { itemAccessoriesRepository } from "./item-accessories.repository";
import { itemImagesRepository } from "./item-images.repository";
import { itemsRepository } from "./items.repository";
import { resolveRiskLevel } from "./riskLevel";
import {
  toItemAccessoryDto,
  toItemImageDto,
  toItemSummaryDto,
  type ItemDetailDto,
  type ItemSummaryDto,
} from "./items.types";
import type { AvailabilityBlockInput, CreateItemInput, ListItemsQuery, UpdateItemInput } from "./items.validation";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function assertOwnedItem(itemId: string, requesterId: string) {
  const item = await itemsRepository.findById(itemId);
  if (!item) throw AppError.notFound("Item not found");
  if (item.owner_id !== requesterId) throw AppError.forbidden("You do not own this item");
  return item;
}

async function summariesWithCovers(rows: Awaited<ReturnType<typeof itemsRepository.listByOwner>>): Promise<ItemSummaryDto[]> {
  const ids = rows.map((r) => r.id);
  const [covers, ratings] = await Promise.all([
    itemImagesRepository.listCoversByItemIds(ids),
    reviewsRepository.ratingStatsForItems(ids),
  ]);
  const coverByItemId = new Map(covers.map((c) => [c.item_id, c.url]));
  return rows.map((row) => toItemSummaryDto(row, coverByItemId.get(row.id) ?? null, ratings.get(row.id)));
}

export const itemsService = {
  /** Card-level DTOs (with cover image) for rows another module already selected. */
  toSummaries: summariesWithCovers,

  async create(ownerId: string, input: CreateItemInput): Promise<ItemDetailDto> {
    const category = await categoriesService.getActiveById(input.categoryId);
    const riskLevel = resolveRiskLevel(category.default_risk_level, input.riskLevel);

    const item = await itemsRepository.create({
      owner_id: ownerId,
      category_id: input.categoryId,
      title: input.title,
      description: input.description,
      brand: input.brand ?? null,
      model: input.model ?? null,
      serial_number: input.serialNumber ?? null,
      condition: input.condition,
      risk_level: riskLevel,
      daily_price: String(input.dailyPrice),
      weekly_price: input.weeklyPrice != null ? String(input.weeklyPrice) : null,
      deposit_amount: String(input.depositAmount),
      currency: "TRY",
      delivery_method: input.deliveryMethod,
      city: input.city ?? null,
      district: input.district ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      status: input.status,
    });

    if (input.accessories.length > 0) {
      await itemAccessoriesRepository.replaceForItem(item.id, input.accessories);
    }

    return this.getDetail(item.id, ownerId);
  },

  async getDetail(itemId: string, requesterId?: string): Promise<ItemDetailDto> {
    const item = await itemsRepository.findById(itemId);
    if (!item) throw AppError.notFound("Item not found");
    if (item.status === "deleted" || (item.status !== "active" && item.owner_id !== requesterId)) {
      throw AppError.notFound("Item not found");
    }

    const [images, accessories, category, owner, ownerStats, itemRatings] = await Promise.all([
      itemImagesRepository.listByItemId(item.id),
      itemAccessoriesRepository.listByItemId(item.id),
      categoriesRepository.findById(item.category_id),
      usersRepository.findById(item.owner_id),
      reviewsService.getRatingStats(item.owner_id),
      reviewsRepository.ratingStatsForItems([item.id]),
    ]);

    const cover = images.find((i) => i.is_cover)?.url ?? null;

    return {
      ...toItemSummaryDto(item, cover, itemRatings.get(item.id)),
      description: item.description,
      serialNumber: item.serial_number,
      lat: item.lat,
      lng: item.lng,
      updatedAt: item.updated_at,
      images: images.map(toItemImageDto),
      accessories: accessories.map(toItemAccessoryDto),
      category: category ? toCategoryDto(category) : null,
      owner: owner ? { ...toPublicUserDto(owner), ...ownerStats } : null,
    };
  },

  async update(itemId: string, ownerId: string, input: UpdateItemInput): Promise<ItemDetailDto> {
    const item = await assertOwnedItem(itemId, ownerId);

    const patch: Updateable<ItemsTable> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.brand !== undefined) patch.brand = input.brand;
    if (input.model !== undefined) patch.model = input.model;
    if (input.serialNumber !== undefined) patch.serial_number = input.serialNumber;
    if (input.condition !== undefined) patch.condition = input.condition;
    if (input.dailyPrice !== undefined) patch.daily_price = String(input.dailyPrice);
    if (input.weeklyPrice !== undefined) patch.weekly_price = String(input.weeklyPrice);
    if (input.depositAmount !== undefined) patch.deposit_amount = String(input.depositAmount);
    if (input.deliveryMethod !== undefined) patch.delivery_method = input.deliveryMethod;
    if (input.city !== undefined) patch.city = input.city;
    if (input.district !== undefined) patch.district = input.district;
    if (input.lat !== undefined) patch.lat = input.lat;
    if (input.lng !== undefined) patch.lng = input.lng;
    if (input.status !== undefined) patch.status = input.status;

    if (input.categoryId !== undefined || input.riskLevel !== undefined) {
      const categoryId = input.categoryId ?? item.category_id;
      const category = await categoriesService.getActiveById(categoryId);
      patch.category_id = categoryId;
      patch.risk_level = resolveRiskLevel(category.default_risk_level, input.riskLevel);
    }

    if (Object.keys(patch).length > 0) {
      await itemsRepository.update(itemId, patch);
    }

    if (input.accessories !== undefined) {
      await itemAccessoriesRepository.replaceForItem(itemId, input.accessories);
    }

    return this.getDetail(itemId, ownerId);
  },

  async softDelete(itemId: string, ownerId: string): Promise<void> {
    await assertOwnedItem(itemId, ownerId);
    await itemsRepository.update(itemId, { status: "deleted" });
  },

  async listByOwner(ownerId: string): Promise<ItemSummaryDto[]> {
    const rows = await itemsRepository.listByOwner(ownerId);
    return summariesWithCovers(rows);
  },

  async search(query: ListItemsQuery) {
    const { rows, total } = await itemsRepository.search(query);
    const items = await summariesWithCovers(rows);
    return { items, total, page: query.page, pageSize: query.pageSize };
  },

  async addImages(itemId: string, ownerId: string, files: Express.Multer.File[]) {
    await assertOwnedItem(itemId, ownerId);
    if (files.length === 0) throw AppError.badRequest("No files uploaded");

    const saved = await Promise.all(
      files.map(async (file) => {
        const ext = MIME_EXTENSIONS[file.mimetype] ?? "bin";
        const filename = `${randomUUID()}.${ext}`;
        return storage.save(file.buffer, {
          subdir: `items/${itemId}`,
          filename,
          contentType: file.mimetype,
        });
      }),
    );

    const rows = await itemImagesRepository.addMany(
      itemId,
      saved.map((s) => ({ url: s.url })),
    );
    return rows.map(toItemImageDto);
  },

  async deleteImage(itemId: string, ownerId: string, imageId: string): Promise<void> {
    await assertOwnedItem(itemId, ownerId);
    const image = await itemImagesRepository.findById(imageId);
    if (!image || image.item_id !== itemId) throw AppError.notFound("Image not found");

    await itemImagesRepository.deleteById(imageId);
    await storage.delete(image.url.replace(/^\/uploads\//, ""));

    if (image.is_cover) {
      await itemImagesRepository.promoteNextCover(itemId);
    }
  },

  async listAvailability(itemId: string) {
    const item = await itemsRepository.findById(itemId);
    if (!item || item.status === "deleted") throw AppError.notFound("Item not found");
    return availabilityRepository.listForItem(itemId);
  },

  async createAvailabilityBlock(itemId: string, ownerId: string, input: AvailabilityBlockInput) {
    await assertOwnedItem(itemId, ownerId);
    return availabilityRepository.createManualBlock(itemId, input.startDate, input.endDate);
  },

  async deleteAvailabilityBlock(itemId: string, ownerId: string, blockId: string): Promise<void> {
    await assertOwnedItem(itemId, ownerId);
    const block = await availabilityRepository.findById(blockId);
    if (!block || block.item_id !== itemId) throw AppError.notFound("Availability block not found");
    if (block.reason !== "manual") {
      throw AppError.badRequest("Only manually created blocks can be removed", "BLOCK_NOT_MANUAL");
    }
    await availabilityRepository.deleteById(blockId);
  },
};
