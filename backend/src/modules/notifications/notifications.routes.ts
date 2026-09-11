import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { notificationsController } from "./notifications.controller";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get("/", asyncHandler(notificationsController.list));
notificationsRouter.patch("/:id/read", asyncHandler(notificationsController.markRead));
