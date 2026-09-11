import type { Selectable } from "kysely";
import type { DisputeEvidenceTable, DisputesTable } from "../../db/types";

type DisputeRow = Selectable<DisputesTable>;
type EvidenceRow = Selectable<DisputeEvidenceTable>;

export interface DisputeEvidenceDto {
  id: string;
  uploadedBy: string;
  mediaUrl: string;
  description: string | null;
  createdAt: Date | string;
}

export interface DisputeDto {
  id: string;
  rentalId: string;
  openedBy: string;
  reason: string;
  status: string;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | string | null;
  createdAt: Date | string;
  evidence: DisputeEvidenceDto[];
}

export function toEvidenceDto(row: EvidenceRow): DisputeEvidenceDto {
  return {
    id: row.id,
    uploadedBy: row.uploaded_by,
    mediaUrl: row.media_url,
    description: row.description,
    createdAt: row.created_at,
  };
}

export function toDisputeDto(row: DisputeRow, evidence: EvidenceRow[]): DisputeDto {
  return {
    id: row.id,
    rentalId: row.rental_id,
    openedBy: row.opened_by,
    reason: row.reason,
    status: row.status,
    resolutionNotes: row.resolution_notes,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    evidence: evidence.map(toEvidenceDto),
  };
}
