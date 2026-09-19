import type { Request, Response } from "express";
import { z } from "zod";
import { verificationService } from "./verification.service";

const codeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Kod 6 haneli olmalı") });
const phoneSchema = z.object({ phone: z.string().trim().min(1, "Telefon numarası gerekli").max(30) });
const idSchema = z.object({
  tckn: z.string().trim().regex(/^\d{11}$/, "T.C. kimlik numarası 11 haneli olmalı"),
  consent: z.literal(true, { message: "Devam etmek için açık rıza vermelisin" }),
});

export const verificationController = {
  async status(req: Request, res: Response) {
    res.json({ verification: await verificationService.getStatus(req.auth!.userId) });
  },

  async sendEmailCode(req: Request, res: Response) {
    res.json(await verificationService.sendCode(req.auth!.userId, "email"));
  },

  async confirmEmail(req: Request, res: Response) {
    const { code } = codeSchema.parse(req.body);
    res.json({ verification: await verificationService.confirmCode(req.auth!.userId, "email", code) });
  },

  async sendPhoneCode(req: Request, res: Response) {
    const { phone } = phoneSchema.parse(req.body);
    res.json(await verificationService.sendCode(req.auth!.userId, "phone", phone));
  },

  async confirmPhone(req: Request, res: Response) {
    const { code } = codeSchema.parse(req.body);
    res.json({ verification: await verificationService.confirmCode(req.auth!.userId, "phone", code) });
  },

  async verifyId(req: Request, res: Response) {
    const { tckn } = idSchema.parse(req.body);
    res.json({ verification: await verificationService.verifyId(req.auth!.userId, tckn) });
  },
};
