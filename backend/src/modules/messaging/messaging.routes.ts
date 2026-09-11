import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { messagingController } from "./messaging.controller";

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

conversationsRouter.post("/", asyncHandler(messagingController.start));
conversationsRouter.get("/", asyncHandler(messagingController.list));
conversationsRouter.get("/:id/messages", asyncHandler(messagingController.listMessages));
conversationsRouter.post("/:id/messages", asyncHandler(messagingController.sendMessage));
