import type { Selectable } from "kysely";
import type { HandoverMediaTable, HandoverRecordsTable, HandoverStep } from "../../db/types";

type HandoverRecordRow = Selectable<HandoverRecordsTable>;
type HandoverMediaRow = Selectable<HandoverMediaTable>;

export interface HandoverMediaDto {
  id: string;
  step: HandoverStep;
  mediaType: string;
  url: string;
  uploadedBy: string;
  createdAt: Date | string;
}

export interface HandoverRecordDto {
  id: string;
  type: string;
  performedBy: string;
  confirmedBy: string | null;
  confirmedAt: Date | string | null;
  conditionNotes: string | null;
  status: string;
  createdAt: Date | string;
  mediaByStep: Partial<Record<HandoverStep, HandoverMediaDto[]>>;
}

export function toHandoverMediaDto(row: HandoverMediaRow): HandoverMediaDto {
  return {
    id: row.id,
    step: row.step,
    mediaType: row.media_type,
    url: row.url,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export function toHandoverRecordDto(row: HandoverRecordRow, media: HandoverMediaRow[]): HandoverRecordDto {
  const mediaByStep: Partial<Record<HandoverStep, HandoverMediaDto[]>> = {};
  for (const m of media) {
    const dto = toHandoverMediaDto(m);
    (mediaByStep[m.step] ??= []).push(dto);
  }

  return {
    id: row.id,
    type: row.type,
    performedBy: row.performed_by,
    confirmedBy: row.confirmed_by,
    confirmedAt: row.confirmed_at,
    conditionNotes: row.condition_notes,
    status: row.status,
    createdAt: row.created_at,
    mediaByStep,
  };
}
