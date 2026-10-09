import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
  },
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 25),
  maxVideoSizeMb: Number(process.env.MAX_VIDEO_SIZE_MB ?? 100),
  // How many reverse proxies sit in front of the API (nginx/Caddy = 1). Express
  // uses this to read the real client IP from X-Forwarded-For; without it every
  // user looks like the proxy and shares one rate-limit bucket. Set 0 only if
  // the API is exposed directly. Never higher than the real number of hops, or
  // clients could spoof their IP.
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 1),
  // Outgoing mail for email verification codes. Unset = no real email is sent
  // and the email step behaves like the rest of demo mode.
  smtp: process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        user: required("SMTP_USER"),
        pass: required("SMTP_PASS"),
        from: process.env.MAIL_FROM || required("SMTP_USER"),
      }
    : null,
  // Language-model features. With no key every AI feature is off and hidden;
  // the rest of the site is unaffected. Model names come from config because
  // providers rename and reprice them often.
  ai: {
    provider: process.env.AI_PROVIDER ?? "gemini",
    apiKey: process.env.GEMINI_API_KEY || null,
    models: {
      fast: process.env.AI_MODEL_FAST || "gemini-3.5-flash-lite",
      vision: process.env.AI_MODEL_VISION || "gemini-3.5-flash",
    },
    // Calls to the provider allowed per day, across everyone / per user.
    dailyCap: Number(process.env.AI_DAILY_REQUEST_CAP ?? 500),
    userDailyCap: Number(process.env.AI_USER_DAILY_CAP ?? 30),
  },
  // Demo mode: steps without a real provider (SMS, and email when SMTP is unset)
  // return their verification code in the API response instead of sending it.
  // With it off, those steps fail loudly rather than silently pretending.
  verificationDemoMode: process.env.VERIFICATION_DEMO_MODE !== "false",
  // Minimum trust score (0-100) a renter needs to request a high-risk item.
  highRiskMinTrust: Number(process.env.HIGH_RISK_MIN_TRUST ?? 40),
};
