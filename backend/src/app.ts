import path from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRateLimiter } from "./middleware/rateLimit";
import { adminRouter } from "./modules/admin/admin.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { disputesRouter } from "./modules/disputes/disputes.routes";
import { favoritesRouter } from "./modules/favorites/favorites.routes";
import { itemsRouter } from "./modules/items/items.routes";
import { conversationsRouter } from "./modules/messaging/messaging.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { rentalsRouter } from "./modules/rentals/rentals.routes";
import { usersRouter } from "./modules/users/users.routes";
import { verificationRouter } from "./modules/verification/verification.routes";

export const app = express();

app.set("trust proxy", env.trustProxyHops);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(apiRateLimiter);

app.use("/uploads", express.static(path.resolve(process.cwd(), env.uploadDir)));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/verification", verificationRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/items", itemsRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/rentals", rentalsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/disputes", disputesRouter);
app.use("/api/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);
