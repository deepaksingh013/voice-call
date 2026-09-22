import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);

const DAY = 60 * 60 * 24;

export type DeviceClaims = { did: string; typ: "device" };
export type SessionClaims = { sid: string; uid: string; typ: "session" };

async function sign(payload: Record<string, unknown>, ttlSeconds: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(secret);
}

/**
 * The device token. Issued on first visit, before any call, and long-lived —
 * it is the only handle a banned guest has, so a short expiry would hand them
 * a clean identity every week.
 */
export const signDeviceToken = (deviceToken: string) =>
  sign({ did: deviceToken, typ: "device" }, env.DEVICE_TOKEN_TTL_DAYS * DAY);

export const signSessionToken = (sessionId: string, userId: string) =>
  sign({ sid: sessionId, uid: userId, typ: "session" }, env.SESSION_TTL_DAYS * DAY);

export async function verifyToken<T>(token: string, typ: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.typ !== typ) return null;
    return payload as T;
  } catch {
    return null;
  }
}

/** Opaque, unguessable device identifier. */
export const newDeviceToken = () => randomBytes(32).toString("base64url");

/** Six digits. Nothing shorter, and never reused. */
export const newLoginCode = () =>
  String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");

export const hashCode = (code: string) =>
  createHash("sha256").update(code).digest("hex");

/** Constant-time compare so a wrong code cannot be found by timing. */
export function codeMatches(input: string, storedHash: string) {
  const a = Buffer.from(hashCode(input));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** IPs are kept only as a salted hash — enough to spot abuse, not to track. */
export const hashIp = (ip: string) =>
  createHash("sha256").update(ip + env.JWT_SECRET).digest("hex").slice(0, 32);
