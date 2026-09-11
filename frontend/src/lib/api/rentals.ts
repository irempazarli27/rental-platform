import { apiRequest } from "./client";

export type RentalStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "READY_FOR_HANDOVER"
  | "ACTIVE"
  | "RETURN_PENDING"
  | "RETURNED"
  | "COMPLETED"
  | "DISPUTED";

export interface RentalParty {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface RentalItemSummary {
  id: string;
  title: string;
  coverImageUrl: string | null;
}

export interface Rental {
  id: string;
  status: RentalStatus;
  startDate: string;
  endDate: string;
  dailyPriceSnapshot: string;
  rentalPrice: string;
  depositAmount: string;
  platformFee: string;
  totalAmount: string;
  deliveryMethod: string;
  createdAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  item: RentalItemSummary | null;
  renter: RentalParty | null;
  owner: RentalParty | null;
}

export function createRentalRequest(input: { itemId: string; startDate: string; endDate: string }) {
  return apiRequest<{ rental: Rental }>("/api/rentals", { method: "POST", body: input });
}

export function listMyRentals(query: { role?: "renter" | "owner"; status?: RentalStatus } = {}) {
  const params = new URLSearchParams();
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);
  const qs = params.toString();
  return apiRequest<{ rentals: Rental[] }>(`/api/rentals${qs ? `?${qs}` : ""}`);
}

export function getRental(id: string) {
  return apiRequest<{ rental: Rental }>(`/api/rentals/${id}`);
}

export function acceptRental(id: string) {
  return apiRequest<{ rental: Rental }>(`/api/rentals/${id}/accept`, { method: "PATCH" });
}

export function rejectRental(id: string) {
  return apiRequest<{ rental: Rental }>(`/api/rentals/${id}/reject`, { method: "PATCH" });
}

export function cancelRental(id: string) {
  return apiRequest<{ rental: Rental }>(`/api/rentals/${id}/cancel`, { method: "PATCH" });
}
