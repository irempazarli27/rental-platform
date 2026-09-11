import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { disputesService } from "./disputes.service";
import { addEvidenceSchema, openDisputeSchema } from "./disputes.validation";

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw AppError.badRequest(`${name} is required`);
  return value;
}

export const disputesController = {
  async open(req: Request, res: Response) {
    const rentalId = requireParam(req, "id");
    const input = openDisputeSchema.parse(req.body);
    const dispute = await disputesService.open(rentalId, req.auth!.userId, input);
    res.status(201).json({ dispute });
  },

  async listForRental(req: Request, res: Response) {
    const rentalId = requireParam(req, "id");
    const disputes =
      req.auth!.role === "admin"
        ? await disputesService.listForRentalAsAdmin(rentalId)
        : await disputesService.listForRental(rentalId, req.auth!.userId);
    res.json({ disputes });
  },

  async getById(req: Request, res: Response) {
    const disputeId = requireParam(req, "disputeId");
    const dispute = await disputesService.getDetail(disputeId, req.auth!.userId);
    res.json({ dispute });
  },

  async addEvidence(req: Request, res: Response) {
    const disputeId = requireParam(req, "disputeId");
    const input = addEvidenceSchema.parse(req.body);
    const file = req.file;
    if (!file) throw AppError.badRequest("media file is required");
    const evidence = await disputesService.addEvidence(disputeId, req.auth!.userId, input, file);
    res.status(201).json({ evidence });
  },
};
