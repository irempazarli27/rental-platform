import { apiRequest } from "./client";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export function listNotifications() {
  return apiRequest<{ notifications: Notification[]; unreadCount: number }>("/api/notifications");
}

export function markNotificationRead(id: string) {
  return apiRequest<void>(`/api/notifications/${id}/read`, { method: "PATCH" });
}
