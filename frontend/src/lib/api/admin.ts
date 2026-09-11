import { apiRequest } from "./client";
import type { Dispute } from "./disputes";
import type { Rental, RentalStatus } from "./rentals";
import type { HandoverSummary } from "./handover";
import type { DamageReport } from "./damage";
import type { Message } from "./messaging";
import type { AuthUser } from "./auth";
import type { ItemStatus, ItemSummary } from "./items";

export interface AdminDisputeSummary {
  id: string;
  rentalId: string;
  itemTitle: string | null;
  status: Dispute["status"];
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminDisputeDetail {
  dispute: Dispute;
  openedByName: string | null;
  rental: Rental;
  handover: HandoverSummary;
  damageReports: DamageReport[];
  messages: Message[];
}

export function listAdminDisputes(status?: Dispute["status"]) {
  const qs = status ? `?status=${status}` : "";
  return apiRequest<{ disputes: AdminDisputeSummary[] }>(`/api/admin/disputes${qs}`);
}

export function getAdminDisputeDetail(id: string) {
  return apiRequest<AdminDisputeDetail>(`/api/admin/disputes/${id}`);
}

export function resolveDispute(
  id: string,
  input: { status: "resolved_favor_owner" | "resolved_favor_renter" | "resolved_split"; resolutionNotes: string; claimedAmount?: number },
) {
  return apiRequest<{ dispute: Dispute }>(`/api/admin/disputes/${id}/resolve`, { method: "PATCH", body: input });
}

export interface AdminStats {
  totalUsers: number;
  itemsByStatus: Record<string, number>;
  rentalsByStatus: Record<string, number>;
  openDisputes: number;
  totalPlatformFeeRevenue: number;
}

export function getAdminStats() {
  return apiRequest<AdminStats>("/api/admin/stats");
}

export function listAdminUsers(query: { page?: number; pageSize?: number; q?: string } = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.q) params.set("q", query.q);
  const qs = params.toString();
  return apiRequest<{ users: AuthUser[]; total: number; page: number; pageSize: number }>(
    `/api/admin/users${qs ? `?${qs}` : ""}`,
  );
}

export function suspendUser(id: string, reason: string) {
  return apiRequest<{ user: AuthUser }>(`/api/admin/users/${id}/suspend`, { method: "PATCH", body: { reason } });
}

export function activateUser(id: string) {
  return apiRequest<{ user: AuthUser }>(`/api/admin/users/${id}/activate`, { method: "PATCH", body: {} });
}

export function listAdminItems(query: { page?: number; pageSize?: number; status?: ItemStatus } = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);
  const qs = params.toString();
  return apiRequest<{ items: (ItemSummary & { ownerName: string | null })[]; total: number; page: number; pageSize: number }>(
    `/api/admin/items${qs ? `?${qs}` : ""}`,
  );
}

export function removeAdminItem(id: string, reason: string) {
  return apiRequest<{ item: ItemSummary }>(`/api/admin/items/${id}`, { method: "DELETE", body: { reason } });
}

export function listAdminRentals(query: { page?: number; pageSize?: number; status?: RentalStatus } = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);
  const qs = params.toString();
  return apiRequest<{ rentals: Rental[]; total: number; page: number; pageSize: number }>(
    `/api/admin/rentals${qs ? `?${qs}` : ""}`,
  );
}

export interface FlaggedMessage extends Message {
  senderName: string | null;
  participantOneId: string | null;
  participantTwoId: string | null;
}

export function listFlaggedMessages() {
  return apiRequest<{ messages: FlaggedMessage[] }>("/api/admin/messages/flagged");
}
