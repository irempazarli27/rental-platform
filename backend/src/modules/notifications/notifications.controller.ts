import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { notificationsService } from "./notifications.service";

export const notificationsController = {
  async list(req: Request, res: Response) {
    const result = await notificationsService.list(req.auth!.userId);
    res.json(result);
  },

  async markRead(req: Request, res: Response) {
    const id = req.params.id;
    if (!id) throw AppError.badRequest("id is required");
    await notificationsService.markRead(req.auth!.userId, id);
    res.status(204).send();
  },
};
