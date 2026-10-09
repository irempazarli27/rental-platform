// Double-blind window: a lone review stays hidden from the reviewee (and everyone else)
// until the counterparty also reviews, or this much time has passed since completion —
// whichever comes first. Prevents reading the other side's review before writing your own.
// Applied in code (reviews.service) and in SQL (reviews.repository.ratingStatsForItems).
export const REVEAL_TIMEOUT_DAYS = 14;
export const REVEAL_TIMEOUT_MS = REVEAL_TIMEOUT_DAYS * 24 * 60 * 60 * 1000;
