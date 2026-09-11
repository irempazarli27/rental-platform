import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listUsersQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(150).optional(),
});

export const listItemsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["draft", "active", "paused", "deleted"]).optional(),
});

export const listRentalsQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([
      "PENDING",
      "ACCEPTED",
      "REJECTED",
      "CANCELLED",
      "READY_FOR_HANDOVER",
      "ACTIVE",
      "RETURN_PENDING",
      "RETURNED",
      "COMPLETED",
      "DISPUTED",
    ])
    .optional(),
});

export const suspendUserSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});
