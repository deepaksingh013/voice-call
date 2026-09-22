"use client";

import { motion } from "framer-motion";
import { Ban, ShieldCheck, Gavel } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen, listItem, listStagger } from "@/components/shell/Screen";

/**
 * Community guidelines.
 *
 * This is the page you point to when you ban someone, so the rules are
 * specific and named. "Be nice" is not enforceable; "sexual content, abuse or
 * harassment" is.
 */

const BANNED = [
  "Sexual content of any kind, including asking for it.",
  "Anyone under 18, and anyone who appears to be.",
  "Abuse, threats, slurs or harassment.",
  "Scams, spam, promotion or recruiting.",
  "Recording or sharing a call without consent.",
];

const EXPECTED = [
  "Leave any call you do not want to be on. You owe nobody an explanation.",
  "Report rather than argue. It takes one tap and it ends the call.",
  "Keep personal details — number, address, payment info — off the call.",
];

export default function GuidelinesPage() {
  return (
    <>
      <PageHeader title="Community guidelines" />

      <Screen width="wide" className="pb-6 pt-4 lg:pt-7">
        <p className="text-[13px] leading-relaxed text-ash">
          Two things close products like this one: minors on the platform, and
          sexual content. These rules exist for those two reasons, and they are
          enforced.
        </p>

        <motion.div
          variants={listStagger}
          initial="hidden"
          animate="show"
          className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8"
        >
          <motion.section variants={listItem} className="mt-6">
            <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-bold text-coral">
              <Ban size={15} strokeWidth={2.4} />
              Gets you banned
            </h2>
            <ul className="space-y-2">
              {BANNED.map((r) => (
                <li
                  key={r}
                  className="rounded-xl border border-line bg-surface px-4 py-2.5 text-[12.5px] leading-relaxed text-ash"
                >
                  {r}
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.section variants={listItem} className="mt-6">
            <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-bold text-mint">
              <ShieldCheck size={15} strokeWidth={2.4} />
              What we expect
            </h2>
            <ul className="space-y-2">
              {EXPECTED.map((r) => (
                <li
                  key={r}
                  className="rounded-xl border border-line bg-surface px-4 py-2.5 text-[12.5px] leading-relaxed text-ash"
                >
                  {r}
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.section
            variants={listItem}
            className="mt-6 rounded-2xl border border-line bg-surface px-4 py-3.5"
          >
            <h2 className="mb-1.5 flex items-center gap-2 text-[13px] font-bold text-chalk">
              <Gavel size={15} strokeWidth={2.4} />
              How enforcement works
            </h2>
            <p className="text-[12px] leading-relaxed text-slate">
              Reports go to a moderator. Three upheld reports suspend the account
              automatically. Reports of someone under 18 go to a separate, faster
              queue and are actioned first. Bans follow the device, not just the
              account.
            </p>
          </motion.section>
        </motion.div>
      </Screen>
    </>
  );
}
