import Redis from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function create() {
  const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  client.on("error", (err) => logger.error({ err }, "redis error"));
  return client;
}

export const redis = globalForRedis.redis ?? create();
if (env.NODE_ENV !== "production") globalForRedis.redis = redis;
