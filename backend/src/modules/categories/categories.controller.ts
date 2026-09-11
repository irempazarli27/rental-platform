import type { Request, Response } from "express";
import { categoriesService } from "./categories.service";

export const categoriesController = {
  async list(_req: Request, res: Response) {
    const categories = await categoriesService.list();
    res.json({ categories });
  },
};
