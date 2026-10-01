import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { mailer } from "../../utils/mailer";
import { usersRepository } from "../users/users.repository";
import { notificationsRepository } from "./notifications.repository";
import { toNotificationDto } from "./notifications.types";

function linkFor(relatedEntity?: { type: string; id: string }): string {
  if (relatedEntity?.type === "rental") return `${env.corsOrigin}/dashboard/rentals/${relatedEntity.id}`;
  if (relatedEntity?.type === "conversation") return `${env.corsOrigin}/dashboard/messages/${relatedEntity.id}`;
  return `${env.corsOrigin}/dashboard/notifications`;
}

/**
 * Emails a copy of the notification. Only to addresses the user has proven
 * they own, so a mistyped address never receives someone else's activity.
 */
async function emailCopy(userId: string, title: string, body: string, url: string) {
  const user = await usersRepository.findById(userId);
  if (!user?.email_verified_at || user.status !== "active") return;
  await mailer.sendNotification(user.email, title, body, url);
}

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
      // A chat can produce many notifications in a row; while an earlier one
      // for the same thing is still unread, another email would only be noise.
      const alreadyPending =
        mailer.isConfigured() && (await notificationsRepository.hasUnread(userId, type, relatedEntity?.id));
      await notificationsRepository.create({
        userId,
        type,
        title,
        body,
        relatedEntityType: relatedEntity?.type,
        relatedEntityId: relatedEntity?.id,
      });
      if (mailer.isConfigured() && !alreadyPending) {
        // Not awaited: a slow mail server must not delay the request that triggered it.
        void emailCopy(userId, title, body, linkFor(relatedEntity)).catch((err) =>
          console.error("Failed to email notification", err),
        );
      }
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
