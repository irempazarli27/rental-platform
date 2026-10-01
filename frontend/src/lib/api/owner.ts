import { apiRequest } from "./client";

export interface Earnings {
  currency: string;
  totals: {
    /** Sum of completed rentals' prices — the owner's share, before any real payout exists. */
    earned: number;
    completedCount: number;
    /** Accepted but not yet completed. */
    upcoming: number;
    inProgressCount: number;
    pendingCount: number;
  };
  /** Oldest first; `month` is YYYY-MM. */
  months: { month: string; earned: number }[];
  items: { id: string; title: string; status: string; completedCount: number; earned: number; rentedDays: number }[];
}

export interface CalendarEntry {
  id: string;
  /** rental = accepted booking, manual = closed by the owner, pending = unanswered request. */
  kind: "rental" | "manual" | "pending";
  itemId: string;
  itemTitle: string;
  /** Inclusive YYYY-MM-DD dates. */
  startDate: string;
  endDate: string;
  rentalId: string | null;
  renterName: string | null;
}

export function getEarnings() {
  return apiRequest<{ earnings: Earnings }>("/api/users/me/earnings");
}

export function getCalendar(from: string, to: string) {
  return apiRequest<{ items: { id: string; title: string }[]; entries: CalendarEntry[] }>(
    `/api/users/me/calendar?from=${from}&to=${to}`,
  );
}
