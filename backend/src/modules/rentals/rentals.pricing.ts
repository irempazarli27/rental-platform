// No real payment gateway yet — see architecture notes on marketplace/split-payment
// providers before wiring this to actual money movement.
export const PLATFORM_COMMISSION_RATE = 0.1;

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function countRentalDays(startDate: string, endDate: string): number {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

export interface PricingInput {
  dailyPrice: number;
  weeklyPrice: number | null;
  depositAmount: number;
  startDate: string;
  endDate: string;
}

export interface PricingResult {
  days: number;
  rentalPrice: number;
  platformFee: number;
  depositAmount: number;
  totalAmount: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computePricing(input: PricingInput): PricingResult {
  const days = countRentalDays(input.startDate, input.endDate);

  let rentalPrice: number;
  if (input.weeklyPrice && days >= 7) {
    const weeks = Math.floor(days / 7);
    const remainderDays = days % 7;
    rentalPrice = weeks * input.weeklyPrice + remainderDays * input.dailyPrice;
  } else {
    rentalPrice = days * input.dailyPrice;
  }
  rentalPrice = round2(rentalPrice);

  const platformFee = round2(rentalPrice * PLATFORM_COMMISSION_RATE);
  const totalAmount = round2(rentalPrice + platformFee + input.depositAmount);

  return { days, rentalPrice, platformFee, depositAmount: round2(input.depositAmount), totalAmount };
}
