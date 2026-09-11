import { apiRequest } from "./client";

export interface DamageReport {
  id: string;
  rentalId: string;
  handoverRecordId: string | null;
  reportedBy: string;
  description: string;
  severity: "minor" | "moderate" | "severe";
  status: string;
  createdAt: string;
}

export function createDamageReport(
  rentalId: string,
  input: { description: string; severity: "minor" | "moderate" | "severe"; handoverType?: "PICKUP" | "RETURN" },
) {
  return apiRequest<{ report: DamageReport }>(`/api/rentals/${rentalId}/damage-reports`, {
    method: "POST",
    body: input,
  });
}

export function listDamageReports(rentalId: string) {
  return apiRequest<{ reports: DamageReport[] }>(`/api/rentals/${rentalId}/damage-reports`);
}
