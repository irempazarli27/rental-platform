import { AppError } from "../../utils/AppError";
import { handoverRepository } from "../handover/handover.repository";
import { notificationsService } from "../notifications/notifications.service";
import { rentalsRepository } from "../rentals/rentals.repository";
import { damageRepository } from "./damage.repository";
import { toDamageReportDto } from "./damage.types";
import type { CreateDamageReportInput } from "./damage.validation";

export const damageService = {
  async create(rentalId: string, requesterId: string, input: CreateDamageReportInput) {
    const rental = await rentalsRepository.findById(rentalId);
    if (!rental) throw AppError.notFound("Rental not found");
    if (rental.renter_id !== requesterId && rental.owner_id !== requesterId) {
      throw AppError.notFound("Rental not found");
    }

    let handoverRecordId: string | null = null;
    if (input.handoverType) {
      const record = await handoverRepository.findByRentalAndType(rentalId, input.handoverType);
      handoverRecordId = record?.id ?? null;
    }

    const report = await damageRepository.create({
      rentalId,
      handoverRecordId,
      reportedBy: requesterId,
      description: input.description,
      severity: input.severity,
    });

    const otherPartyId = requesterId === rental.renter_id ? rental.owner_id : rental.renter_id;
    await notificationsService.notify(
      otherPartyId,
      "damage_reported",
      "Hasar bildirimi",
      "Kiralaman için bir hasar bildirimi oluşturuldu.",
      { type: "rental", id: rentalId },
    );

    return toDamageReportDto(report);
  },

  async list(rentalId: string, requesterId: string) {
    const rental = await rentalsRepository.findById(rentalId);
    if (!rental) throw AppError.notFound("Rental not found");
    if (rental.renter_id !== requesterId && rental.owner_id !== requesterId) {
      throw AppError.notFound("Rental not found");
    }

    const reports = await damageRepository.listByRentalId(rentalId);
    return reports.map(toDamageReportDto);
  },

  /** Admin-only: skips the participant check. Callers must gate on req.auth.role themselves. */
  async listForAdmin(rentalId: string) {
    const reports = await damageRepository.listByRentalId(rentalId);
    return reports.map(toDamageReportDto);
  },
};
