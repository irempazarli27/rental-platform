import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const createRentalSchema = z
  .object({
    itemId: z.string().uuid(),
    startDate: dateString,
    endDate: dateString,
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "endDate must not be before startDate",
    path: ["endDate"],
  })
  .refine((v) => v.startDate >= new Date().toISOString().slice(0, 10), {
    message: "startDate must not be in the past",
    path: ["startDate"],
  });
export type CreateRentalInput = z.infer<typeof createRentalSchema>;

export const listRentalsQuerySchema = z.object({
  role: z.enum(["renter", "owner"]).optional(),
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
export type ListRentalsQuery = z.infer<typeof listRentalsQuerySchema>;
