import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { wrap } from "../../http/middleware/error.js";
import { guestHandle } from "../../lib/handles.js";
import { onlineCount } from "../match/queue.js";

export const callRoutes = Router();

const clock = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/**
 * Call history.
 *
 * A guest's history follows their device, so it survives a refresh but not a
 * new phone — which is the honest reason to create an account, and what the
 * client says on this screen. On signup the device is attached to the user,
 * so the history comes along rather than being discarded.
 */
callRoutes.get(
  "/history",
  wrap(async (req, res) => {
    const { filter } = z
      .object({ filter: z.enum(["all", "friends", "reported"]).default("all") })
      .parse(req.query);

    const me = req.caller.device.id;

    const calls = await prisma.call.findMany({
      where: {
        OR: [{ callerDeviceId: me }, { peerDeviceId: me }],
        endedAt: { not: null },
      },
      orderBy: { startedAt: "desc" },
      take: 100,
      include: {
        callerDevice: { include: { user: true } },
        peerDevice: { include: { user: true } },
        reports: { select: { reporterDeviceId: true } },
      },
    });

    const myFriendIds = new Set<string>();
    if (req.caller.user) {
      const fs = await prisma.friendship.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ aId: req.caller.user.id }, { bId: req.caller.user.id }],
        },
      });
      for (const f of fs) {
        myFriendIds.add(f.aId === req.caller.user.id ? f.bId : f.aId);
      }
    }

    const rows = calls.map((c) => {
      const other = c.callerDeviceId === me ? c.peerDevice : c.callerDevice;
      const reported = c.reports.some((r) => r.reporterDeviceId === me);
      const isFriend = other.userId ? myFriendIds.has(other.userId) : false;

      return {
        id: c.id,
        deviceId: other.id,
        // Two-word names are guests; a real first name means a verified
        // account. The client leans on that distinction, so keep it exact.
        name: other.user?.name ?? guestHandle(other.id),
        verified: Boolean(other.user),
        country: other.country,
        at: c.startedAt,
        duration: clock(c.seconds),
        seconds: c.seconds,
        reported,
        friend: isFriend,
        canAddFriend: Boolean(other.userId) && !isFriend,
        // Late reporting stays open for 24 hours.
        canReport:
          !reported &&
          Date.now() - c.startedAt.getTime() < 24 * 3_600_000,
      };
    });

    const filtered =
      filter === "friends"
        ? rows.filter((r) => r.friend)
        : filter === "reported"
          ? rows.filter((r) => r.reported)
          : rows;

    res.json({
      calls: filtered,
      deviceOnly: !req.caller.user,
    });
  }),
);

/** Powers the online counter. Never fake this number; hide it if it is low. */
callRoutes.get(
  "/online",
  wrap(async (_req, res) => {
    const count = await onlineCount();
    res.json({ online: count, show: count >= 20 });
  }),
);

callRoutes.get(
  "/stats",
  wrap(async (req, res) => {
    const me = req.caller.device.id;

    const agg = await prisma.call.aggregate({
      where: {
        OR: [{ callerDeviceId: me }, { peerDeviceId: me }],
        endedAt: { not: null },
      },
      _count: { _all: true },
      _sum: { seconds: true },
    });

    let friends = 0;
    if (req.caller.user) {
      friends = await prisma.friendship.count({
        where: {
          status: "ACCEPTED",
          OR: [{ aId: req.caller.user.id }, { bId: req.caller.user.id }],
        },
      });
    }

    const total = agg._sum.seconds ?? 0;
    res.json({
      calls: agg._count._all,
      talkSeconds: total,
      talkTime: `${Math.floor(total / 3600)}h ${Math.floor((total % 3600) / 60)}m`,
      friends,
      strikes: req.caller.user?.strikes ?? 0,
    });
  }),
);
