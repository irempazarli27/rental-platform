import { AppError } from "../../utils/AppError";
import { availabilityRepository } from "../items/availability.repository";
import { itemImagesRepository } from "../items/item-images.repository";
import { itemsRepository } from "../items/items.repository";
import { usersRepository } from "../users/users.repository";
import { notificationsService } from "../notifications/notifications.service";
import { billingRepository } from "./billing.repository";
import { computePricing } from "./rentals.pricing";
import { rentalsRepository } from "./rentals.repository";
import { toRentalBase, type RentalDto, type RentalItemSummaryDto, type RentalPartyDto } from "./rentals.types";
import type { CreateRentalInput, ListRentalsQuery } from "./rentals.validation";

async function assembleDto(row: Awaited<ReturnType<typeof rentalsRepository.findById>>): Promise<RentalDto> {
  if (!row) throw AppError.notFound("Rental not found");

  const [item, renter, owner] = await Promise.all([
    itemsRepository.findById(row.item_id),
    usersRepository.findById(row.renter_id),
    usersRepository.findById(row.owner_id),
  ]);

  let itemDto: RentalItemSummaryDto | null = null;
  if (item) {
    const images = await itemImagesRepository.listByItemId(item.id);
    itemDto = { id: item.id, title: item.title, coverImageUrl: images.find((i) => i.is_cover)?.url ?? null };
  }

  const toParty = (u: Awaited<ReturnType<typeof usersRepository.findById>>): RentalPartyDto | null =>
    u ? { id: u.id, fullName: u.full_name, avatarUrl: u.avatar_url } : null;

  return {
    ...toRentalBase(row),
    item: itemDto,
    renter: toParty(renter),
    owner: toParty(owner),
  };
}

function assertParticipant(row: NonNullable<Awaited<ReturnType<typeof rentalsRepository.findById>>>, userId: string) {
  if (row.renter_id !== userId && row.owner_id !== userId) {
    throw AppError.notFound("Rental not found");
  }
}

export const rentalsService = {
  async create(renterId: string, input: CreateRentalInput): Promise<RentalDto> {
    const item = await itemsRepository.findById(input.itemId);
    if (!item || item.status !== "active") {
      throw AppError.badRequest("Item is not available for rent", "ITEM_NOT_AVAILABLE");
    }
    if (item.owner_id === renterId) {
      throw AppError.badRequest("You cannot rent your own item", "OWN_ITEM");
    }

    const pricing = computePricing({
      dailyPrice: Number(item.daily_price),
      weeklyPrice: item.weekly_price != null ? Number(item.weekly_price) : null,
      depositAmount: Number(item.deposit_amount),
      startDate: input.startDate,
      endDate: input.endDate,
    });

    const rental = await rentalsRepository.create({
      item_id: item.id,
      renter_id: renterId,
      owner_id: item.owner_id,
      start_date: input.startDate,
      end_date: input.endDate,
      daily_price_snapshot: item.daily_price,
      rental_price: String(pricing.rentalPrice),
      deposit_amount: String(pricing.depositAmount),
      platform_fee: String(pricing.platformFee),
      total_amount: String(pricing.totalAmount),
      delivery_method: item.delivery_method,
      status: "PENDING",
    });

    await notificationsService.notify(
      item.owner_id,
      "rental_requested",
      "Yeni kiralama talebi",
      `"${item.title}" için yeni bir kiralama talebin var.`,
      { type: "rental", id: rental.id },
    );

    return assembleDto(rental);
  },

  async getDetail(rentalId: string, requesterId: string): Promise<RentalDto> {
    const row = await rentalsRepository.findById(rentalId);
    if (!row) throw AppError.notFound("Rental not found");
    assertParticipant(row, requesterId);
    return assembleDto(row);
  },

  /** Admin-only: skips the participant check. Callers must gate on req.auth.role themselves. */
  async getDetailForAdmin(rentalId: string): Promise<RentalDto> {
    const row = await rentalsRepository.findById(rentalId);
    if (!row) throw AppError.notFound("Rental not found");
    return assembleDto(row);
  },

  async listMine(userId: string, query: ListRentalsQuery): Promise<RentalDto[]> {
    const rows = await rentalsRepository.listForUser(userId, query);
    return Promise.all(rows.map((row) => assembleDto(row)));
  },

  async accept(rentalId: string, ownerId: string): Promise<RentalDto> {
    const row = await rentalsRepository.findById(rentalId);
    if (!row) throw AppError.notFound("Rental not found");
    if (row.owner_id !== ownerId) throw AppError.notFound("Rental not found");
    if (row.status !== "PENDING") {
      throw AppError.conflict("Only pending requests can be accepted", "INVALID_STATUS");
    }

    const overlapping = await availabilityRepository.findOverlapping(row.item_id, row.start_date, row.end_date);
    if (overlapping.length > 0) {
      throw AppError.conflict("These dates are no longer available", "DATES_UNAVAILABLE");
    }

    await availabilityRepository.createRentalBlock(row.item_id, row.start_date, row.end_date, row.id);
    await billingRepository.recordAcceptance(row.id, row.rental_price, row.platform_fee, row.deposit_amount);
    const updated = await rentalsRepository.update(rentalId, { status: "ACCEPTED", accepted_at: new Date() });

    await notificationsService.notify(
      row.renter_id,
      "rental_accepted",
      "Kiralama talebin kabul edildi",
      "Talebin kabul edildi, teslim süreci yakında başlayacak.",
      { type: "rental", id: row.id },
    );

    return assembleDto(updated);
  },

  async reject(rentalId: string, ownerId: string): Promise<RentalDto> {
    const row = await rentalsRepository.findById(rentalId);
    if (!row) throw AppError.notFound("Rental not found");
    if (row.owner_id !== ownerId) throw AppError.notFound("Rental not found");
    if (row.status !== "PENDING") {
      throw AppError.conflict("Only pending requests can be rejected", "INVALID_STATUS");
    }

    const updated = await rentalsRepository.update(rentalId, { status: "REJECTED", rejected_at: new Date() });

    await notificationsService.notify(
      row.renter_id,
      "rental_rejected",
      "Kiralama talebin reddedildi",
      "Eşya sahibi talebini reddetti.",
      { type: "rental", id: row.id },
    );

    return assembleDto(updated);
  },

  async cancel(rentalId: string, userId: string): Promise<RentalDto> {
    const row = await rentalsRepository.findById(rentalId);
    if (!row) throw AppError.notFound("Rental not found");
    assertParticipant(row, userId);
    if (row.status !== "PENDING" && row.status !== "ACCEPTED") {
      throw AppError.conflict("This rental can no longer be cancelled", "INVALID_STATUS");
    }

    if (row.status === "ACCEPTED") {
      await availabilityRepository.deleteByRentalId(row.id);
      await billingRepository.releaseDeposit(row.id);
    }

    const updated = await rentalsRepository.update(rentalId, { status: "CANCELLED", cancelled_at: new Date() });

    const otherPartyId = userId === row.renter_id ? row.owner_id : row.renter_id;
    await notificationsService.notify(
      otherPartyId,
      "rental_cancelled",
      "Kiralama iptal edildi",
      "Bir kiralama işlemi iptal edildi.",
      { type: "rental", id: row.id },
    );

    return assembleDto(updated);
  },
};
