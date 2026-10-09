import type { Selectable } from "kysely";
import type { RentalsTable } from "../../db/types";

type RentalRow = Selectable<RentalsTable>;

export interface RentalPartyDto {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface RentalItemSummaryDto {
  id: string;
  title: string;
  coverImageUrl: string | null;
}

/** The renter at a glance, for an owner deciding on a request. */
export interface RenterProfileDto {
  ratingAvg: number;
  ratingCount: number;
  completedRentals: number;
  verificationLevel: string;
  trust: { score: number; level: string };
}

export interface RentalDto {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  dailyPriceSnapshot: string;
  rentalPrice: string;
  depositAmount: string;
  platformFee: string;
  totalAmount: string;
  deliveryMethod: string;
  createdAt: Date | string;
  acceptedAt: Date | string | null;
  rejectedAt: Date | string | null;
  cancelledAt: Date | string | null;
  completedAt: Date | string | null;
  item: RentalItemSummaryDto | null;
  renter: RentalPartyDto | null;
  owner: RentalPartyDto | null;
  renterProfile: RenterProfileDto | null;
}

export function toRentalBase(row: RentalRow) {
  return {
    id: row.id,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    dailyPriceSnapshot: row.daily_price_snapshot,
    rentalPrice: row.rental_price,
    depositAmount: row.deposit_amount,
    platformFee: row.platform_fee,
    totalAmount: row.total_amount,
    deliveryMethod: row.delivery_method,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    rejectedAt: row.rejected_at,
    cancelledAt: row.cancelled_at,
    completedAt: row.completed_at,
  };
}
