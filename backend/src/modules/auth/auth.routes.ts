import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../lib/env.js";
import { logger } from "../../lib/logger.js";
import { wrap } from "../../http/middleware/error.js";
import { rateLimit } from "../../http/middleware/rateLimit.js";
import {
  SESSION_COOKIE,
  clearCookie,
  setCookie,
} from "../../http/middleware/context.js";
import {
  codeMatches,
  hashCode,
  newLoginCode,
  signSessionToken,
} from "../../lib/tokens.js";
import { attachDeviceToUser } from "../identity/identity.service.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";
import { ageFrom } from "../../lib/handles.js";

export const authRoutes = Router();

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;

/* -------------------------------------------------------------------------
 * Step 1 — request a code.
 *
 * No phone number is requested anywhere in this product, and no password is
 * ever created, so this is the entire credential flow.
 * ---------------------------------------------------------------------- */

authRoutes.post(
  "/request-code",
  rateLimit({ key: "code", limit: 5, windowSec: 600 }),
  wrap(async (req, res) => {
    const { email } = z
      .object({ email: z.string().email() })
      .parse(req.body);

    const code = newLoginCode();

    await prisma.loginCode.create({
      data: {
        email: email.toLowerCase(),
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000),
      },
    });

    // TODO: hand off to a transactional email provider (Resend, SES, Postmark).
    // This is the one place that needs to change.
    const exposeCode = env.NODE_ENV === "development" || env.UNSAFE_RETURN_LOGIN_CODES;

    if (exposeCode) {
      logger.info({ email, code }, "login code (not emailed)");
    } else {
      logger.warn(
        { email },
        "login code generated but no email provider is configured — the user cannot receive it",
      );
    }

    if (env.UNSAFE_RETURN_LOGIN_CODES && env.NODE_ENV === "production") {
      logger.warn(
        "UNSAFE_RETURN_LOGIN_CODES is on in production. Anyone can sign in as any email. Turn it off before real users.",
      );
    }

    res.json({
      ok: true,
      expiresInMinutes: CODE_TTL_MIN,
      ...(exposeCode ? { devCode: code } : {}),
    });
  }),
);

/* -------------------------------------------------------------------------
 * Step 2 — verify the code and, for a new account, collect the two fields
 * the gender filter actually needs.
 * ---------------------------------------------------------------------- */

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  // Required only when the account does not exist yet.
  name: z.string().min(1).max(40).optional(),
  gender: z.enum(["FEMALE", "MALE", "OTHER"]).optional(),
  dateOfBirth: z.coerce.date().optional(),
});

authRoutes.post(
  "/verify",
  rateLimit({ key: "verify", limit: 10, windowSec: 600 }),
  wrap(async (req, res) => {
    const body = verifySchema.parse(req.body);
    const email = body.email.toLowerCase();

    const record = await prisma.loginCode.findFirst({
      where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!record) throw badRequest("That code has expired. Request a new one.");
    if (record.attempts >= MAX_ATTEMPTS) {
      throw badRequest("Too many attempts. Request a new code.");
    }

    if (!codeMatches(body.code, record.codeHash)) {
      await prisma.loginCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw badRequest("That code is not right.");
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // New account: gender and date of birth are mandatory here because
      // this is the first point where either does any work.
      //
      // The code is deliberately NOT consumed on this branch. The client
      // sends it a second time with the profile attached, and burning it
      // here would force them to request a fresh one mid-signup.
      if (!body.name || !body.gender || !body.dateOfBirth) {
        return res.status(200).json({
          ok: true,
          needsProfile: true,
          message: "Code accepted. Send name, gender and dateOfBirth to finish.",
        });
      }

      // Hard block, not a warning. An under-18 signup ends here and the
      // guest session on this device ends with it.
      if (ageFrom(body.dateOfBirth) < 18) {
        await prisma.device.update({
          where: { id: req.caller.device.id },
          data: {
            bannedAt: new Date(),
            bannedReason: "Under 18 at signup",
          },
        });
        throw forbidden("You must be 18 or older to use this app.");
      }

      user = await prisma.user.create({
        data: {
          email,
          name: body.name,
          gender: body.gender,
          dateOfBirth: body.dateOfBirth,
          tier: "FREE",
          filters: { create: {} },
        },
      });
    }

    if (user.suspendedAt) throw forbidden("This account is suspended.");

    // Now that a session is definitely being issued, the code is spent.
    await prisma.loginCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000),
      },
    });

    // Carry the guest's device — and therefore their call history — onto
    // the new account rather than discarding it.
    await attachDeviceToUser(req.caller.device.id, user.id);

    const jwt = await signSessionToken(session.id, user.id);
    setCookie(res, SESSION_COOKIE, jwt, env.SESSION_TTL_DAYS);
    res.setHeader("x-session-token", jwt);

    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        tier: user.tier,
      },
    });
  }),
);

authRoutes.post(
  "/logout",
  wrap(async (req, res) => {
    if (req.caller.user) {
      await prisma.session.deleteMany({ where: { userId: req.caller.user.id } });
    }
    clearCookie(res, SESSION_COOKIE);
    res.json({ ok: true });
  }),
);

/** Everything the client needs to render the shell on first paint. */
authRoutes.get(
  "/me",
  wrap(async (req, res) => {
    const { device, user, tier, effectiveGender, genderIsDeclared } = req.caller;

    res.json({
      tier,
      device: {
        id: device.id,
        country: device.country,
        banned: device.bannedAt !== null,
      },
      gender: effectiveGender,
      genderIsDeclared,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            gender: user.gender,
            tier: user.tier,
            proRenewsAt: user.proRenewsAt,
            strikes: user.strikes,
          }
        : null,
    });
  }),
);

/** Delete my data — a working path, not decoration. */
authRoutes.delete(
  "/me",
  wrap(async (req, res) => {
    const user = req.caller.user;
    if (!user) throw notFound("No account on this device");

    // Reports made against this user survive deletion: safety records are
    // exactly what the retention exemption exists for.
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { senderId: user.id } }),
      prisma.friendship.deleteMany({
        where: { OR: [{ aId: user.id }, { bId: user.id }] },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.filterPref.deleteMany({ where: { userId: user.id } }),
      prisma.device.updateMany({
        where: { userId: user.id },
        data: { userId: null },
      }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    clearCookie(res, SESSION_COOKIE);
    res.json({ ok: true, deleted: true });
  }),
);
