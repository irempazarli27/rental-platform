import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { damageService } from "./damage.service";
import { createDamageReportSchema } from "./damage.validation";

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw AppError.badRequest(`${name} is required`);
  return value;
}

export const damageController = {
  async create(req: Request, res: Response) {
    const rentalId = requireParam(req, "id");
    const input = createDamageReportSchema.parse(req.body);
    const report = await damageService.create(rentalId, req.auth!.userId, input);
    res.status(201).json({ report });
  },

  async list(req: Request, res: Response) {
    const rentalId = requireParam(req, "id");
    const reports =
      req.auth!.role === "admin"
        ? await damageService.listForAdmin(rentalId)
        : await damageService.list(rentalId, req.auth!.userId);
    res.json({ reports });
  },
};
