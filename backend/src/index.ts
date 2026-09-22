import { createServer } from "node:http";
import { createApp } from "./http/app.js";
import { attachGateway } from "./realtime/gateway.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { expireSubscriptions } from "./modules/billing/billing.routes.js";

const app = createApp();
const server = createServer(app);
const wss = attachGateway(server);

// Housekeeping that has to happen whether or not anyone is online.
const hourly = setInterval(
  () => {
    expireSubscriptions().catch((err) =>
      logger.error({ err }, "subscription expiry sweep failed"),
    );
  },
  60 * 60 * 1000,
);

server.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    `API on http://localhost:${env.PORT} · WS on ws://localhost:${env.PORT}/ws`,
  );
});

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  clearInterval(hourly);

  // Close the sockets first so nobody is left holding a queue slot that
  // never clears.
  wss.clients.forEach((c) => c.close(1001, "server shutting down"));
  wss.close();

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (err) =>
  logger.error({ err }, "unhandled rejection"),
);
