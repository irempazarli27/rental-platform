import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const accessorySchema = z.object({
  name: z.string().trim().min(1).max(150),
  quantity: z.coerce.number().int().positive().max(1000).default(1),
});

export const createItemSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(5000),
  categoryId: z.string().uuid(),
  brand: z.string().trim().max(100).optional(),
  model: z.string().trim().max(100).optional(),
  serialNumber: z.string().trim().max(100).optional(),
  condition: z.enum(["new", "like_new", "good", "fair"]).default("good"),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  dailyPrice: z.coerce.number().positive().max(1_000_000),
  weeklyPrice: z.coerce.number().positive().max(5_000_000).optional(),
  depositAmount: z.coerce.number().min(0).max(1_000_000).default(0),
  deliveryMethod: z.enum(["pickup", "delivery", "both"]).default("pickup"),
  city: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  status: z.enum(["draft", "active"]).default("active"),
  accessories: z.array(accessorySchema).max(30).default([]),
});
export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = createItemSchema
  .omit({ status: true })
  .partial()
  .extend({
    status: z.enum(["draft", "active", "paused"]).optional(),
  });
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export const listItemsQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(150).optional(),
    categoryId: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    city: z.string().trim().max(100).optional(),
    condition: z.enum(["new", "like_new", "good", "fair"]).optional(),
    riskLevel: z.enum(["low", "medium", "high"]).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(500).optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((v) => (v.startDate == null) === (v.endDate == null), {
    message: "startDate and endDate must be provided together",
    path: ["endDate"],
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    message: "endDate must not be before startDate",
    path: ["endDate"],
  })
  .refine((v) => (v.lat == null) === (v.lng == null), {
    message: "lat and lng must be provided together",
    path: ["lng"],
  });
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;

export const availabilityBlockSchema = z
  .object({
    startDate: dateString,
    endDate: dateString,
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "endDate must not be before startDate",
    path: ["endDate"],
  });
export type AvailabilityBlockInput = z.infer<typeof availabilityBlockSchema>;
