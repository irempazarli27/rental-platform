import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { reviewSummaryService } from "../reviews/reviewSummary.service";
import { ratingStats, reviewsService } from "../reviews/reviews.service";
import { itemsRepository } from "./items.repository";
import { itemsService } from "./items.service";
import {
  availabilityBlockSchema,
  createItemSchema,
  listItemsQuerySchema,
  updateItemSchema,
} from "./items.validation";

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw AppError.badRequest(`${name} is required`);
  return value;
}

export const itemsController = {
  async create(req: Request, res: Response) {
    const input = createItemSchema.parse(req.body);
    const item = await itemsService.create(req.auth!.userId, input);
    res.status(201).json({ item });
  },

  async list(req: Request, res: Response) {
    const query = listItemsQuerySchema.parse(req.query);
    const result = await itemsService.search(query);
    res.json(result);
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const item = await itemsService.getDetail(id, req.auth?.userId);
    res.json({ item });
  },

  async reviews(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const item = await itemsRepository.findById(id);
    if (!item || item.status === "deleted") throw AppError.notFound("Item not found");
    const reviews = await reviewsService.listPublicForItem(id);
    res.json({ reviews, ...ratingStats(reviews), summary: await reviewSummaryService.getForItem(id, reviews) });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const input = updateItemSchema.parse(req.body);
    const item = await itemsService.update(id, req.auth!.userId, input);
    res.json({ item });
  },

  async remove(req: Request, res: Response) {
    const id = requireParam(req, "id");
    await itemsService.softDelete(id, req.auth!.userId);
    res.status(204).send();
  },

  async uploadImages(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const images = await itemsService.addImages(id, req.auth!.userId, files);
    res.status(201).json({ images });
  },

  async deleteImage(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const imageId = requireParam(req, "imageId");
    await itemsService.deleteImage(id, req.auth!.userId, imageId);
    res.status(204).send();
  },

  async listAvailability(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const blocks = await itemsService.listAvailability(id);
    res.json({ blocks });
  },

  async createAvailabilityBlock(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const input = availabilityBlockSchema.parse(req.body);
    const block = await itemsService.createAvailabilityBlock(id, req.auth!.userId, input);
    res.status(201).json({ block });
  },

  async deleteAvailabilityBlock(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const blockId = requireParam(req, "blockId");
    await itemsService.deleteAvailabilityBlock(id, req.auth!.userId, blockId);
    res.status(204).send();
  },
};
