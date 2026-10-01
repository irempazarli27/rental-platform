import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { itemsService } from "../items/items.service";
import { ownerInsightsService } from "../rentals/ownerInsights.service";
import { reviewsService } from "../reviews/reviews.service";
import { usersService } from "./users.service";
import { updateProfileSchema } from "./users.validation";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG biçiminde olmalı");
const MAX_CALENDAR_DAYS = 62;
const calendarQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((v) => v.from <= v.to, { message: "from, to tarihinden sonra olamaz", path: ["to"] })
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 < MAX_CALENDAR_DAYS, {
    message: `Aralık en fazla ${MAX_CALENDAR_DAYS} gün olabilir`,
    path: ["to"],
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

  async myCalendar(req: Request, res: Response) {
    const { from, to } = calendarQuerySchema.parse(req.query);
    res.json(await ownerInsightsService.calendar(req.auth!.userId, from, to));
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
