"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Lock, Crown } from "lucide-react";
import { VenusIcon, MarsIcon } from "@/components/ui/GenderIcons";
import { Badge } from "@/components/ui/Section";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";

/**
 * The gender filter, surfaced on its own wherever a call can start.
 *
 * This is the product's main paid lever, so it does not stay buried on the
 * filters screen. It appears on the home screen, while a match is being
 * found, during a call and on the call-ended screen — every moment where the
 * user is thinking about who they are about to talk to.
 *
 * Gating follows the spec's order of asking:
 *
 * - "Anyone" is the free behaviour and is always usable. Tapping it never
 *   nags, because the user already has it.
 * - "Women" and "Men" are Pro. A guest tapping one goes to signup; a signed-in
 *   free user goes straight to the paywall. Nobody is asked for money before
 *   they have an account, and nobody is asked for an account before they have
 *   reached for something they want.
 *
 * The locked options stay fully legible rather than hidden — showing what is
 * behind the gate does more selling than copy about it would.
 */

const OPTIONS = [
  { value: "Anyone", label: "Anyone", Icon: Users, pro: false },
  { value: "Women", label: "Women", Icon: VenusIcon, pro: true },
  { value: "Men", label: "Men", Icon: MarsIcon, pro: true },
] as const;

export function GenderFilterBar({
  variant = "card",
  className,
}: {
  /** `card` on idle screens, `inline` where space is tight (in call). */
  variant?: "card" | "inline";
  className?: string;
}) {
  const router = useRouter();
  const { isPro, isGuest, filters, setFilters } = useApp();

  const choose = (value: string, pro: boolean) => {
    if (pro && !isPro) {
      // Guests need an account first; free accounts go straight to the paywall.
      router.push(isGuest ? "/signup?want=gender" : "/paywall");
      return;
    }
    setFilters({ gender: value });
  };

  const options = (
    <div
      role="radiogroup"
      aria-label="Who do you want to talk to?"
      className={cn("grid grid-cols-3 gap-2", variant === "inline" && "gap-1.5")}
    >
      {OPTIONS.map(({ value, label, Icon, pro }) => {
        const active = isPro ? filters.gender === value : value === "Anyone";
        const locked = pro && !isPro;

        return (
          <motion.button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={
              locked ? `${label} — needs Pro` : `Talk to ${label.toLowerCase()}`
            }
            onClick={() => choose(value, pro)}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border font-semibold",
              "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60",
              variant === "card"
                ? "px-2 py-3 text-[13px]"
                : "px-2 py-2 text-[12px]",
              active
                ? "border-mint bg-mint-tint text-mint"
                : locked
                  ? "border-gold/30 bg-gold/[0.06] text-gold/90 hover:border-gold/60 hover:bg-gold/[0.1]"
                  : "border-line bg-surface text-ash hover:border-slate/50",
            )}
          >
            {locked && (
              <span className="absolute right-1.5 top-1.5 text-gold/80">
                <Lock size={10} strokeWidth={2.8} />
              </span>
            )}
            <Icon size={variant === "card" ? 19 : 16} strokeWidth={2.1} />
            {label}
          </motion.button>
        );
      })}
    </div>
  );

  if (variant === "inline") {
    return <div className={className}>{options}</div>;
  }

  return (
    <motion.section
      layout
      className={cn(
        "rounded-2xl border p-4",
        isPro ? "border-line bg-surface" : "border-gold/25 bg-gold/[0.04]",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate">
          Who do you want to talk to?
        </h2>
        {!isPro && <Badge tone="gold">Pro</Badge>}
      </div>

      {options}

      {!isPro && (
        <button
          type="button"
          onClick={() => router.push(isGuest ? "/signup?want=gender" : "/paywall")}
          className="tap mt-3 flex w-full items-center gap-2 rounded-xl bg-gold/10 px-3 py-2.5 text-left hover:bg-gold/15"
        >
          <Crown size={15} className="shrink-0 text-gold" strokeWidth={2.3} />
          <span className="flex-1 text-[12px] leading-snug text-ash">
            Choose who you meet.{" "}
            <span className="font-semibold text-gold">
              {isGuest ? "Create a free account" : "Upgrade to Pro"}
            </span>{" "}
            to match only women or only men.
          </span>
        </button>
      )}
    </motion.section>
  );
}
