import { Router, type Request, type Response } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { assistantRequestSchema, assistantService } from "./assistant.service";

export const assistantRouter = Router();

/** Lets the frontend hide AI features entirely when no key is configured. */
assistantRouter.get(
  "/status",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ enabled: assistantService.isEnabled() });
  }),
);

assistantRouter.post(
  "/assistant",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { messages } = assistantRequestSchema.parse(req.body);
    res.json({ reply: await assistantService.reply(req.auth!.userId, messages) });
  }),
);
