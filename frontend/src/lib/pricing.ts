// Mirrors backend/src/modules/rentals/rentals.pricing.ts — kept in sync manually.
// This is only a client-side preview; the backend recomputes authoritatively.
const PLATFORM_COMMISSION_RATE = 0.1;

function countRentalDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface PricingPreview {
  days: number;
  rentalPrice: number;
  platformFee: number;
  depositAmount: number;
  totalAmount: number;
}

export function computePricingPreview(
  dailyPrice: number,
  weeklyPrice: number | null,
  depositAmount: number,
  startDate: string,
  endDate: string,
): PricingPreview | null {
  if (!startDate || !endDate || endDate < startDate) return null;

  const days = countRentalDays(startDate, endDate);
  let rentalPrice: number;
  if (weeklyPrice && days >= 7) {
    const weeks = Math.floor(days / 7);
    const remainderDays = days % 7;
    rentalPrice = weeks * weeklyPrice + remainderDays * dailyPrice;
  } else {
    rentalPrice = days * dailyPrice;
  }
  rentalPrice = round2(rentalPrice);

  const platformFee = round2(rentalPrice * PLATFORM_COMMISSION_RATE);
  const totalAmount = round2(rentalPrice + platformFee + depositAmount);

  return { days, rentalPrice, platformFee, depositAmount: round2(depositAmount), totalAmount };
}
