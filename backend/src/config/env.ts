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
  // Demo mode: no real email/SMS provider is wired up, so verification codes are
  // returned in the API response instead of being sent. Turn off once a real
  // provider exists (sending then fails loudly rather than silently pretending).
  verificationDemoMode: process.env.VERIFICATION_DEMO_MODE !== "false",
  // Minimum trust score (0-100) a renter needs to request a high-risk item.
  highRiskMinTrust: Number(process.env.HIGH_RISK_MIN_TRUST ?? 40),
};
