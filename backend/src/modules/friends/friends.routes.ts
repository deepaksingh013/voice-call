import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { wrap } from "../../http/middleware/error.js";
import { requireUser } from "../../http/middleware/context.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";

export const friendRoutes = Router();

friendRoutes.use(requireUser);

/** A pair is stored once, always with the smaller id first. */
const pairOf = (x: string, y: string) =>
  x < y ? { aId: x, bId: y } : { aId: y, bId: x };

/**
 * Friend requests.
 *
 * A thread exists only after both sides accepted. A one-sided add must never
 * open a message channel — that turns the friends list into a way to follow
 * someone who wanted the call to end.
 */
friendRoutes.post(
  "/request",
  wrap(async (req, res) => {
    const { deviceId } = z.object({ deviceId: z.string() }).parse(req.body);
    const me = req.caller.user!;

    const target = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { user: true },
    });
    if (!target?.user) throw badRequest("That person does not have an account yet");
    if (target.user.id === me.id) throw badRequest("That is you");

    const pair = pairOf(me.id, target.user.id);
    const existing = await prisma.friendship.findUnique({
      where: { aId_bId: pair },
    });

    if (existing) {
      if (existing.status === "BLOCKED") throw forbidden("Not available");
      if (existing.status === "ACCEPTED") {
        return res.json({ ok: true, status: "ACCEPTED", friendshipId: existing.id });
      }
      // The other side already asked — this request completes the handshake.
      if (existing.requestedBy !== me.id) {
        const accepted = await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        });
        return res.json({ ok: true, status: "ACCEPTED", friendshipId: accepted.id });
      }
      return res.json({ ok: true, status: "PENDING", friendshipId: existing.id });
    }

    const created = await prisma.friendship.create({
      data: { ...pair, requestedBy: me.id, status: "PENDING" },
    });

    res.status(201).json({ ok: true, status: "PENDING", friendshipId: created.id });
  }),
);

friendRoutes.get(
  "/",
  wrap(async (req, res) => {
    const me = req.caller.user!;

    const rows = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ aId: me.id }, { bId: me.id }],
      },
      include: {
        a: true,
        b: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    res.json({
      friends: rows.map((f) => {
        const other = f.aId === me.id ? f.b : f.a;
        const last = f.messages[0];
        return {
          friendshipId: f.id,
          userId: other.id,
          name: other.name,
          gender: other.gender,
          since: f.acceptedAt,
          preview: last?.body ?? null,
          at: last?.createdAt ?? null,
        };
      }),
    });
  }),
);

/** The only place messages are kept. Friends only, never strangers. */
friendRoutes.get(
  "/:id/messages",
  wrap(async (req, res) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const me = req.caller.user!;

    const f = await prisma.friendship.findUnique({ where: { id } });
    if (!f || (f.aId !== me.id && f.bId !== me.id)) throw notFound();
    if (f.status !== "ACCEPTED") throw forbidden("Not friends yet");

    const messages = await prisma.message.findMany({
      where: { friendshipId: id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    res.json({
      messages: messages.map((m) => ({
        id: m.id,
        from: m.senderId === me.id ? "me" : "them",
        text: m.body,
        at: m.createdAt,
      })),
    });
  }),
);

friendRoutes.post(
  "/:id/messages",
  wrap(async (req, res) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    // Plain text only. No images, no files, no links that preview — that one
    // restriction removes most of the abuse surface chat would otherwise add.
    const { body } = z
      .object({ body: z.string().min(1).max(2000) })
      .parse(req.body);
    const me = req.caller.user!;

    const f = await prisma.friendship.findUnique({ where: { id } });
    if (!f || (f.aId !== me.id && f.bId !== me.id)) throw notFound();
    if (f.status !== "ACCEPTED") throw forbidden("Not friends yet");

    const msg = await prisma.message.create({
      data: { friendshipId: id, senderId: me.id, body },
    });

    res.status(201).json({ ok: true, id: msg.id, at: msg.createdAt });
  }),
);

/** A friend can turn bad later, so this stays reachable from the thread. */
friendRoutes.post(
  "/:id/block",
  wrap(async (req, res) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const me = req.caller.user!;

    const f = await prisma.friendship.findUnique({ where: { id } });
    if (!f || (f.aId !== me.id && f.bId !== me.id)) throw notFound();

    await prisma.friendship.update({
      where: { id },
      data: { status: "BLOCKED" },
    });

    res.json({ ok: true });
  }),
);

/** Users must be able to review and undo their own blocks. */
friendRoutes.get(
  "/blocked",
  wrap(async (req, res) => {
    const me = req.caller.user!;
    const rows = await prisma.friendship.findMany({
      where: { status: "BLOCKED", OR: [{ aId: me.id }, { bId: me.id }] },
      include: { a: true, b: true },
    });

    res.json({
      blocked: rows.map((f) => {
        const other = f.aId === me.id ? f.b : f.a;
        return { friendshipId: f.id, userId: other.id, name: other.name };
      }),
    });
  }),
);

friendRoutes.post(
  "/:id/unblock",
  wrap(async (req, res) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const me = req.caller.user!;

    const f = await prisma.friendship.findUnique({ where: { id } });
    if (!f || (f.aId !== me.id && f.bId !== me.id)) throw notFound();

    await prisma.friendship.update({
      where: { id },
      data: { status: "ACCEPTED" },
    });
    res.json({ ok: true });
  }),
);
