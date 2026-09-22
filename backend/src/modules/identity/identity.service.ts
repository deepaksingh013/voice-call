import type { Device, Gender, Tier, User } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../lib/env.js";
import { hashIp, newDeviceToken } from "../../lib/tokens.js";
import { forbidden } from "../../lib/errors.js";

export type Caller = {
  device: Device;
  user: User | null;
  tier: Tier;
  /**
   * The gender the matcher should use for this caller, and where it came
   * from. A signed-in user's declared gender always wins over anything
   * inferred from their voice — the declaration is accountable, the
   * inference is a guess.
   */
  effectiveGender: Gender | null;
  genderIsDeclared: boolean;
};

export async function issueDevice(input: {
  ip?: string;
  userAgent?: string;
  country?: string;
}) {
  return prisma.device.create({
    data: {
      token: newDeviceToken(),
      country: input.country ?? "IN",
      ipHash: input.ip ? hashIp(input.ip) : null,
      userAgent: input.userAgent?.slice(0, 255) ?? null,
    },
  });
}

export async function findDeviceByToken(token: string) {
  return prisma.device.findUnique({
    where: { token },
    include: { user: true },
  });
}

export async function touchDevice(deviceId: string) {
  await prisma.device
    .update({ where: { id: deviceId }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);
}

/**
 * Bans follow the device, not the account, because a guest has no account.
 * This is checked on every request that can reach the matching queue.
 */
export function assertNotBanned(device: Device, user: User | null) {
  if (device.bannedAt) {
    throw forbidden("This device is banned from the service.");
  }
  if (user?.suspendedAt) {
    throw forbidden("This account is suspended.");
  }
}

export function resolveCaller(device: Device, user: User | null): Caller {
  const tier: Tier = user ? user.tier : "GUEST";

  // Declared beats inferred, always.
  if (user) {
    return {
      device,
      user,
      tier,
      effectiveGender: user.gender,
      genderIsDeclared: true,
    };
  }

  // A guess only counts once it clears the confidence bar. Below it the
  // caller is genuinely unknown and stays out of gender-filtered pools.
  const confident =
    device.inferredGender !== null &&
    (device.inferredConfidence ?? 0) >= env.VOICE_CONFIDENCE_THRESHOLD;

  return {
    device,
    user: null,
    tier,
    effectiveGender: confident ? device.inferredGender : null,
    genderIsDeclared: false,
  };
}

/** Migrates a guest's device — and its history — onto a new account. */
export async function attachDeviceToUser(deviceId: string, userId: string) {
  await prisma.device.update({
    where: { id: deviceId },
    data: { userId },
  });
}
