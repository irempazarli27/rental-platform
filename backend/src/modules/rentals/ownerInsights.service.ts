import type { RentalStatus } from "../../db/types";
import { ownerInsightsRepository } from "./ownerInsights.repository";

const MONTHS_SHOWN = 6;
// Accepted but not yet completed: money the owner can expect, not money earned.
const IN_PROGRESS: RentalStatus[] = ["ACCEPTED", "READY_FOR_HANDOVER", "ACTIVE", "RETURN_PENDING", "RETURNED", "DISPUTED"];

/** The last `count` calendar months in Turkey time, oldest first, as YYYY-MM. */
export function recentMonths(now: Date, count: number): string[] {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit" })
    .format(now)
    .split("-")
    .map(Number) as [number, number];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export interface CalendarEntry {
  /** Unique within a response; a block id or a rental id depending on kind. */
  id: string;
  kind: "rental" | "manual" | "pending";
  itemId: string;
  itemTitle: string;
  startDate: string;
  endDate: string;
  rentalId: string | null;
  renterName: string | null;
}

export const ownerInsightsService = {
  /**
   * What the owner's rentals add up to. The owner's share of a rental is its
   * rental_price — the platform fee and deposit are charged on top to the renter.
   * No payment gateway is connected, so these are computed from rental records
   * rather than from money that actually moved.
   */
  async earnings(ownerId: string, now = new Date()) {
    const months = recentMonths(now, MONTHS_SHOWN);
    const [statusRows, monthRows, itemRows] = await Promise.all([
      ownerInsightsRepository.statusTotals(ownerId),
      ownerInsightsRepository.monthlyCompleted(ownerId, months[0]!),
      ownerInsightsRepository.perItem(ownerId),
    ]);

    const byStatus = new Map(statusRows.map((r) => [r.status, { count: Number(r.count), amount: Number(r.amount ?? 0) }]));
    const inProgress = IN_PROGRESS.map((s) => byStatus.get(s)).filter((v) => v !== undefined);
    const monthAmount = new Map(monthRows.map((r) => [r.month, Number(r.amount ?? 0)]));

    return {
      currency: "TRY",
      totals: {
        earned: byStatus.get("COMPLETED")?.amount ?? 0,
        completedCount: byStatus.get("COMPLETED")?.count ?? 0,
        upcoming: inProgress.reduce((sum, v) => sum + v.amount, 0),
        inProgressCount: inProgress.reduce((sum, v) => sum + v.count, 0),
        pendingCount: byStatus.get("PENDING")?.count ?? 0,
      },
      months: months.map((month) => ({ month, earned: monthAmount.get(month) ?? 0 })),
      items: itemRows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        completedCount: Number(r.completed_count),
        earned: Number(r.amount),
        rentedDays: Number(r.rented_days),
      })),
    };
  },

  async calendar(ownerId: string, from: string, to: string) {
    const [items, blocks, pending] = await Promise.all([
      ownerInsightsRepository.listItems(ownerId),
      ownerInsightsRepository.blocksInRange(ownerId, from, to),
      ownerInsightsRepository.pendingInRange(ownerId, from, to),
    ]);

    const entries: CalendarEntry[] = [
      ...blocks.map((b) => ({
        id: b.id,
        kind: b.reason === "rental" ? ("rental" as const) : ("manual" as const),
        itemId: b.item_id,
        itemTitle: b.item_title,
        startDate: b.start_date,
        endDate: b.end_date,
        rentalId: b.rental_id,
        renterName: b.renter_name,
      })),
      ...pending.map((r) => ({
        id: r.id,
        kind: "pending" as const,
        itemId: r.item_id,
        itemTitle: r.item_title,
        startDate: r.start_date,
        endDate: r.end_date,
        rentalId: r.id,
        renterName: r.renter_name,
      })),
    ];

    entries.sort((a, b) => a.startDate.localeCompare(b.startDate));
    return { items, entries };
  },
};
