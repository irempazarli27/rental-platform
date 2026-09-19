import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { authRateLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/asyncHandler";
import { verificationController } from "./verification.controller";

export const verificationRouter = Router();

verificationRouter.use(requireAuth);

verificationRouter.get("/", asyncHandler(verificationController.status));
verificationRouter.post("/email/send", authRateLimiter, asyncHandler(verificationController.sendEmailCode));
verificationRouter.post("/email/confirm", authRateLimiter, asyncHandler(verificationController.confirmEmail));
verificationRouter.post("/phone/send", authRateLimiter, asyncHandler(verificationController.sendPhoneCode));
verificationRouter.post("/phone/confirm", authRateLimiter, asyncHandler(verificationController.confirmPhone));
verificationRouter.post("/id", authRateLimiter, asyncHandler(verificationController.verifyId));
