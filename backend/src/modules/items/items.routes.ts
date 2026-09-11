import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middleware/auth";
import { uploadImagesArray } from "../../middleware/upload";
import { asyncHandler } from "../../utils/asyncHandler";
import { itemsController } from "./items.controller";

export const itemsRouter = Router();

itemsRouter.post("/", requireAuth, asyncHandler(itemsController.create));
itemsRouter.get("/", asyncHandler(itemsController.list));
itemsRouter.get("/:id", optionalAuth, asyncHandler(itemsController.getById));
itemsRouter.patch("/:id", requireAuth, asyncHandler(itemsController.update));
itemsRouter.delete("/:id", requireAuth, asyncHandler(itemsController.remove));

itemsRouter.post(
  "/:id/images",
  requireAuth,
  uploadImagesArray("images"),
  asyncHandler(itemsController.uploadImages),
);
itemsRouter.delete("/:id/images/:imageId", requireAuth, asyncHandler(itemsController.deleteImage));

itemsRouter.get("/:id/availability", asyncHandler(itemsController.listAvailability));
itemsRouter.post(
  "/:id/availability-blocks",
  requireAuth,
  asyncHandler(itemsController.createAvailabilityBlock),
);
itemsRouter.delete(
  "/:id/availability-blocks/:blockId",
  requireAuth,
  asyncHandler(itemsController.deleteAvailabilityBlock),
);
