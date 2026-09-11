import type { Selectable } from "kysely";
import type { NotificationsTable } from "../../db/types";

type NotificationRow = Selectable<NotificationsTable>;

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: Date | string | null;
  createdAt: Date | string;
}

export function toNotificationDto(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
