import express from "express";
import cors from "cors";
import { env } from "../lib/env.js";
import { attachContext } from "./middleware/context.js";
import { errorHandler, notFoundHandler, wrap } from "./middleware/error.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { userRoutes } from "../modules/users/users.routes.js";
import { callRoutes } from "../modules/calls/calls.routes.js";
import { reportRoutes } from "../modules/reports/reports.routes.js";
import { friendRoutes } from "../modules/friends/friends.routes.js";
import { billingRoutes } from "../modules/billing/billing.routes.js";
import { voiceRoutes } from "../modules/voice/voice.routes.js";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  // CORS_ORIGIN is a comma-separated allowlist so preview deployments can be
  // added without a code change. It is an allowlist on purpose: reflecting
  // any origin back while also sending credentials would let any site on the
  // internet make authenticated calls on a visitor's behalf.
  const origins = env.CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: origins,
      // The device and session tokens are httpOnly cookies, so the browser
      // has to be allowed to send them.
      credentials: true,
      exposedHeaders: ["x-device-token", "x-session-token"],
    }),
  );

  // The voice route takes a raw audio body and parses it itself.
  app.use((req, res, next) =>
    req.path === "/v1/voice/classify"
      ? next()
      : express.json({ limit: "256kb" })(req, res, next),
  );

  app.get(
    "/health",
    wrap(async (_req, res) => {
      const [db, cache] = await Promise.allSettled([
        prisma.$queryRaw`SELECT 1`,
        redis.ping(),
      ]);
      const ok = db.status === "fulfilled" && cache.status === "fulfilled";
      res.status(ok ? 200 : 503).json({
        ok,
        db: db.status === "fulfilled",
        redis: cache.status === "fulfilled",
      });
    }),
  );

  // Everything past here has an identity: a device is issued on first
  // contact, before the visitor can reach anything else.
  app.use(attachContext);

  app.use("/v1/auth", authRoutes);
  app.use("/v1/users", userRoutes);
  app.use("/v1/calls", callRoutes);
  app.use("/v1/reports", reportRoutes);
  app.use("/v1/friends", friendRoutes);
  app.use("/v1/billing", billingRoutes);
  app.use("/v1/voice", voiceRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
