import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { reviewsService } from "./reviews.service";
import { createReviewSchema } from "./reviews.validation";

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw AppError.badRequest(`${name} is required`);
  return value;
}

export const reviewsController = {
  async create(req: Request, res: Response) {
    const rentalId = requireParam(req, "id");
    const input = createReviewSchema.parse(req.body);
    const review = await reviewsService.create(rentalId, req.auth!.userId, input);
    res.status(201).json({ review });
  },

  async listForRental(req: Request, res: Response) {
    const rentalId = requireParam(req, "id");
    const reviews = await reviewsService.listForRental(rentalId, req.auth!.userId);
    res.json({ reviews });
  },

  async listForUser(req: Request, res: Response) {
    const userId = requireParam(req, "id");
    const reviews = await reviewsService.listPublicForUser(userId);
    res.json({ reviews });
  },
};
