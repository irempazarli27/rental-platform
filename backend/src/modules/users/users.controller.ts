import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { itemsService } from "../items/items.service";
import { ownerInsightsService } from "../rentals/ownerInsights.service";
import { reviewsService } from "../reviews/reviews.service";
import { accountDeletionService } from "./accountDeletion.service";
import { usersService } from "./users.service";
import { updateProfileSchema } from "./users.validation";

const deleteAccountSchema = z.object({
  password: z.string().max(200).optional(),
  confirmEmail: z.string().max(255).optional(),
});

export const usersController = {
  async me(req: Request, res: Response) {
    const user = await usersService.getMe(req.auth!.userId);
    res.json({ user });
  },

  async myListings(req: Request, res: Response) {
    const items = await itemsService.listByOwner(req.auth!.userId);
    res.json({ items });
  },

  async myEarnings(req: Request, res: Response) {
    res.json({ earnings: await ownerInsightsService.earnings(req.auth!.userId) });
  },

  async deleteMe(req: Request, res: Response) {
    await accountDeletionService.deleteAccount(req.auth!.userId, deleteAccountSchema.parse(req.body ?? {}));
    res.status(204).send();
  },

  async updateMe(req: Request, res: Response) {
    const input = updateProfileSchema.parse(req.body);
    const user = await usersService.updateMe(req.auth!.userId, input);
    res.json({ user });
  },

  async publicProfile(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) throw AppError.badRequest("User id is required");
    const user = await usersService.getPublicProfile(id);
    res.json({ user });
  },

  async reviews(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) throw AppError.badRequest("User id is required");
    const reviews = await reviewsService.listPublicForUser(id);
    res.json({ reviews });
  },
};
