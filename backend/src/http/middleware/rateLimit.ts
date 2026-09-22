import type { NextFunction, Request, Response } from "express";
import { redis } from "../../lib/redis.js";
import { tooMany } from "../../lib/errors.js";

/**
 * Fixed-window limiter keyed by device. Good enough for login codes, report
 * spam and queue thrash, and it costs one Redis round trip.
 */
export function rateLimit(opts: { key: string; limit: number; windowSec: number }) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const id = req.caller?.device.id ?? req.ip ?? "anon";
      const bucket = Math.floor(Date.now() / 1000 / opts.windowSec);
      const key = `rl:${opts.key}:${id}:${bucket}`;

      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, opts.windowSec);
      if (count > opts.limit) return next(tooMany());

      next();
    } catch (err) {
      next(err);
    }
  };
}
