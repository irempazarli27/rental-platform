import { AppError } from "../../utils/AppError";
import type { ItemStatus } from "../../db/types";
import { itemImagesRepository } from "../items/item-images.repository";
import { itemsRepository } from "../items/items.repository";
import { toItemSummaryDto } from "../items/items.types";
import { usersRepository } from "../users/users.repository";
import { adminActionsRepository } from "./adminActions.repository";

export const adminItemsService = {
  async list(page: number, pageSize: number, status?: ItemStatus) {
    const { rows, total } = await itemsRepository.listAllForAdmin(page, pageSize, status);
    const covers = await itemImagesRepository.listCoversByItemIds(rows.map((r) => r.id));
    const coverByItemId = new Map(covers.map((c) => [c.item_id, c.url]));

    const ownerIds = [...new Set(rows.map((r) => r.owner_id))];
    const owners = await usersRepository.findByIds(ownerIds);
    const ownerById = new Map(owners.map((o) => [o.id, o.full_name]));

    const items = rows.map((row) => ({
      ...toItemSummaryDto(row, coverByItemId.get(row.id) ?? null),
      ownerName: ownerById.get(row.owner_id) ?? null,
    }));

    return { items, total, page, pageSize };
  },

  async remove(itemId: string, adminId: string, reason: string) {
    const item = await itemsRepository.findById(itemId);
    if (!item) throw AppError.notFound("Item not found");

    const updated = await itemsRepository.update(itemId, { status: "deleted" });
    await adminActionsRepository.log({
      adminId,
      actionType: "remove_listing",
      targetType: "item",
      targetId: itemId,
      notes: reason,
    });
    return toItemSummaryDto(updated, null);
  },
};
