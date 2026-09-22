import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { Gender } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { verifyToken, type DeviceClaims, type SessionClaims } from "../lib/tokens.js";
import {
  findDeviceByToken,
  resolveCaller,
  type Caller,
} from "../modules/identity/identity.service.js";
import {
  bucketOf,
  dequeueEverywhere,
  enqueue,
  getWaiting,
  markOffline,
  markOnline,
  type Waiting,
} from "../modules/match/queue.js";
import { estimateWaitSeconds, rememberPair, tryMatch } from "../modules/match/matcher.js";
import { guestHandle, ageFrom } from "../lib/handles.js";

/**
 * The realtime layer.
 *
 * It does three jobs: presence, matchmaking, and relaying WebRTC signalling
 * between the two people on a call. The media itself never touches this
 * server — a 1:1 voice call is peer-to-peer, which is why no SFU is needed
 * here. In production a TURN server handles the ~15% of networks where the
 * direct path fails.
 */

/** Reasons a call can end from this layer. REPORTED is set by the report route. */
type EndReason = "HANGUP" | "SKIPPED" | "DISCONNECTED";

type Conn = {
  ws: WebSocket;
  caller: Caller;
  /** Set while on a call. */
  callId?: string;
  peerDeviceId?: string;
  alive: boolean;
};

const conns = new Map<string, Conn>(); // deviceId -> connection

type ClientMsg =
  | { t: "search"; wantsGender?: Gender | null; wantsRegion?: string | null; languages?: string[] }
  | { t: "cancel" }
  | { t: "signal"; data: unknown }
  | { t: "end"; reason?: EndReason }
  | { t: "rate"; value: -1 | 0 | 1 }
  | { t: "ping" };

function send(ws: WebSocket, msg: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

/** What the other side is allowed to know about you mid-call. */
async function publicProfile(deviceId: string) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: { user: true },
  });
  if (!device) return null;

  const isGuest = !device.user;
  return {
    deviceId: device.id,
    // Guests get a two-word handle; account holders get their first name.
    name: device.user?.name ?? guestHandle(device.id),
    country: device.country,
    verified: !isGuest,
    age: device.user ? ageFrom(device.user.dateOfBirth) : null,
    // Gender is shown only when the person declared it themselves. An
    // inference is good enough to route a match, not to state as fact.
    gender: device.user?.gender ?? null,
  };
}

async function buildWaiting(
  caller: Caller,
  opts: { wantsGender?: Gender | null; wantsRegion?: string | null; languages?: string[] },
): Promise<Waiting> {
  const pref = caller.user
    ? await prisma.filterPref.findUnique({ where: { userId: caller.user.id } })
    : null;

  // Gender and region are Pro-only. A free or guest caller asking for them
  // is silently matched as "Anyone" — the client already gates this, and the
  // server never trusts the client for entitlement.
  const isPro = caller.tier === "PRO";

  return {
    deviceId: caller.device.id,
    userId: caller.user?.id ?? null,
    tier: caller.tier,
    country: pref?.country ?? caller.device.country,
    bucket: bucketOf(caller.effectiveGender),
    wantsGender: isPro ? (opts.wantsGender ?? pref?.gender ?? null) : null,
    wantsRegion: isPro ? (opts.wantsRegion ?? pref?.region ?? null) : null,
    languages: opts.languages ?? pref?.languages ?? [],
    ageMin: pref?.ageMin ?? 18,
    ageMax: pref?.ageMax ?? 60,
    enqueuedAt: Date.now(),
    genderIsDeclared: caller.genderIsDeclared,
  };
}

async function announceMatch(callId: string, a: Waiting, b: Waiting) {
  const [ca, cb] = [conns.get(a.deviceId), conns.get(b.deviceId)];
  const [pa, pb] = await Promise.all([
    publicProfile(a.deviceId),
    publicProfile(b.deviceId),
  ]);
  if (!ca || !cb || !pa || !pb) return;

  ca.callId = callId;
  ca.peerDeviceId = b.deviceId;
  cb.callId = callId;
  cb.peerDeviceId = a.deviceId;

  // Exactly one side creates the offer, or both do and the negotiation
  // collides. The seeker is the impolite peer and offers first.
  send(ca.ws, { t: "matched", callId, peer: pb, initiator: true });
  send(cb.ws, { t: "matched", callId, peer: pa, initiator: false });
}

async function endCall(deviceId: string, reason: EndReason) {
  const conn = conns.get(deviceId);
  if (!conn?.callId) return;

  const { callId, peerDeviceId } = conn;

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (call && !call.endedAt) {
    const seconds = Math.max(
      0,
      Math.round((Date.now() - call.startedAt.getTime()) / 1000),
    );
    await prisma.call.update({
      where: { id: callId },
      data: { endedAt: new Date(), seconds, endReason: reason ?? "HANGUP" },
    });
  }

  conn.callId = undefined;
  conn.peerDeviceId = undefined;

  if (peerDeviceId) {
    const peer = conns.get(peerDeviceId);
    if (peer) {
      peer.callId = undefined;
      peer.peerDeviceId = undefined;
      send(peer.ws, { t: "peer-left", reason: reason ?? "HANGUP" });
    }
    await rememberPair(deviceId, peerDeviceId);
  }
}

async function authenticate(url: string): Promise<Caller | null> {
  const params = new URLSearchParams(url.split("?")[1] ?? "");
  const deviceJwt = params.get("device");
  const sessionJwt = params.get("session");
  if (!deviceJwt) return null;

  const claims = await verifyToken<DeviceClaims>(deviceJwt, "device");
  if (!claims) return null;

  const device = await findDeviceByToken(claims.did);
  if (!device || device.bannedAt) return null;

  let user = device.user ?? null;
  if (sessionJwt) {
    const s = await verifyToken<SessionClaims>(sessionJwt, "session");
    if (s) {
      const session = await prisma.session.findUnique({
        where: { id: s.sid },
        include: { user: true },
      });
      if (session && session.expiresAt > new Date()) user = session.user;
    }
  }
  if (user?.suspendedAt) return null;

  return resolveCaller(device, user);
}

export function attachGateway(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    const caller = await authenticate(req.url ?? "");
    if (!caller) {
      send(ws, { t: "error", message: "Unauthorized" });
      ws.close(4001, "unauthorized");
      return;
    }

    const deviceId = caller.device.id;

    // One connection per device. A second tab takes over rather than
    // creating a ghost that still holds a queue slot.
    conns.get(deviceId)?.ws.close(4000, "replaced");

    const conn: Conn = { ws, caller, alive: true };
    conns.set(deviceId, conn);
    await markOnline(deviceId);

    send(ws, {
      t: "ready",
      deviceId,
      tier: caller.tier,
      country: caller.device.country,
      gender: caller.effectiveGender,
      genderIsDeclared: caller.genderIsDeclared,
    });

    ws.on("pong", () => (conn.alive = true));

    ws.on("message", async (raw) => {
      let msg: ClientMsg;
      try {
        msg = JSON.parse(String(raw)) as ClientMsg;
      } catch {
        return send(ws, { t: "error", message: "Malformed message" });
      }

      try {
        switch (msg.t) {
          case "search": {
            if (conn.callId) return send(ws, { t: "error", message: "Already on a call" });

            const waiting = await buildWaiting(caller, msg);
            await enqueue(waiting);

            send(ws, {
              t: "searching",
              estimateSec: estimateWaitSeconds({
                wantsGender: waiting.wantsGender,
                wantsRegion: waiting.wantsRegion,
                country: waiting.country,
                ageSpan: waiting.ageMax - waiting.ageMin,
              }),
            });

            const match = await tryMatch(waiting);
            if (match) await announceMatch(match.callId, match.a, match.b);
            break;
          }

          case "cancel": {
            await dequeueEverywhere(deviceId, caller.device.country);
            send(ws, { t: "cancelled" });
            break;
          }

          // Pure relay. The server never inspects or stores SDP or ICE.
          case "signal": {
            if (!conn.peerDeviceId) return;
            const peer = conns.get(conn.peerDeviceId);
            if (peer) send(peer.ws, { t: "signal", data: msg.data });
            break;
          }

          case "end": {
            await endCall(deviceId, msg.reason ?? "HANGUP");
            send(ws, { t: "ended" });
            break;
          }

          case "rate": {
            if (!conn.callId) return;
            const call = await prisma.call.findUnique({ where: { id: conn.callId } });
            if (!call) return;
            const isCaller = call.callerDeviceId === deviceId;
            await prisma.call.update({
              where: { id: call.id },
              data: isCaller ? { callerRating: msg.value } : { peerRating: msg.value },
            });
            break;
          }

          case "ping":
            send(ws, { t: "pong" });
            break;
        }
      } catch (err) {
        logger.error({ err, t: msg.t }, "ws handler failed");
        send(ws, { t: "error", message: "Something went wrong" });
      }
    });

    ws.on("close", async () => {
      // Only clear the registry if this socket is still the current one —
      // a replaced connection must not evict its replacement.
      if (conns.get(deviceId)?.ws === ws) conns.delete(deviceId);
      await endCall(deviceId, "DISCONNECTED").catch(() => undefined);
      await dequeueEverywhere(deviceId, caller.device.country).catch(() => undefined);
      await markOffline(deviceId).catch(() => undefined);
    });
  });

  // Drop sockets that stopped answering, so they do not hold queue slots.
  const heartbeat = setInterval(() => {
    for (const [, c] of conns) {
      if (!c.alive) {
        c.ws.terminate();
        continue;
      }
      c.alive = false;
      c.ws.ping();
    }
  }, 30_000);

  /**
   * Retry sweep. Someone who arrives at an empty queue would otherwise wait
   * forever, because matching is only attempted when a search starts. This
   * gives every waiting person another attempt, and lets the widening
   * schedule take effect.
   */
  const sweep = setInterval(async () => {
    for (const [deviceId, c] of conns) {
      if (c.callId) continue;
      const waiting = await getWaiting(deviceId).catch(() => null);
      if (!waiting) continue;

      const match = await tryMatch(waiting).catch(() => null);
      if (match) {
        await announceMatch(match.callId, match.a, match.b);
        continue;
      }

      // After 20s stop spinning and let the client offer "notify me".
      if (Date.now() - waiting.enqueuedAt > 20_000) {
        send(c.ws, { t: "queue-empty" });
      }
    }
  }, 1500);

  wss.on("close", () => {
    clearInterval(heartbeat);
    clearInterval(sweep);
  });

  logger.info("websocket gateway attached at /ws");
  return wss;
}

export const connectionCount = () => conns.size;
