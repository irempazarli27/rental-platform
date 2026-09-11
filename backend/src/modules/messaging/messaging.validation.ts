import { z } from "zod";

export const startConversationSchema = z.object({
  recipientId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  rentalId: z.string().uuid().optional(),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
