import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import type { HandoverType } from "../../db/types";
import { rentalsService } from "../rentals/rentals.service";
import { handoverService } from "./handover.service";
import { confirmSchema, readySchema, uploadMediaSchema } from "./handover.validation";

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw AppError.badRequest(`${name} is required`);
  return value;
}

function handlersFor(type: HandoverType) {
  return {
    async uploadMedia(req: Request, res: Response) {
      const rentalId = requireParam(req, "id");
      const { step } = uploadMediaSchema.parse(req.body);
      const file = req.file;
      if (!file) throw AppError.badRequest("media file is required");
      const media = await handoverService.uploadMedia(rentalId, req.auth!.userId, type, step, file);
      res.status(201).json({ media });
    },

    async ready(req: Request, res: Response) {
      const rentalId = requireParam(req, "id");
      const { notes } = readySchema.parse(req.body ?? {});
      await handoverService.markReady(rentalId, req.auth!.userId, type, notes);
      const rental = await rentalsService.getDetail(rentalId, req.auth!.userId);
      res.json({ rental });
    },

    async confirm(req: Request, res: Response) {
      const rentalId = requireParam(req, "id");
      confirmSchema.parse(req.body ?? {});
      await handoverService.confirm(rentalId, req.auth!.userId, type);
      const rental = await rentalsService.getDetail(rentalId, req.auth!.userId);
      res.json({ rental });
    },
  };
}

export const handoverController = {
  pickup: handlersFor("PICKUP"),
  return: handlersFor("RETURN"),

  async getSummary(req: Request, res: Response) {
    const rentalId = requireParam(req, "id");
    const summary =
      req.auth!.role === "admin"
        ? await handoverService.getSummaryForAdmin(rentalId)
        : await handoverService.getSummary(rentalId, req.auth!.userId);
    res.json(summary);
  },
};
