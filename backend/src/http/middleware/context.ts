import type { NextFunction, Request, Response } from "express";
import * as cookie from "cookie";
import { prisma } from "../../lib/prisma.js";
import { env, isProd } from "../../lib/env.js";
import {
  signDeviceToken,
  verifyToken,
  type DeviceClaims,
  type SessionClaims,
} from "../../lib/tokens.js";
import {
  issueDevice,
  findDeviceByToken,
  resolveCaller,
  touchDevice,
  type Caller,
} from "../../modules/identity/identity.service.js";
import { unauthorized } from "../../lib/errors.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      caller: Caller;
    }
  }
}

const DEVICE_COOKIE = "vo_device";
const SESSION_COOKIE = "vo_session";

function setCookie(res: Response, name: string, value: string, days: number) {
  res.append(
    "Set-Cookie",
    cookie.serialize(name, value, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: days * 24 * 60 * 60,
    }),
  );
}

export function clearCookie(res: Response, name: string) {
  res.append(
    "Set-Cookie",
    cookie.serialize(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 0,
    }),
  );
}

export { setCookie, DEVICE_COOKIE, SESSION_COOKIE };

/**
 * Every request gets an identity before it does anything else.
 *
 * A first-time visitor is issued a device here — before their first call, as
 * the spec requires — so there is never a window where someone is on the
 * platform with nothing to ban. The client may also send the token in a
 * header, which is what the mobile web fallback and the WebSocket handshake
 * use when a cookie has been cleared.
 */
export async function attachContext(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const cookies = cookie.parse(req.headers.cookie ?? "");
    const headerToken =
      typeof req.headers["x-device-token"] === "string"
        ? req.headers["x-device-token"]
        : undefined;

    const rawDevice = cookies[DEVICE_COOKIE] ?? headerToken;

    let device = null;
    if (rawDevice) {
      const claims = await verifyToken<DeviceClaims>(rawDevice, "device");
      if (claims) device = await findDeviceByToken(claims.did);
    }

    if (!device) {
      const created = await issueDevice({
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        country: (req.headers["x-country"] as string | undefined) ?? "IN",
      });
      const jwt = await signDeviceToken(created.token);
      setCookie(res, DEVICE_COOKIE, jwt, env.DEVICE_TOKEN_TTL_DAYS);
      // Header too, so a client that cannot rely on cookies can store it.
      res.setHeader("x-device-token", jwt);
      device = { ...created, user: null };
    } else {
      void touchDevice(device.id);
    }

    // A session upgrades the caller from guest to account holder.
    let user = device.user ?? null;
    const rawSession = cookies[SESSION_COOKIE];
    if (rawSession) {
      const claims = await verifyToken<SessionClaims>(rawSession, "session");
      if (claims) {
        const session = await prisma.session.findUnique({
          where: { id: claims.sid },
          include: { user: true },
        });
        if (session && session.expiresAt > new Date()) {
          user = session.user;
          // Keep the device pointing at whoever is actually signed in on it.
          if (device.userId !== user.id) {
            await prisma.device.update({
              where: { id: device.id },
              data: { userId: user.id },
            });
          }
        } else {
          clearCookie(res, SESSION_COOKIE);
        }
      }
    }

    req.caller = resolveCaller(device, user);
    next();
  } catch (err) {
    next(err);
  }
}

/** Guards routes that a guest genuinely cannot use. */
export function requireUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.caller.user) return next(unauthorized("Create a free account first"));
  next();
}

/** Guards the paid surface. */
export function requirePro(req: Request, _res: Response, next: NextFunction) {
  if (req.caller.tier !== "PRO") {
    return next(unauthorized("Pro subscription required"));
  }
  next();
}
