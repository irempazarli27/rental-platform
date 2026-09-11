import { AppError } from "../../utils/AppError";
import { notificationsRepository } from "./notifications.repository";
import { toNotificationDto } from "./notifications.types";

export const notificationsService = {
  /** Fire-and-forget style helper for other modules — never throws into the caller's flow. */
  async notify(
    userId: string,
    type: string,
    title: string,
    body: string,
    relatedEntity?: { type: string; id: string },
  ) {
    try {
      await notificationsRepository.create({
        userId,
        type,
        title,
        body,
        relatedEntityType: relatedEntity?.type,
        relatedEntityId: relatedEntity?.id,
      });
    } catch (err) {
      console.error("Failed to create notification", err);
    }
  },

  async list(userId: string) {
    const [rows, unread] = await Promise.all([
      notificationsRepository.listForUser(userId),
      notificationsRepository.countUnread(userId),
    ]);
    return { notifications: rows.map(toNotificationDto), unreadCount: Number(unread?.count ?? 0) };
  },

  async markRead(userId: string, notificationId: string) {
    const notification = await notificationsRepository.findById(notificationId);
    if (!notification || notification.user_id !== userId) {
      throw AppError.notFound("Notification not found");
    }
    await notificationsRepository.markRead(notificationId);
  },
};
