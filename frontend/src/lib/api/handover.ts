import { apiRequest } from "./client";
import type { Rental } from "./rentals";

export type HandoverStep = "FRONT" | "BACK" | "LEFT" | "RIGHT" | "DAMAGE" | "SERIAL" | "ACCESSORIES" | "VIDEO";
export type HandoverPhase = "pickup" | "return";

export interface HandoverMedia {
  id: string;
  step: HandoverStep;
  mediaType: "photo" | "video";
  url: string;
  uploadedBy: string;
  createdAt: string;
}

export interface HandoverRecord {
  id: string;
  type: "PICKUP" | "RETURN";
  performedBy: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  conditionNotes: string | null;
  status: "in_progress" | "completed";
  createdAt: string;
  mediaByStep: Partial<Record<HandoverStep, HandoverMedia[]>>;
}

export interface HandoverSummary {
  pickup: HandoverRecord | null;
  return: HandoverRecord | null;
  requiredSteps: HandoverStep[];
}

export function getHandoverSummary(rentalId: string) {
  return apiRequest<HandoverSummary>(`/api/rentals/${rentalId}/handover`);
}

export function uploadHandoverMedia(rentalId: string, phase: HandoverPhase, step: HandoverStep, file: File) {
  const formData = new FormData();
  formData.append("step", step);
  formData.append("media", file);
  return apiRequest<{ media: HandoverMedia }>(`/api/rentals/${rentalId}/handover/${phase}/media`, {
    method: "POST",
    body: formData,
  });
}

export function markHandoverReady(rentalId: string, phase: HandoverPhase, notes?: string) {
  return apiRequest<{ rental: Rental }>(`/api/rentals/${rentalId}/handover/${phase}/ready`, {
    method: "PATCH",
    body: { notes },
  });
}

export function confirmHandover(rentalId: string, phase: HandoverPhase) {
  return apiRequest<{ rental: Rental }>(`/api/rentals/${rentalId}/handover/${phase}/confirm`, {
    method: "PATCH",
    body: {},
  });
}
