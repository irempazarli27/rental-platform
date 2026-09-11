import { apiRequest } from "./client";

export interface DisputeEvidence {
  id: string;
  uploadedBy: string;
  mediaUrl: string;
  description: string | null;
  createdAt: string;
}

export interface Dispute {
  id: string;
  rentalId: string;
  openedBy: string;
  reason: string;
  status: "open" | "under_review" | "resolved_favor_owner" | "resolved_favor_renter" | "resolved_split";
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  evidence: DisputeEvidence[];
}

export function openDispute(rentalId: string, reason: string) {
  return apiRequest<{ dispute: Dispute }>(`/api/rentals/${rentalId}/disputes`, {
    method: "POST",
    body: { reason },
  });
}

export function listRentalDisputes(rentalId: string) {
  return apiRequest<{ disputes: Dispute[] }>(`/api/rentals/${rentalId}/disputes`);
}

export function getDispute(disputeId: string) {
  return apiRequest<{ dispute: Dispute }>(`/api/disputes/${disputeId}`);
}

export function addDisputeEvidence(disputeId: string, file: File, description?: string) {
  const formData = new FormData();
  formData.append("media", file);
  if (description) formData.append("description", description);
  return apiRequest<{ evidence: DisputeEvidence }>(`/api/disputes/${disputeId}/evidence`, {
    method: "POST",
    body: formData,
  });
}
