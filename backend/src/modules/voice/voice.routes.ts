import { Router, raw } from "express";
import { z } from "zod";
import type { Gender } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../lib/env.js";
import { logger } from "../../lib/logger.js";
import { wrap } from "../../http/middleware/error.js";
import { rateLimit } from "../../http/middleware/rateLimit.js";
import { badRequest } from "../../lib/errors.js";
import { bucketOf, dequeueEverywhere } from "../match/queue.js";

export const voiceRoutes = Router();

type Classification = {
  label: "female" | "male" | "unknown";
  confidence: number;
  features?: Record<string, number>;
};

/* -------------------------------------------------------------------------
 * Voice-based gender inference for guests.
 *
 * What is stored: a label, a confidence and a timestamp.
 * What is NOT stored: the audio, or any embedding derived from it.
 *
 * That distinction is the whole legal posture. A derived label is ordinary
 * personal data; a stored voiceprint is a biometric identifier and carries
 * statutory damages in several jurisdictions. The clip is classified in
 * memory by the Python service and discarded on the spot.
 *
 * The label is provisional by design. It is re-checked on later calls, it is
 * overridden the moment the person signs up and declares a gender, and it is
 * dropped entirely when reports suggest it is wrong.
 * ---------------------------------------------------------------------- */

const MAX_CLIP_BYTES = 2_000_000; // ~5s of 16kHz mono WAV, generously

voiceRoutes.post(
  "/classify",
  rateLimit({ key: "voice", limit: 10, windowSec: 3600 }),
  raw({ type: ["audio/*", "application/octet-stream"], limit: MAX_CLIP_BYTES }),
  wrap(async (req, res) => {
    const { device, user } = req.caller;

    // A signed-in user already told us. Never overwrite a declaration with
    // a guess, and do not waste the inference call.
    if (user) {
      return res.json({
        ok: true,
        skipped: "declared",
        gender: user.gender,
      });
    }

    const audio = req.body as Buffer;
    if (!Buffer.isBuffer(audio) || audio.length < 4000) {
      throw badRequest("Send at least a couple of seconds of audio");
    }

    let result: Classification;
    try {
      const upstream = await fetch(`${env.VOICE_SERVICE_URL}/classify`, {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: new Uint8Array(audio),
        signal: AbortSignal.timeout(5000),
      });
      if (!upstream.ok) throw new Error(`voice service ${upstream.status}`);
      result = (await upstream.json()) as Classification;
    } catch (err) {
      // A classifier outage must never block calling. The caller simply
      // stays unknown and keeps matching in the general pool.
      logger.warn({ err }, "voice service unavailable, staying unknown");
      return res.json({ ok: true, label: "unknown", confidence: 0, degraded: true });
    }

    const confident =
      result.label !== "unknown" && result.confidence >= env.VOICE_CONFIDENCE_THRESHOLD;

    const inferred: Gender | null = !confident
      ? null
      : result.label === "female"
        ? "FEMALE"
        : "MALE";

    await prisma.device.update({
      where: { id: device.id },
      data: {
        inferredGender: inferred,
        inferredConfidence: result.confidence,
        inferredAt: new Date(),
      },
    });

    // The bucket they belong in just changed, so any stale queue entry has
    // to go. The client re-searches and lands in the right queue.
    await dequeueEverywhere(device.id, device.country).catch(() => undefined);

    logger.debug(
      { deviceId: device.id, label: result.label, confidence: result.confidence },
      "voice classified",
    );

    res.json({
      ok: true,
      label: result.label,
      confidence: result.confidence,
      /** Whether it cleared the bar to be used for filtered matching. */
      used: confident,
      bucket: bucketOf(inferred),
    });
  }),
);

/**
 * Development-only hook to set an inference without real audio, so the
 * matching path can be tested before the classifier exists. Refuses to run
 * outside development — this endpoint grants entry to gender-filtered pools
 * and must never be reachable in production.
 */
voiceRoutes.post(
  "/_test-set",
  wrap(async (req, res) => {
    if (env.NODE_ENV !== "development") throw badRequest("Not available");

    const { label, confidence } = z
      .object({
        label: z.enum(["female", "male", "unknown"]),
        confidence: z.number().min(0).max(1),
      })
      .parse(req.body);

    const inferred: Gender | null =
      label === "unknown" || confidence < env.VOICE_CONFIDENCE_THRESHOLD
        ? null
        : label === "female"
          ? "FEMALE"
          : "MALE";

    await prisma.device.update({
      where: { id: req.caller.device.id },
      data: {
        inferredGender: inferred,
        inferredConfidence: confidence,
        inferredAt: new Date(),
      },
    });

    res.json({ ok: true, inferred, confidence, bucket: bucketOf(inferred) });
  }),
);

/**
 * Feedback loop. When someone who filtered for a gender reports the match as
 * the wrong one, the label that produced it is thrown away rather than
 * quietly kept. Called by the report pipeline, not by the client.
 */
export async function invalidateInference(deviceId: string) {
  await prisma.device.update({
    where: { id: deviceId },
    data: { inferredGender: null, inferredConfidence: null },
  });
}
