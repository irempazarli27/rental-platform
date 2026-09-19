import { createHmac } from "node:crypto";
import { env } from "../../config/env";
import type { VerificationLevel } from "../../db/types";

const LEVEL_ORDER: VerificationLevel[] = ["none", "email", "phone", "id_verified"];

/** Verification is a ladder: a user's level never goes down by completing a step. */
export function maxLevel(a: VerificationLevel, b: VerificationLevel): VerificationLevel {
  return LEVEL_ORDER.indexOf(a) >= LEVEL_ORDER.indexOf(b) ? a : b;
}

/** Accepts 05XXXXXXXXX, 5XXXXXXXXX, +905XXXXXXXXX, 905XXXXXXXXX; returns 5XXXXXXXXX or null. */
export function normalizeTrPhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "").replace(/^\+/, "");
  const m = digits.match(/^(?:90|0)?(5\d{9})$/);
  return m ? m[1]! : null;
}

/**
 * Structural check for a Turkish national ID number (T.C. kimlik no): 11 digits,
 * no leading zero, and the two published checksum digits. This only proves the
 * number is well-formed — it does NOT prove it belongs to the person. That
 * needs a licensed identity provider (the reason this flow is a demo).
 */
export function isValidTckn(value: string): boolean {
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const d = value.split("").map(Number);
  const odd = d[0]! + d[2]! + d[4]! + d[6]! + d[8]!;
  const even = d[1]! + d[3]! + d[5]! + d[7]!;
  const tenth = (((odd * 7 - even) % 10) + 10) % 10;
  const eleventh = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d[9] === tenth && d[10] === eleventh;
}

/** One-way HMAC so the same ID can't verify two accounts, without storing the number. */
export function hashIdNumber(tckn: string): string {
  return createHmac("sha256", env.jwt.refreshSecret).update(`tckn:${tckn}`).digest("hex");
}
