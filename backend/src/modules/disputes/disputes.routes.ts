import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { uploadHandoverMediaSingle } from "../../middleware/upload";
import { asyncHandler } from "../../utils/asyncHandler";
import { disputesController } from "./disputes.controller";

export const disputesRouter = Router();

disputesRouter.use(requireAuth);

disputesRouter.get("/:disputeId", asyncHandler(disputesController.getById));
disputesRouter.post(
  "/:disputeId/evidence",
  uploadHandoverMediaSingle("media"),
  asyncHandler(disputesController.addEvidence),
);
