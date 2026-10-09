import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { usersController } from "./users.controller";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, asyncHandler(usersController.me));
usersRouter.patch("/me", requireAuth, asyncHandler(usersController.updateMe));
usersRouter.get("/me/listings", requireAuth, asyncHandler(usersController.myListings));
usersRouter.get("/me/earnings", requireAuth, asyncHandler(usersController.myEarnings));
usersRouter.get("/:id", asyncHandler(usersController.publicProfile));
usersRouter.get("/:id/reviews", asyncHandler(usersController.reviews));
