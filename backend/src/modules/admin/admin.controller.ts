import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { adminDisputesService } from "./adminDisputes.service";
import { adminUsersService } from "./adminUsers.service";
import { adminItemsService } from "./adminItems.service";
import { adminRentalsService } from "./adminRentals.service";
import { adminStatsService } from "./adminStats.service";
import { adminMessagesService } from "./adminMessages.service";
import { resolveDisputeSchema } from "../disputes/disputes.validation";
import {
  listItemsQuerySchema,
  listRentalsQuerySchema,
  listUsersQuerySchema,
  suspendUserSchema,
} from "./admin.validation";
import type { DisputeStatus } from "../../db/types";

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw AppError.badRequest(`${name} is required`);
  return value;
}

export const adminController = {
  async listDisputes(req: Request, res: Response) {
    const status = req.query.status as DisputeStatus | undefined;
    const disputes = await adminDisputesService.list(status);
    res.json({ disputes });
  },

  async getDispute(req: Request, res: Response) {
    const disputeId = requireParam(req, "id");
    const detail = await adminDisputesService.getDetail(disputeId);
    res.json(detail);
  },

  async resolveDispute(req: Request, res: Response) {
    const disputeId = requireParam(req, "id");
    const input = resolveDisputeSchema.parse(req.body);
    const dispute = await adminDisputesService.resolve(disputeId, req.auth!.userId, input);
    res.json({ dispute });
  },

  async listUsers(req: Request, res: Response) {
    const { page, pageSize, q } = listUsersQuerySchema.parse(req.query);
    const result = await adminUsersService.list(page, pageSize, q);
    res.json(result);
  },

  async suspendUser(req: Request, res: Response) {
    const userId = requireParam(req, "id");
    const { reason } = suspendUserSchema.parse(req.body);
    const user = await adminUsersService.suspend(userId, req.auth!.userId, reason);
    res.json({ user });
  },

  async activateUser(req: Request, res: Response) {
    const userId = requireParam(req, "id");
    const user = await adminUsersService.activate(userId, req.auth!.userId);
    res.json({ user });
  },

  async listItems(req: Request, res: Response) {
    const { page, pageSize, status } = listItemsQuerySchema.parse(req.query);
    const result = await adminItemsService.list(page, pageSize, status);
    res.json(result);
  },

  async removeItem(req: Request, res: Response) {
    const itemId = requireParam(req, "id");
    const { reason } = suspendUserSchema.parse(req.body);
    const item = await adminItemsService.remove(itemId, req.auth!.userId, reason);
    res.json({ item });
  },

  async listRentals(req: Request, res: Response) {
    const { page, pageSize, status } = listRentalsQuerySchema.parse(req.query);
    const result = await adminRentalsService.list(page, pageSize, status);
    res.json(result);
  },

  async getStats(_req: Request, res: Response) {
    const stats = await adminStatsService.getStats();
    res.json(stats);
  },

  async listFlaggedMessages(_req: Request, res: Response) {
    const messages = await adminMessagesService.listFlagged();
    res.json({ messages });
  },
};
