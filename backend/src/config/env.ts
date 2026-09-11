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
};
