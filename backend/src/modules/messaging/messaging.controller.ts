import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { messagingService } from "./messaging.service";
import { sendMessageSchema, startConversationSchema } from "./messaging.validation";

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw AppError.badRequest(`${name} is required`);
  return value;
}

export const messagingController = {
  async start(req: Request, res: Response) {
    const input = startConversationSchema.parse(req.body);
    const conversation = await messagingService.startOrGet(req.auth!.userId, input);
    res.status(201).json({ conversation });
  },

  async list(req: Request, res: Response) {
    const conversations = await messagingService.listMine(req.auth!.userId);
    const unreadCount = await messagingService.getUnreadCount(req.auth!.userId);
    res.json({ conversations, unreadCount });
  },

  async listMessages(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const messages = await messagingService.getMessages(id, req.auth!.userId);
    res.json({ messages });
  },

  async sendMessage(req: Request, res: Response) {
    const id = requireParam(req, "id");
    const { content } = sendMessageSchema.parse(req.body);
    const message = await messagingService.sendMessage(id, req.auth!.userId, content);
    res.status(201).json({ message });
  },
};
