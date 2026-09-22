import type { Gender, Tier } from "@prisma/client";
import { redis } from "../../lib/redis.js";

/**
 * Matchmaking queues.
 *
 * The rule that keeps this simple:
 *
 *   Every waiting person sits in exactly ONE queue, chosen by their own
 *   gender. Seekers read from whichever queues satisfy their filter.
 *
 * So a guest classified female sits in `q:IN:f` and is reachable by a Pro
 * user filtering Women, without her ever having asked for anything.
 *
 * Country comes first in the key so each queue stays small, which keeps
 * latency down and keeps most pairs peer-to-peer instead of on the relay.
 */

export type Bucket = "f" | "m" | "u";

export const bucketOf = (g: Gender | null): Bucket =>
  g === "FEMALE" ? "f" : g === "MALE" ? "m" : "u";

export const queueKey = (country: string, bucket: Bucket) =>
  `q:${country.toUpperCase()}:${bucket}`;

/** Everything the matcher needs without a second round trip. */
export type Waiting = {
  deviceId: string;
  userId: string | null;
  tier: Tier;
  country: string;
  bucket: Bucket;
  /** null means "Anyone" — what this person will accept. */
  wantsGender: Gender | null;
  wantsRegion: string | null;
  languages: string[];
  ageMin: number;
  ageMax: number;
  enqueuedAt: number;
  genderIsDeclared: boolean;
};

const entryKey = (deviceId: string) => `w:${deviceId}`;
const ENTRY_TTL = 120; // a stale entry must never haunt the queue

/**
 * Pro users sort earlier. This is the "priority in the queue" perk, and it
 * is implemented as a score offset rather than a separate queue so that a
 * thin queue does not split into two even thinner ones.
 */
const PRIORITY_OFFSET_MS = 30_000;

export async function enqueue(w: Waiting) {
  const score = w.enqueuedAt - (w.tier === "PRO" ? PRIORITY_OFFSET_MS : 0);
  const key = queueKey(w.country, w.bucket);

  await redis
    .multi()
    .set(entryKey(w.deviceId), JSON.stringify(w), "EX", ENTRY_TTL)
    .zadd(key, score, w.deviceId)
    .exec();
}

export async function dequeue(deviceId: string, country: string, bucket: Bucket) {
  await redis
    .multi()
    .del(entryKey(deviceId))
    .zrem(queueKey(country, bucket), deviceId)
    .exec();
}

/** Removes a device from every bucket of a country — used on disconnect. */
export async function dequeueEverywhere(deviceId: string, country: string) {
  const buckets: Bucket[] = ["f", "m", "u"];
  const tx = redis.multi().del(entryKey(deviceId));
  for (const b of buckets) tx.zrem(queueKey(country, b), deviceId);
  await tx.exec();
}

export async function getWaiting(deviceId: string): Promise<Waiting | null> {
  const raw = await redis.get(entryKey(deviceId));
  return raw ? (JSON.parse(raw) as Waiting) : null;
}

export async function isQueued(deviceId: string) {
  return (await redis.exists(entryKey(deviceId))) === 1;
}

/** Which buckets a seeker may read from, given what they want. */
export function readableBuckets(wants: Gender | null): Bucket[] {
  if (wants === "FEMALE") return ["f"];
  if (wants === "MALE") return ["m"];
  return ["f", "m", "u"];
}

/** Longest-waiting candidates across the readable buckets, best first. */
export async function candidates(
  country: string,
  wants: Gender | null,
  limit = 25,
): Promise<string[]> {
  const buckets = readableBuckets(wants);

  const lists = await Promise.all(
    buckets.map((b) =>
      redis.zrange(queueKey(country, b), 0, limit - 1, "WITHSCORES"),
    ),
  );

  const scored: Array<{ id: string; score: number }> = [];
  for (const flat of lists) {
    for (let i = 0; i < flat.length; i += 2) {
      const id = flat[i];
      const score = flat[i + 1];
      if (id && score) scored.push({ id, score: Number(score) });
    }
  }

  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((s) => s.id);
}

export async function onlineCount(country?: string) {
  if (country) {
    const buckets: Bucket[] = ["f", "m", "u"];
    const counts = await Promise.all(
      buckets.map((b) => redis.zcard(queueKey(country, b))),
    );
    return counts.reduce((a, b) => a + b, 0);
  }
  // Presence is tracked separately from the queue: people on a call are
  // online but not waiting, and the counter must not drop when they pair up.
  return redis.scard("presence:online");
}

export async function markOnline(deviceId: string) {
  await redis.sadd("presence:online", deviceId);
  await redis.set(`presence:${deviceId}`, "1", "EX", 90);
}

export async function markOffline(deviceId: string) {
  await redis.srem("presence:online", deviceId);
  await redis.del(`presence:${deviceId}`);
}
