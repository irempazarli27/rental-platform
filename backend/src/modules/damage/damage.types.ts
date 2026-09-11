import type { Selectable } from "kysely";
import type { DamageReportsTable } from "../../db/types";

type DamageReportRow = Selectable<DamageReportsTable>;

export interface DamageReportDto {
  id: string;
  rentalId: string;
  handoverRecordId: string | null;
  reportedBy: string;
  description: string;
  severity: string;
  status: string;
  createdAt: Date | string;
}

export function toDamageReportDto(row: DamageReportRow): DamageReportDto {
  return {
    id: row.id,
    rentalId: row.rental_id,
    handoverRecordId: row.handover_record_id,
    reportedBy: row.reported_by,
    description: row.description,
    severity: row.severity,
    status: row.status,
    createdAt: row.created_at,
  };
}
