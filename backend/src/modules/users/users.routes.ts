import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { wrap } from "../../http/middleware/error.js";
import { requireUser } from "../../http/middleware/context.js";
import { estimateWaitSeconds } from "../match/matcher.js";

export const userRoutes = Router();

/**
 * Filters.
 *
 * This endpoint is the reason the client can never be trusted for
 * entitlement: screens 09 and 13 are the same screen in two states, and the
 * only thing standing between a free account and the paid filters is this
 * check. Language stays free for everyone.
 */
const filterSchema = z.object({
  languages: z.array(z.string().max(30)).min(1).max(10).optional(),
  country: z.string().max(20).optional(),
  gender: z.enum(["FEMALE", "MALE"]).nullable().optional(),
  region: z.string().max(60).nullable().optional(),
  ageMin: z.number().int().min(18).max(99).optional(),
  ageMax: z.number().int().min(18).max(99).optional(),
});

userRoutes.get(
  "/filters",
  wrap(async (req, res) => {
    const { user, tier, device } = req.caller;

    if (!user) {
      // A guest is matched inside their own detected country. They can see
      // it; changing it is the upgrade.
      return res.json({
        filters: {
          languages: ["Hinglish"],
          country: device.country,
          gender: null,
          region: null,
          ageMin: 18,
          ageMax: 60,
        },
        locked: { gender: true, country: true, region: true, age: true },
        tier,
      });
    }

    const pref =
      (await prisma.filterPref.findUnique({ where: { userId: user.id } })) ??
      (await prisma.filterPref.create({ data: { userId: user.id } }));

    const isPro = tier === "PRO";
    res.json({
      filters: pref,
      locked: {
        gender: !isPro,
        country: !isPro,
        region: !isPro,
        age: !isPro,
      },
      tier,
      estimateSec: estimateWaitSeconds({
        wantsGender: isPro ? pref.gender : null,
        wantsRegion: isPro ? pref.region : null,
        country: pref.country,
        ageSpan: pref.ageMax - pref.ageMin,
      }),
    });
  }),
);

userRoutes.patch(
  "/filters",
  requireUser,
  wrap(async (req, res) => {
    const body = filterSchema.parse(req.body);
    const user = req.caller.user!;
    const isPro = req.caller.tier === "PRO";

    if (body.ageMin && body.ageMax && body.ageMin > body.ageMax) {
      body.ageMax = body.ageMin;
    }

    // Everything except language is Pro. Silently dropping the paid fields
    // for a free account is safer than trusting the client to hide them.
    const data = {
      languages: body.languages,
      ...(isPro
        ? {
            country: body.country,
            gender: body.gender,
            region: body.region,
            ageMin: body.ageMin,
            ageMax: body.ageMax,
          }
        : {}),
    };

    const pref = await prisma.filterPref.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });

    res.json({
      filters: pref,
      appliedProFields: isPro,
      estimateSec: estimateWaitSeconds({
        wantsGender: isPro ? pref.gender : null,
        wantsRegion: isPro ? pref.region : null,
        country: pref.country,
        ageSpan: pref.ageMax - pref.ageMin,
      }),
    });
  }),
);

/** Gender is locked after signup — without that the filter is worthless. */
userRoutes.patch(
  "/profile",
  requireUser,
  wrap(async (req, res) => {
    const { name } = z
      .object({ name: z.string().min(1).max(40) })
      .parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.caller.user!.id },
      data: { name },
    });

    res.json({ ok: true, name: user.name });
  }),
);
