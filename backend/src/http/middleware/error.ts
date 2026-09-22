import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { ZodError } from "zod";
import { HttpError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { isProd } from "../../lib/env.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Invalid request",
      details: err.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }

  logger.error({ err }, "unhandled error");
  res.status(500).json({
    error: isProd ? "Something went wrong" : String(err),
  });
}

/**
 * Wraps an async handler so a rejected promise reaches the error handler.
 * Express 4 does not await handlers, so without this an async throw becomes
 * an unhandled rejection and the request hangs until the client times out.
 */
export function wrap(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
