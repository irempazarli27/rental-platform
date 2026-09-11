import { AppError } from "../../utils/AppError";
import { billingRepository } from "../rentals/billing.repository";
import { rentalsRepository } from "../rentals/rentals.repository";
import { rentalsService } from "../rentals/rentals.service";
import { itemsRepository } from "../items/items.repository";
import { usersRepository } from "../users/users.repository";
import { handoverService } from "../handover/handover.service";
import { damageService } from "../damage/damage.service";
import { conversationsRepository } from "../messaging/conversations.repository";
import { messagesRepository } from "../messaging/messages.repository";
import { toMessageDto } from "../messaging/messaging.types";
import { notificationsService } from "../notifications/notifications.service";
import { disputesRepository } from "../disputes/disputes.repository";
import { toDisputeDto } from "../disputes/disputes.types";
import type { DisputeStatus } from "../../db/types";
import { adminActionsRepository } from "./adminActions.repository";
import type { ResolveDisputeInput } from "../disputes/disputes.validation";

export const adminDisputesService = {
  async list(status?: DisputeStatus) {
    const disputes = await disputesRepository.listAll(status);
    const rentalIds = [...new Set(disputes.map((d) => d.rental_id))];
    const rentals = await rentalsRepository.findByIds(rentalIds);
    const rentalById = new Map(rentals.map((r) => [r.id, r]));

    const itemIds = [...new Set(rentals.map((r) => r.item_id))];
    const items = await itemsRepository.findByIds(itemIds);
    const itemById = new Map(items.map((i) => [i.id, i]));

    return disputes.map((d) => {
      const rental = rentalById.get(d.rental_id);
      const item = rental ? itemById.get(rental.item_id) : undefined;
      return {
        id: d.id,
        rentalId: d.rental_id,
        itemTitle: item?.title ?? null,
        status: d.status,
        reason: d.reason,
        createdAt: d.created_at,
        resolvedAt: d.resolved_at,
      };
    });
  },

  async getDetail(disputeId: string) {
    const dispute = await disputesRepository.findById(disputeId);
    if (!dispute) throw AppError.notFound("Dispute not found");

    const evidence = await disputesRepository.listEvidence(dispute.id);
    const rental = await rentalsService.getDetailForAdmin(dispute.rental_id);
    const [handover, damageReports, openedByUser] = await Promise.all([
      handoverService.getSummaryForAdmin(dispute.rental_id),
      damageService.listForAdmin(dispute.rental_id),
      usersRepository.findById(dispute.opened_by),
    ]);

    // Best-effort: messages live in whichever conversation matches this rental's
    // participants + item — the same key conversations are deduped on.
    let messages: Awaited<ReturnType<typeof toMessageDto>>[] = [];
    if (rental.item?.id) {
      const conversation = await conversationsRepository.findByParticipantsAndItem(
        rental.renter?.id ?? "",
        rental.owner?.id ?? "",
        rental.item.id,
      );
      if (conversation) {
        const rows = await messagesRepository.listByConversationId(conversation.id);
        messages = rows.map(toMessageDto);
      }
    }

    return {
      dispute: toDisputeDto(dispute, evidence),
      openedByName: openedByUser?.full_name ?? null,
      rental,
      handover,
      damageReports,
      messages,
    };
  },

  async resolve(disputeId: string, adminId: string, input: ResolveDisputeInput) {
    const dispute = await disputesRepository.findById(disputeId);
    if (!dispute) throw AppError.notFound("Dispute not found");
    if (dispute.status !== "open" && dispute.status !== "under_review") {
      throw AppError.conflict("This dispute has already been resolved", "ALREADY_RESOLVED");
    }

    const rental = await rentalsRepository.findById(dispute.rental_id);
    if (!rental) throw AppError.notFound("Rental not found");

    const deposit = await billingRepository.findDepositByRentalId(dispute.rental_id);
    if (deposit) {
      if (input.status === "resolved_favor_renter") {
        await billingRepository.releaseDeposit(dispute.rental_id);
      } else if (input.status === "resolved_favor_owner") {
        await billingRepository.claimDeposit(dispute.rental_id, deposit.amount, input.resolutionNotes);
      } else {
        await billingRepository.claimDeposit(
          dispute.rental_id,
          String(input.claimedAmount ?? 0),
          input.resolutionNotes,
        );
      }
    }

    const resolved = await disputesRepository.resolve(disputeId, {
      status: input.status,
      resolutionNotes: input.resolutionNotes,
      resolvedBy: adminId,
    });

    await rentalsRepository.update(dispute.rental_id, {
      status: "COMPLETED",
      completed_at: rental.completed_at ?? new Date(),
    });

    await adminActionsRepository.log({
      adminId,
      actionType: "resolve_dispute",
      targetType: "dispute",
      targetId: disputeId,
      notes: input.resolutionNotes,
    });

    await Promise.all(
      [rental.renter_id, rental.owner_id].map((userId) =>
        notificationsService.notify(
          userId,
          "dispute_resolved",
          "Uyuşmazlık sonuçlandı",
          "Kiralaman için açılan uyuşmazlık admin tarafından sonuçlandırıldı.",
          { type: "rental", id: dispute.rental_id },
        ),
      ),
    );

    const evidence = await disputesRepository.listEvidence(disputeId);
    return toDisputeDto(resolved, evidence);
  },
};
