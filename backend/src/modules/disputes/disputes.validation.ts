import { z } from "zod";

export const openDisputeSchema = z.object({
  reason: z.string().trim().min(10).max(2000),
});
export type OpenDisputeInput = z.infer<typeof openDisputeSchema>;

export const addEvidenceSchema = z.object({
  description: z.string().trim().max(1000).optional(),
});
export type AddEvidenceInput = z.infer<typeof addEvidenceSchema>;

export const resolveDisputeSchema = z
  .object({
    status: z.enum(["resolved_favor_owner", "resolved_favor_renter", "resolved_split"]),
    resolutionNotes: z.string().trim().min(10).max(4000),
    claimedAmount: z.coerce.number().min(0).optional(),
  })
  .refine((v) => v.status !== "resolved_split" || v.claimedAmount != null, {
    message: "claimedAmount is required for a split resolution",
    path: ["claimedAmount"],
  });
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
