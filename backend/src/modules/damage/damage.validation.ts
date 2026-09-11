import { z } from "zod";

export const createDamageReportSchema = z.object({
  description: z.string().trim().min(5).max(2000),
  severity: z.enum(["minor", "moderate", "severe"]).default("minor"),
  handoverType: z.enum(["PICKUP", "RETURN"]).optional(),
});
export type CreateDamageReportInput = z.infer<typeof createDamageReportSchema>;
