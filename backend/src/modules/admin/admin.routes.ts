import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { adminController } from "./admin.controller";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/stats", asyncHandler(adminController.getStats));

adminRouter.get("/users", asyncHandler(adminController.listUsers));
adminRouter.patch("/users/:id/suspend", asyncHandler(adminController.suspendUser));
adminRouter.patch("/users/:id/activate", asyncHandler(adminController.activateUser));

adminRouter.get("/items", asyncHandler(adminController.listItems));
adminRouter.delete("/items/:id", asyncHandler(adminController.removeItem));

adminRouter.get("/rentals", asyncHandler(adminController.listRentals));

adminRouter.get("/disputes", asyncHandler(adminController.listDisputes));
adminRouter.get("/disputes/:id", asyncHandler(adminController.getDispute));
adminRouter.patch("/disputes/:id/resolve", asyncHandler(adminController.resolveDispute));

adminRouter.get("/messages/flagged", asyncHandler(adminController.listFlaggedMessages));
