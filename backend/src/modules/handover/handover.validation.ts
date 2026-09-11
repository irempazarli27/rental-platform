import { z } from "zod";

export const HANDOVER_STEPS = [
  "FRONT",
  "BACK",
  "LEFT",
  "RIGHT",
  "DAMAGE",
  "SERIAL",
  "ACCESSORIES",
  "VIDEO",
] as const;

export const uploadMediaSchema = z.object({
  step: z.enum(HANDOVER_STEPS),
});
export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;

export const readySchema = z.object({
  notes: z.string().trim().max(1000).optional(),
});
export type ReadyInput = z.infer<typeof readySchema>;

export const confirmSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
});
export type ConfirmInput = z.infer<typeof confirmSchema>;
