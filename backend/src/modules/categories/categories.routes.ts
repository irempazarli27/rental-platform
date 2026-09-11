import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { categoriesController } from "./categories.controller";

export const categoriesRouter = Router();

categoriesRouter.get("/", asyncHandler(categoriesController.list));
