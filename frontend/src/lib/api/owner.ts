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

export function getEarnings() {
  return apiRequest<{ earnings: Earnings }>("/api/users/me/earnings");
}
