import type { Gender } from "@prisma/client";
import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import {
  bucketOf,
  candidates,
  dequeue,
  getWaiting,
  type Waiting,
} from "./queue.js";

/**
 * Pairing.
 *
 * Two rules do most of the work here:
 *
 * 1. Matching is DIRECTIONAL. The seeker's filter decides which queues to
 *    read, but the person already waiting may have a filter of their own, so
 *    acceptance is checked both ways before anyone is paired.
 *
 * 2. Pairing must be ATOMIC. Under load, a naive read-then-remove hands the
 *    same waiting person to two different seekers. Both sides are claimed
 *    with a single Redis lock before any database write happens.
 */

const CLAIM_TTL_MS = 5000;

/** Widening schedule. Gender is never relaxed — that is the paid feature. */
export function widenedFilter(w: Waiting, waitedMs: number) {
  const wantsRegion = waitedMs > 8_000 ? null : w.wantsRegion;
  const crossCountry = waitedMs > 15_000;
  return { wantsRegion, crossCountry };
}

function accepts(seeker: Waiting, target: Waiting): boolean {
  // Gender, both directions.
  if (seeker.wantsGender) {
    if (target.bucket !== bucketOf(seeker.wantsGender)) return false;
  }
  if (target.wantsGender) {
    if (seeker.bucket !== bucketOf(target.wantsGender)) return false;
  }

  // Region, when either side asked for one.
  if (seeker.wantsRegion && target.wantsRegion && seeker.wantsRegion !== target.wantsRegion) {
    return false;
  }

  // At least one shared language, when both declared some.
  if (seeker.languages.length && target.languages.length) {
    const shared = seeker.languages.some((l) => target.languages.includes(l));
    if (!shared) return false;
  }

  return true;
}

/** A pair that has reported each other is never matched again. */
async function previouslyReported(aDeviceId: string, bDeviceId: string) {
  const hit = await prisma.report.findFirst({
    where: {
      OR: [
        { reporterDeviceId: aDeviceId, reportedDeviceId: bDeviceId },
        { reporterDeviceId: bDeviceId, reportedDeviceId: aDeviceId },
      ],
    },
    select: { id: true },
  });
  return hit !== null;
}

/** Avoid instantly re-pairing the two people who just hung up. */
const recentPairKey = (a: string, b: string) =>
  `pair:${[a, b].sort().join(":")}`;

async function pairedRecently(a: string, b: string) {
  return (await redis.exists(recentPairKey(a, b))) === 1;
}

export async function rememberPair(a: string, b: string, seconds = 300) {
  await redis.set(recentPairKey(a, b), "1", "EX", seconds);
}

/**
 * Claims both sides atomically. Returns false if anyone else got there
 * first, in which case the caller simply tries the next candidate.
 */
async function claimBoth(a: string, b: string): Promise<boolean> {
  const res = await redis.set(`claim:${a}`, b, "PX", CLAIM_TTL_MS, "NX");
  if (res !== "OK") return false;

  const res2 = await redis.set(`claim:${b}`, a, "PX", CLAIM_TTL_MS, "NX");
  if (res2 !== "OK") {
    await redis.del(`claim:${a}`);
    return false;
  }
  return true;
}

async function releaseClaims(a: string, b: string) {
  await redis.del(`claim:${a}`, `claim:${b}`);
}

export type MatchResult = {
  callId: string;
  a: Waiting;
  b: Waiting;
};

/**
 * Tries to find a partner for `seeker`. Returns null when nobody suitable is
 * waiting, and the caller stays in the queue for the next attempt.
 */
export async function tryMatch(seeker: Waiting): Promise<MatchResult | null> {
  const waitedMs = Date.now() - seeker.enqueuedAt;
  const { wantsRegion } = widenedFilter(seeker, waitedMs);
  const effective: Waiting = { ...seeker, wantsRegion };

  const ids = await candidates(seeker.country, seeker.wantsGender);

  for (const id of ids) {
    if (id === seeker.deviceId) continue;

    const target = await getWaiting(id);
    if (!target) continue; // entry expired between read and fetch

    if (!accepts(effective, target)) continue;
    if (await pairedRecently(seeker.deviceId, target.deviceId)) continue;
    if (await previouslyReported(seeker.deviceId, target.deviceId)) continue;

    if (!(await claimBoth(seeker.deviceId, target.deviceId))) continue;

    try {
      // Remove both from the queue before writing the call, so neither can
      // be handed to a third party while the database round trip happens.
      await Promise.all([
        dequeue(seeker.deviceId, seeker.country, seeker.bucket),
        dequeue(target.deviceId, target.country, target.bucket),
      ]);

      const call = await prisma.call.create({
        data: {
          callerDeviceId: seeker.deviceId,
          peerDeviceId: target.deviceId,
          // Recorded so a wrong-gender report can be audited against what
          // the matcher actually believed at the time.
          matchedOn: {
            country: seeker.country,
            seekerWants: seeker.wantsGender,
            targetBucket: target.bucket,
            targetGenderDeclared: target.genderIsDeclared,
            seekerBucket: seeker.bucket,
            seekerGenderDeclared: seeker.genderIsDeclared,
            waitedMs,
            widenedRegion: wantsRegion !== seeker.wantsRegion,
          },
        },
        select: { id: true },
      });

      await rememberPair(seeker.deviceId, target.deviceId);

      logger.debug(
        { callId: call.id, a: seeker.deviceId, b: target.deviceId },
        "matched",
      );

      return { callId: call.id, a: effective, b: target };
    } catch (err) {
      logger.error({ err }, "pairing failed after claim");
      return null;
    } finally {
      await releaseClaims(seeker.deviceId, target.deviceId);
    }
  }

  return null;
}

export function estimateWaitSeconds(input: {
  wantsGender: Gender | null;
  wantsRegion: string | null;
  country: string;
  ageSpan: number;
}) {
  let base = 8;
  if (input.country !== "WORLDWIDE") base += 9;
  if (input.wantsGender) base += 14;
  if (input.wantsRegion) base += 11;
  base += Math.max(0, 28 - input.ageSpan) / 2;
  return Math.round(base);
}
