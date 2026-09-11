import type { RiskLevel } from "../../db/types";

const ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

/** An owner may declare a higher risk level than the category default, never a lower one. */
export function resolveRiskLevel(categoryDefault: RiskLevel, requested: RiskLevel | undefined): RiskLevel {
  if (!requested) return categoryDefault;
  return ORDER[requested] >= ORDER[categoryDefault] ? requested : categoryDefault;
}
