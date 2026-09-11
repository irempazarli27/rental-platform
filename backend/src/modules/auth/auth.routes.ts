import { Router } from "express";
import { authRateLimiter, refreshRateLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/asyncHandler";
import { authController } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, asyncHandler(authController.register));
authRouter.post("/login", authRateLimiter, asyncHandler(authController.login));
authRouter.post("/google", authRateLimiter, asyncHandler(authController.google));
authRouter.post("/refresh", refreshRateLimiter, asyncHandler(authController.refresh));
authRouter.post("/logout", authRateLimiter, asyncHandler(authController.logout));
