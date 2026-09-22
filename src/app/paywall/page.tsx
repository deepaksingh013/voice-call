"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Crown } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen, listItem, listStagger } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { PLANS, PRO_PERKS, type Plan } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";

/**
 * SCREEN 12 — Subscription paywall.
 *
 * Shown immediately after signup, while the user still wants the filter they
 * came for. The headline ties back to the trigger — "Choose who you talk to",
 * not "Go Pro". Monthly is pre-selected as the anchor; weekly exists to make
 * monthly look reasonable and to catch low-commitment users.
 *
 * Cancel anytime and Restore purchase stay visible without scrolling.
 */
export default function PaywallPage() {
  const router = useRouter();
  const { setTier } = useApp();
  const [selected, setSelected] = useState<Plan["id"]>("monthly");

  return (
    <>
      <PageHeader dismiss="close" fallbackHref="/talk" />

      <Screen width="narrow" className="pb-5 pt-1 sm:pt-4">
        <motion.span
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 16, stiffness: 280 }}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-gold/10 text-gold"
        >
          <Crown size={20} strokeWidth={2.2} />
        </motion.span>

        <h1 className="mt-5 text-[27px] font-bold leading-[1.15] tracking-tight text-chalk">
          Choose who
          <br />
          you talk to
        </h1>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-slate">
          Your account is ready. Pro unlocks the filters you just tried to use.
        </p>

        {/* Four perks, each one line. Gender first, because that is what
            brought them here. */}
        <motion.ul
          variants={listStagger}
          initial="hidden"
          animate="show"
          className="mt-6 space-y-3.5"
        >
          {PRO_PERKS.map(({ title, body }) => (
            <motion.li key={title} variants={listItem} className="flex gap-3">
              <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-mint-tint text-mint">
                <Check size={13} strokeWidth={3} />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-chalk">{title}</p>
                <p className="text-[11.5px] text-slate">{body}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>

        <div className="mt-auto space-y-2 pt-8">
          {PLANS.map((plan) => {
            const active = selected === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(plan.id)}
                className={cn(
                  "tap flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left",
                  active
                    ? "border-mint bg-mint-tint"
                    : "border-line bg-surface hover:border-slate/40",
                )}
              >
                <span
                  className={cn(
                    "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2",
                    active ? "border-mint" : "border-dim",
                  )}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-mint" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-chalk">
                    {plan.name}
                  </span>
                  <span
                    className={cn(
                      "block text-[11.5px]",
                      plan.id === "monthly" ? "text-mint" : "text-slate",
                    )}
                  >
                    {plan.note}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-[15px] font-bold text-chalk">
                    {plan.price}
                  </span>
                  <span className="block text-[10.5px] text-slate">
                    {plan.period}
                  </span>
                </span>
              </button>
            );
          })}

          <Button
            className="mt-3"
            onClick={() => {
              setTier("pro");
              router.push("/filters");
            }}
          >
            Continue — [PRICE]
          </Button>

          <p className="pt-1 text-center text-[10.5px] text-dim">
            Auto-renews. Cancel anytime.{" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-slate"
            >
              Restore purchase
            </button>
            .
          </p>
        </div>
      </Screen>
    </>
  );
}
