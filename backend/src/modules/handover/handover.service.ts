import { randomUUID } from "node:crypto";
import { AppError } from "../../utils/AppError";
import { storage } from "../../storage";
import type { HandoverStep, HandoverType } from "../../db/types";
import { itemAccessoriesRepository } from "../items/item-accessories.repository";
import { itemsRepository } from "../items/items.repository";
import { notificationsService } from "../notifications/notifications.service";
import { billingRepository } from "../rentals/billing.repository";
import { rentalsRepository } from "../rentals/rentals.repository";
import { handoverMediaRepository } from "./handover-media.repository";
import { handoverRepository } from "./handover.repository";
import { toHandoverMediaDto, toHandoverRecordDto, type HandoverRecordDto } from "./handover.types";
import { computeRequiredSteps } from "./requiredSteps";

const IMAGE_STEPS: HandoverStep[] = ["FRONT", "BACK", "LEFT", "RIGHT", "DAMAGE", "SERIAL", "ACCESSORIES"];
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

async function loadRental(rentalId: string) {
  const rental = await rentalsRepository.findById(rentalId);
  if (!rental) throw AppError.notFound("Rental not found");
  return rental;
}

function assertParticipant(rental: { renter_id: string; owner_id: string }, userId: string) {
  if (rental.renter_id !== userId && rental.owner_id !== userId) {
    throw AppError.notFound("Rental not found");
  }
}

async function requiredStepsForItem(itemId: string): Promise<HandoverStep[]> {
  const [item, accessories] = await Promise.all([
    itemsRepository.findById(itemId),
    itemAccessoriesRepository.listByItemId(itemId),
  ]);
  return computeRequiredSteps(!!item?.serial_number, accessories.length > 0);
}

export const handoverService = {
  async uploadMedia(
    rentalId: string,
    requesterId: string,
    type: HandoverType,
    step: HandoverStep,
    file: Express.Multer.File,
  ) {
    const rental = await loadRental(rentalId);
    assertParticipant(rental, requesterId);

    const isVideoStep = step === "VIDEO";
    const isVideoFile = file.mimetype.startsWith("video/");
    if (isVideoStep && !isVideoFile) {
      throw AppError.badRequest("The VIDEO step requires a video file", "STEP_MEDIA_MISMATCH");
    }
    if (!isVideoStep && isVideoFile) {
      throw AppError.badRequest("Photo steps require an image file", "STEP_MEDIA_MISMATCH");
    }
    if (!isVideoStep && !IMAGE_STEPS.includes(step)) {
      throw AppError.badRequest("Invalid step", "INVALID_STEP");
    }

    let linkedRecordId: string | null = null;
    if (type === "PICKUP") {
      if (rental.owner_id !== requesterId) {
        throw AppError.forbidden("Only the item owner documents the pickup");
      }
      if (rental.status !== "ACCEPTED" && rental.status !== "READY_FOR_HANDOVER") {
        throw AppError.conflict("Pickup documentation is not open at this stage", "INVALID_STATUS");
      }
    } else {
      if (rental.renter_id !== requesterId) {
        throw AppError.forbidden("Only the renter documents the return");
      }
      if (rental.status !== "ACTIVE" && rental.status !== "RETURN_PENDING") {
        throw AppError.conflict("Return documentation is not open at this stage", "INVALID_STATUS");
      }
      const pickup = await handoverRepository.findByRentalAndType(rentalId, "PICKUP");
      linkedRecordId = pickup?.id ?? null;
    }

    const record = await handoverRepository.getOrCreate(rentalId, type, requesterId, linkedRecordId);

    const ext = MIME_EXTENSIONS[file.mimetype] ?? "bin";
    const saved = await storage.save(file.buffer, {
      subdir: `handover/${rentalId}/${type.toLowerCase()}/${step.toLowerCase()}`,
      filename: `${randomUUID()}.${ext}`,
      contentType: file.mimetype,
    });

    const media = await handoverMediaRepository.add({
      handoverRecordId: record.id,
      step,
      mediaType: isVideoFile ? "video" : "photo",
      url: saved.url,
      uploadedBy: requesterId,
    });
    return toHandoverMediaDto(media);
  },

  async markReady(rentalId: string, requesterId: string, type: HandoverType, notes?: string) {
    const rental = await loadRental(rentalId);

    if (type === "PICKUP") {
      if (rental.owner_id !== requesterId) throw AppError.forbidden("Only the item owner can do this");
      if (rental.status !== "ACCEPTED") {
        throw AppError.conflict("Rental is not awaiting pickup documentation", "INVALID_STATUS");
      }
    } else {
      if (rental.renter_id !== requesterId) throw AppError.forbidden("Only the renter can do this");
      if (rental.status !== "ACTIVE") {
        throw AppError.conflict("Rental is not awaiting return documentation", "INVALID_STATUS");
      }
    }

    const record = await handoverRepository.findByRentalAndType(rentalId, type);
    if (!record) throw AppError.badRequest("No media uploaded yet", "NO_MEDIA");

    const required = await requiredStepsForItem(rental.item_id);
    const uploadedSteps = new Set(
      (await handoverMediaRepository.distinctStepsForRecord(record.id)).map((r) => r.step),
    );
    const missing = required.filter((step) => !uploadedSteps.has(step));
    if (missing.length > 0) {
      throw AppError.badRequest(`Missing required steps: ${missing.join(", ")}`, "MISSING_STEPS");
    }

    if (notes) {
      await handoverRepository.update(record.id, { condition_notes: notes });
    }

    const nextStatus = type === "PICKUP" ? "READY_FOR_HANDOVER" : "RETURN_PENDING";
    const updated = await rentalsRepository.update(rentalId, { status: nextStatus });

    const otherPartyId = type === "PICKUP" ? rental.renter_id : rental.owner_id;
    await notificationsService.notify(
      otherPartyId,
      type === "PICKUP" ? "handover_ready" : "return_ready",
      type === "PICKUP" ? "Teslim için hazır" : "İade için hazır",
      type === "PICKUP"
        ? "Eşya sahibi teslim belgelerini tamamladı, onayını bekliyor."
        : "Kiracı iade belgelerini tamamladı, onayını bekliyor.",
      { type: "rental", id: rentalId },
    );

    return updated;
  },

  async confirm(rentalId: string, requesterId: string, type: HandoverType) {
    const rental = await loadRental(rentalId);

    if (type === "PICKUP") {
      if (rental.renter_id !== requesterId) throw AppError.forbidden("Only the renter can confirm pickup");
      if (rental.status !== "READY_FOR_HANDOVER") {
        throw AppError.conflict("Rental is not ready for pickup confirmation", "INVALID_STATUS");
      }
    } else {
      if (rental.owner_id !== requesterId) throw AppError.forbidden("Only the item owner can confirm return");
      if (rental.status !== "RETURN_PENDING") {
        throw AppError.conflict("Rental is not ready for return confirmation", "INVALID_STATUS");
      }
    }

    const record = await handoverRepository.findByRentalAndType(rentalId, type);
    if (!record) throw AppError.badRequest("No handover record found", "NO_RECORD");

    await handoverRepository.update(record.id, {
      confirmed_by: requesterId,
      confirmed_at: new Date(),
      status: "completed",
    });

    let updated;
    if (type === "PICKUP") {
      updated = await rentalsRepository.update(rentalId, { status: "ACTIVE" });
      await notificationsService.notify(
        rental.owner_id,
        "pickup_confirmed",
        "Teslim onaylandı",
        "Kiracı eşyayı teslim aldığını onayladı, kiralama şimdi aktif.",
        { type: "rental", id: rentalId },
      );
    } else {
      updated = await rentalsRepository.update(rentalId, { status: "COMPLETED", completed_at: new Date() });
      await billingRepository.releaseDeposit(rentalId);
      await notificationsService.notify(
        rental.renter_id,
        "return_confirmed",
        "İade onaylandı",
        "Eşya sahibi iadeyi onayladı, güvence bedelin serbest bırakıldı.",
        { type: "rental", id: rentalId },
      );
    }

    return updated;
  },

  async getSummary(rentalId: string, requesterId: string) {
    const rental = await loadRental(rentalId);
    assertParticipant(rental, requesterId);
    return buildSummary(rentalId, rental.item_id);
  },

  /** Admin-only: skips the participant check. Callers must gate on req.auth.role themselves. */
  async getSummaryForAdmin(rentalId: string) {
    const rental = await loadRental(rentalId);
    return buildSummary(rentalId, rental.item_id);
  },
};

async function buildSummary(rentalId: string, itemId: string) {
  const [pickup, ret, required] = await Promise.all([
    handoverRepository.findByRentalAndType(rentalId, "PICKUP"),
    handoverRepository.findByRentalAndType(rentalId, "RETURN"),
    requiredStepsForItem(itemId),
  ]);

  const recordIds = [pickup?.id, ret?.id].filter((id): id is string => !!id);
  const allMedia = await handoverMediaRepository.listByRecordIds(recordIds);

  let pickupDto: HandoverRecordDto | null = null;
  let returnDto: HandoverRecordDto | null = null;
  if (pickup) pickupDto = toHandoverRecordDto(pickup, allMedia.filter((m) => m.handover_record_id === pickup.id));
  if (ret) returnDto = toHandoverRecordDto(ret, allMedia.filter((m) => m.handover_record_id === ret.id));

  return { pickup: pickupDto, return: returnDto, requiredSteps: required };
}
