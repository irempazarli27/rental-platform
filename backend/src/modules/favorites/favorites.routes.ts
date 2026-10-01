import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { favoritesService } from "./favorites.service";

const itemIdSchema = z.string().uuid();

export const favoritesRouter = Router();

favoritesRouter.use(requireAuth);

favoritesRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ items: await favoritesService.list(req.auth!.userId) });
  }),
);

favoritesRouter.put(
  "/:itemId",
  asyncHandler(async (req: Request, res: Response) => {
    await favoritesService.add(req.auth!.userId, itemIdSchema.parse(req.params.itemId));
    res.status(204).send();
  }),
);

favoritesRouter.delete(
  "/:itemId",
  asyncHandler(async (req: Request, res: Response) => {
    await favoritesService.remove(req.auth!.userId, itemIdSchema.parse(req.params.itemId));
    res.status(204).send();
  }),
);
