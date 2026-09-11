import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { rentalsService } from "./rentals.service";
import { createRentalSchema, listRentalsQuerySchema } from "./rentals.validation";

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw AppError.badRequest(`${name} is required`);
  return value;
}

export const rentalsController = {
  async create(req: Request, res: Response) {
    const input = createRentalSchema.parse(req.body);
    const rental = await rentalsService.create(req.auth!.userId, input);
    res.status(201).json({ rental });
  },

  async list(req: Request, res: Response) {
    const query = listRentalsQuerySchema.parse(req.query);
    const rentals = await rentalsService.listMine(req.auth!.userId, query);
    res.json({ rentals });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const rental =
      req.auth!.role === "admin"
        ? await rentalsService.getDetailForAdmin(id)
        : await rentalsService.getDetail(id, req.auth!.userId);
    res.json({ rental });
  },

  async accept(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const rental = await rentalsService.accept(id, req.auth!.userId);
    res.json({ rental });
  },

  async reject(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const rental = await rentalsService.reject(id, req.auth!.userId);
    res.json({ rental });
  },

  async cancel(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const rental = await rentalsService.cancel(id, req.auth!.userId);
    res.json({ rental });
  },
};
