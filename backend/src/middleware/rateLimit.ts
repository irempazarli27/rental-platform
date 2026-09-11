import rateLimit from "express-rate-limit";
import { env } from "../config/env";

// The automated test suite legitimately registers/logs in far more accounts per
// minute than any real user would. Skipping rate limiting under NODE_ENV=test
// (never set outside the test runner) keeps limits realistic for production
// while not forcing tests to pace themselves around a login/register cap.
const skipInTests = () => env.nodeEnv === "test";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: { message: "Too many attempts, please try again later." } },
});

// /auth/refresh fires on ~every fresh page load (short-lived access tokens mean
// AuthContext refreshes on mount), not just on deliberate credential attempts —
// sharing the login/register limiter here would log out normal, active users.
// It still needs a cap: this bounds retry storms without punishing real browsing.
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: { message: "Too many attempts, please try again later." } },
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
});
