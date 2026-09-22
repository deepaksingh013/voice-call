import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { wrap } from "../../http/middleware/error.js";
import { requireUser } from "../../http/middleware/context.js";
import { badRequest } from "../../lib/errors.js";

export const billingRoutes = Router();

/**
 * Subscriptions.
 *
 * The gateway is not wired up yet — that is a Razorpay integration with a
 * recurring mandate, and it needs real credentials. What is here is the
 * entitlement state machine the rest of the app reads from, plus the
 * endpoints the client already expects.
 *
 * Two things are deliberate:
 *
 * - Cancelling is two calls from the profile and never requires contacting
 *   support. Hiding it creates chargebacks, and chargebacks are what gets a
 *   merchant account frozen in this category.
 * - Pro survives until the end of the period that was paid for.
 */

const PLANS = {
  weekly: { days: 7, label: "Weekly" },
  monthly: { days: 30, label: "Monthly" },
  yearly: { days: 365, label: "Yearly" },
} as const;

billingRoutes.get(
  "/plans",
  wrap(async (_req, res) => {
    res.json({
      plans: Object.entries(PLANS).map(([id, p]) => ({
        id,
        label: p.label,
        days: p.days,
        // Prices come from the gateway, not from here.
        price: null,
      })),
    });
  }),
);

billingRoutes.get(
  "/subscription",
  requireUser,
  wrap(async (req, res) => {
    const user = req.caller.user!;
    res.json({
      tier: user.tier,
      plan: user.proPlan,
      since: user.proSince,
      renewsAt: user.proRenewsAt,
      active: user.tier === "PRO",
    });
  }),
);

/**
 * Stands in for the gateway callback. In production this is only ever
 * reached by a signed webhook from Razorpay — never by the client, because
 * the client must not be able to grant itself Pro.
 */
billingRoutes.post(
  "/subscribe",
  requireUser,
  wrap(async (req, res) => {
    const { plan } = z
      .object({ plan: z.enum(["weekly", "monthly", "yearly"]) })
      .parse(req.body);

    if (process.env.NODE_ENV === "production") {
      throw badRequest(
        "Direct subscribe is disabled. Payment must arrive via the gateway webhook.",
      );
    }

    const days = PLANS[plan].days;
    const user = await prisma.user.update({
      where: { id: req.caller.user!.id },
      data: {
        tier: "PRO",
        proPlan: plan,
        proSince: new Date(),
        proRenewsAt: new Date(Date.now() + days * 86_400_000),
      },
    });

    logger.info({ userId: user.id, plan }, "subscription activated (dev)");
    res.json({ ok: true, tier: user.tier, renewsAt: user.proRenewsAt });
  }),
);

billingRoutes.post(
  "/cancel",
  requireUser,
  wrap(async (req, res) => {
    const user = req.caller.user!;
    if (user.tier !== "PRO") throw badRequest("No active subscription");

    // They keep Pro until the period they paid for runs out. A cron job
    // downgrades expired subscriptions; see billing.expire.
    await prisma.user.update({
      where: { id: user.id },
      data: { proPlan: null },
    });

    res.json({
      ok: true,
      keepsProUntil: user.proRenewsAt,
      message: "Cancelled. You keep Pro until the end of the period.",
    });
  }),
);

/** Run on a schedule: drop anyone whose paid period has ended. */
export async function expireSubscriptions() {
  const { count } = await prisma.user.updateMany({
    where: {
      tier: "PRO",
      proPlan: null,
      proRenewsAt: { lt: new Date() },
    },
    data: { tier: "FREE", proSince: null, proRenewsAt: null },
  });
  if (count) logger.info({ count }, "expired subscriptions");
  return count;
}
