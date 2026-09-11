import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { uploadHandoverMediaSingle } from "../../middleware/upload";
import { asyncHandler } from "../../utils/asyncHandler";
import { damageController } from "../damage/damage.controller";
import { disputesController } from "../disputes/disputes.controller";
import { handoverController } from "../handover/handover.controller";
import { reviewsController } from "../reviews/reviews.controller";
import { rentalsController } from "./rentals.controller";

export const rentalsRouter = Router();

rentalsRouter.use(requireAuth);

rentalsRouter.post("/", asyncHandler(rentalsController.create));
rentalsRouter.get("/", asyncHandler(rentalsController.list));
rentalsRouter.get("/:id", asyncHandler(rentalsController.getById));
rentalsRouter.patch("/:id/accept", asyncHandler(rentalsController.accept));
rentalsRouter.patch("/:id/reject", asyncHandler(rentalsController.reject));
rentalsRouter.patch("/:id/cancel", asyncHandler(rentalsController.cancel));

rentalsRouter.get("/:id/handover", asyncHandler(handoverController.getSummary));

rentalsRouter.post(
  "/:id/handover/pickup/media",
  uploadHandoverMediaSingle("media"),
  asyncHandler(handoverController.pickup.uploadMedia),
);
rentalsRouter.patch("/:id/handover/pickup/ready", asyncHandler(handoverController.pickup.ready));
rentalsRouter.patch("/:id/handover/pickup/confirm", asyncHandler(handoverController.pickup.confirm));

rentalsRouter.post(
  "/:id/handover/return/media",
  uploadHandoverMediaSingle("media"),
  asyncHandler(handoverController.return.uploadMedia),
);
rentalsRouter.patch("/:id/handover/return/ready", asyncHandler(handoverController.return.ready));
rentalsRouter.patch("/:id/handover/return/confirm", asyncHandler(handoverController.return.confirm));

rentalsRouter.post("/:id/damage-reports", asyncHandler(damageController.create));
rentalsRouter.get("/:id/damage-reports", asyncHandler(damageController.list));

rentalsRouter.post("/:id/reviews", asyncHandler(reviewsController.create));
rentalsRouter.get("/:id/reviews", asyncHandler(reviewsController.listForRental));

rentalsRouter.post("/:id/disputes", asyncHandler(disputesController.open));
rentalsRouter.get("/:id/disputes", asyncHandler(disputesController.listForRental));
