import { randomUUID } from "node:crypto";
import { AppError } from "../../utils/AppError";
import { storage } from "../../storage";
import { notificationsService } from "../notifications/notifications.service";
import { rentalsRepository } from "../rentals/rentals.repository";
import { disputesRepository } from "./disputes.repository";
import { toDisputeDto, toEvidenceDto, type DisputeDto, type DisputeEvidenceDto } from "./disputes.types";
import type { AddEvidenceInput, OpenDisputeInput } from "./disputes.validation";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function assertParticipant(rental: { renter_id: string; owner_id: string }, userId: string) {
  if (rental.renter_id !== userId && rental.owner_id !== userId) {
    throw AppError.notFound("Rental not found");
  }
}

async function loadDisputeForParticipant(disputeId: string, userId: string) {
  const dispute = await disputesRepository.findById(disputeId);
  if (!dispute) throw AppError.notFound("Dispute not found");
  const rental = await rentalsRepository.findById(dispute.rental_id);
  if (!rental) throw AppError.notFound("Dispute not found");
  assertParticipant(rental, userId);
  return dispute;
}

async function listWithEvidence(rentalId: string): Promise<DisputeDto[]> {
  const disputes = await disputesRepository.listForRental(rentalId);
  return Promise.all(disputes.map(async (d) => toDisputeDto(d, await disputesRepository.listEvidence(d.id))));
}

export const disputesService = {
  async open(rentalId: string, userId: string, input: OpenDisputeInput): Promise<DisputeDto> {
    const rental = await rentalsRepository.findById(rentalId);
    if (!rental) throw AppError.notFound("Rental not found");
    assertParticipant(rental, userId);

    if (rental.status !== "ACTIVE" && rental.status !== "RETURN_PENDING") {
      throw AppError.conflict(
        "Disputes can only be opened while the rental is active or return is pending",
        "INVALID_STATUS",
      );
    }

    const existing = await disputesRepository.findOpenOrUnderReviewForRental(rentalId);
    if (existing) {
      throw AppError.conflict("This rental already has an open dispute", "DISPUTE_ALREADY_OPEN");
    }

    const dispute = await disputesRepository.create({ rentalId, openedBy: userId, reason: input.reason });
    await rentalsRepository.update(rentalId, { status: "DISPUTED" });

    const otherPartyId = userId === rental.renter_id ? rental.owner_id : rental.renter_id;
    await notificationsService.notify(
      otherPartyId,
      "dispute_opened",
      "Uyuşmazlık açıldı",
      "Kiralaman için bir uyuşmazlık kaydı açıldı, kanıt ekleyebilirsin.",
      { type: "rental", id: rentalId },
    );

    return toDisputeDto(dispute, []);
  },

  async listForRental(rentalId: string, userId: string): Promise<DisputeDto[]> {
    const rental = await rentalsRepository.findById(rentalId);
    if (!rental) throw AppError.notFound("Rental not found");
    assertParticipant(rental, userId);
    return listWithEvidence(rentalId);
  },

  /** Admin-only: skips the participant check. Callers must gate on req.auth.role themselves. */
  async listForRentalAsAdmin(rentalId: string): Promise<DisputeDto[]> {
    return listWithEvidence(rentalId);
  },

  async getDetail(disputeId: string, userId: string): Promise<DisputeDto> {
    const dispute = await loadDisputeForParticipant(disputeId, userId);
    const evidence = await disputesRepository.listEvidence(dispute.id);
    return toDisputeDto(dispute, evidence);
  },

  async addEvidence(
    disputeId: string,
    userId: string,
    input: AddEvidenceInput,
    file: Express.Multer.File,
  ): Promise<DisputeEvidenceDto> {
    await loadDisputeForParticipant(disputeId, userId);

    const ext = MIME_EXTENSIONS[file.mimetype] ?? "bin";
    const saved = await storage.save(file.buffer, {
      subdir: `disputes/${disputeId}`,
      filename: `${randomUUID()}.${ext}`,
      contentType: file.mimetype,
    });

    const evidence = await disputesRepository.addEvidence({
      disputeId,
      uploadedBy: userId,
      mediaUrl: saved.url,
      description: input.description ?? null,
    });

    return toEvidenceDto(evidence);
  },
};
