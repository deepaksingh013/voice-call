import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { wrap } from "../../http/middleware/error.js";
import { rateLimit } from "../../http/middleware/rateLimit.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { invalidateInference } from "../voice/voice.routes.js";

export const reportRoutes = Router();

const AUDIO_RETENTION_DAYS = 30;
const STRIKES_TO_SUSPEND = 3;

const reportSchema = z.object({
  callId: z.string().min(1),
  reason: z.enum(["SEXUAL", "MINOR", "ABUSE", "SCAM", "OTHER"]),
  note: z.string().max(500).optional(),
  /** Object key of the rolling 60s buffer, if the reporter attached it. */
  audioKey: z.string().max(200).optional(),
  /** Set when the reporter had filtered for a gender and got the other one. */
  wrongGender: z.boolean().optional(),
});

/**
 * Reporting fires on the first tap and ends the call. There is deliberately
 * no confirmation step anywhere in this path: an "are you sure?" between
 * someone being harassed and the exit is the wrong thing to build.
 */
reportRoutes.post(
  "/",
  rateLimit({ key: "report", limit: 20, windowSec: 3600 }),
  wrap(async (req, res) => {
    const body = reportSchema.parse(req.body);
    const me = req.caller.device.id;

    const call = await prisma.call.findUnique({ where: { id: body.callId } });
    if (!call) throw notFound("Call not found");

    if (call.callerDeviceId !== me && call.peerDeviceId !== me) {
      throw badRequest("You were not on that call");
    }

    // Late reporting matters — many people only report after they have hung
    // up and calmed down. The window stays open well past the call.
    const hoursSince = (Date.now() - call.startedAt.getTime()) / 3_600_000;
    if (hoursSince > 24) throw badRequest("Reports close 24 hours after a call");

    const reportedDeviceId =
      call.callerDeviceId === me ? call.peerDeviceId : call.callerDeviceId;

    const existing = await prisma.report.findFirst({
      where: { callId: call.id, reporterDeviceId: me },
    });
    if (existing) return res.json({ ok: true, alreadyReported: true });

    const report = await prisma.report.create({
      data: {
        callId: call.id,
        reporterDeviceId: me,
        reportedDeviceId,
        reason: body.reason,
        note: body.note,
        audioKey: body.audioKey,
        audioExpiresAt: body.audioKey
          ? new Date(Date.now() + AUDIO_RETENTION_DAYS * 86_400_000)
          : null,
      },
    });

    if (!call.endedAt) {
      await prisma.call.update({
        where: { id: call.id },
        data: { endedAt: new Date(), endReason: "REPORTED" },
      });
    }

    // A wrong-gender report is the ground truth for the classifier. Throw
    // away the label that produced this match rather than keep trusting it.
    if (body.wrongGender) {
      await invalidateInference(reportedDeviceId).catch(() => undefined);
      logger.warn(
        { reportedDeviceId, callId: call.id },
        "wrong-gender report, inference invalidated",
      );
    }

    // "Seems to be under 18" goes to its own faster lane.
    if (body.reason === "MINOR") {
      logger.warn({ reportId: report.id, reportedDeviceId }, "MINOR report — fast lane");
    }

    res.status(201).json({ ok: true, reportId: report.id });
  }),
);

/**
 * Moderation decision. Three upheld reports auto-suspend — build this before
 * launch, not after the first incident.
 */
reportRoutes.post(
  "/:id/review",
  wrap(async (req, res) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { status, moderator } = z
      .object({
        status: z.enum(["UPHELD", "REJECTED"]),
        moderator: z.string().max(80).default("system"),
      })
      .parse(req.body);

    const report = await prisma.report.findUnique({
      where: { id },
      include: { reportedDevice: { include: { user: true } } },
    });
    if (!report) throw notFound("Report not found");
    if (report.status !== "PENDING") throw badRequest("Already reviewed");

    await prisma.report.update({
      where: { id },
      data: { status, reviewedAt: new Date(), reviewedBy: moderator },
    });

    if (status !== "UPHELD") return res.json({ ok: true, status });

    const device = report.reportedDevice;
    const user = device.user;

    if (user) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { strikes: { increment: 1 } },
      });
      if (updated.strikes >= STRIKES_TO_SUSPEND && !updated.suspendedAt) {
        await prisma.user.update({
          where: { id: user.id },
          data: { suspendedAt: new Date() },
        });
        // The ban follows the device too, or they return as a guest.
        await prisma.device.updateMany({
          where: { userId: user.id },
          data: { bannedAt: new Date(), bannedReason: "3 upheld reports" },
        });
      }
    } else {
      // A guest has no strike counter to carry, so an upheld report against
      // one bans the device directly. Without this a banned guest clears
      // cookies and is back in ten seconds.
      const upheld = await prisma.report.count({
        where: { reportedDeviceId: device.id, status: "UPHELD" },
      });
      if (upheld >= STRIKES_TO_SUSPEND) {
        await prisma.device.update({
          where: { id: device.id },
          data: { bannedAt: new Date(), bannedReason: "3 upheld reports (guest)" },
        });
      }
    }

    res.json({ ok: true, status });
  }),
);

/** The moderation queue, minors first. */
reportRoutes.get(
  "/pending",
  wrap(async (_req, res) => {
    const reports = await prisma.report.findMany({
      where: { status: "PENDING" },
      orderBy: [{ createdAt: "asc" }],
      take: 100,
      include: { call: { select: { seconds: true, startedAt: true } } },
    });

    reports.sort((a, b) =>
      a.reason === "MINOR" && b.reason !== "MINOR"
        ? -1
        : b.reason === "MINOR" && a.reason !== "MINOR"
          ? 1
          : 0,
    );

    res.json({ reports });
  }),
);
