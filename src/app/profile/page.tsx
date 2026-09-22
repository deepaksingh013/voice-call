"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  SlidersHorizontal,
  History,
  Users,
  CreditCard,
  Bell,
  UserX,
  ChevronRight,
  ShieldCheck,
  Crown,
} from "lucide-react";
import { Screen, listItem, listStagger } from "@/components/shell/Screen";
import { TabsChrome } from "@/components/shell/TabsChrome";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Section";
import { FRIENDS } from "@/lib/data";
import { useApp } from "@/lib/store";
import type { ReactNode } from "react";

/**
 * SCREEN 17 — Your profile.
 *
 * The signed-in, subscribed end state. "Manage subscription" is easy to find
 * on purpose — hiding it creates chargebacks, which cost far more than the
 * cancellations it saves. Cancelling is two taps from here and never requires
 * contacting support.
 */
function ProfileScreen() {
  const router = useRouter();
  const { name, tier, isGuest, isPro, filters, setTier } = useApp();

  if (isGuest) {
    return (
      <Screen width="base" center className="pb-6 pt-4 lg:pt-8">
        <h1 className="shrink-0 text-[22px] font-bold tracking-tight text-chalk">
          You
        </h1>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Avatar name="G" size="xl" className="opacity-70" />
          <p className="mt-4 text-[18px] font-bold text-chalk">Guest</p>
          <p className="mt-1 text-[12.5px] text-slate">Not signed in</p>
          <p className="mt-4 max-w-[270px] text-[12.5px] leading-relaxed text-slate">
            Your calls work exactly the same without an account. Signing up keeps
            your friends, history and filters when you switch phones.
          </p>
        </div>

        <div className="shrink-0 space-y-2.5">
          <Button onClick={() => router.push("/signup")}>
            Create free account
          </Button>
          <Button variant="secondary" onClick={() => router.push("/login")}>
            I already have an account
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen width="full" className="pb-4 pt-4 lg:pt-8">
      <h1 className="shrink-0 text-[22px] font-bold tracking-tight text-chalk">
        You
      </h1>

      <motion.div
        variants={listStagger}
        initial="hidden"
        animate="show"
        className="flex-1 lg:grid lg:grid-cols-2 lg:content-start lg:items-start lg:gap-x-10 lg:gap-y-2 xl:gap-x-14"
      >
        <motion.div
          variants={listItem}
          className="mt-4 flex items-center gap-3 lg:col-span-2 lg:mt-2"
        >
          <Avatar name={name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[18px] font-bold text-chalk">{name}</p>
            <p className="mt-1 flex items-center gap-2 text-[11.5px] text-slate">
              {isPro ? (
                <>
                  <Badge tone="gold">Pro</Badge>
                  {/* No surprise charges. */}
                  renews [DATE]
                </>
              ) : (
                <Badge>Free</Badge>
              )}
            </p>
          </div>
        </motion.div>

        {/* Three stats — light gamification without a points system. */}
        <motion.div
          variants={listItem}
          className="mt-5 grid grid-cols-3 gap-2 lg:col-span-2 lg:max-w-[560px] lg:gap-3"
        >
          {[
            { value: "142", label: "calls" },
            { value: "6h 21m", label: "talk time" },
            { value: String(FRIENDS.length), label: "friends" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-line bg-surface px-3 py-3 text-center"
            >
              <p className="text-[18px] font-bold tabular-nums text-chalk">
                {s.value}
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {!isPro && (
          <motion.button
            variants={listItem}
            type="button"
            onClick={() => router.push("/paywall")}
            className="tap mt-4 flex w-full items-center gap-3 rounded-2xl border border-gold/30 bg-gold/[0.07] px-4 py-3 text-left"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
              <Crown size={16} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold text-chalk">
                Upgrade to Pro
              </span>
              <span className="block text-[11.5px] text-slate">
                Gender, country and region filters
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-dim" />
          </motion.button>
        )}

        <motion.section variants={listItem} className="mt-5">
          <h2 className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-dim">
            Calling
          </h2>
          <Row
            icon={<SlidersHorizontal size={15} />}
            label="Filters"
            meta={`${filters.country} · ${isPro ? filters.gender : "Anyone"}`}
            onClick={() => router.push("/filters")}
          />
          <Row
            icon={<History size={15} />}
            label="Call history"
            onClick={() => router.push("/history")}
          />
          <Row
            icon={<Users size={15} />}
            label="Friends"
            meta={String(FRIENDS.length)}
            onClick={() => router.push("/friends")}
          />
        </motion.section>

        <motion.section variants={listItem} className="mt-4">
          <h2 className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-dim">
            Account
          </h2>
          <Row
            icon={<CreditCard size={15} />}
            label="Manage subscription"
            meta={isPro ? "Monthly" : "None"}
            onClick={() => router.push("/billing")}
          />
          <Row
            icon={<Bell size={15} />}
            label="Notifications"
            onClick={() => router.push("/notifications")}
          />
          {/* Users must be able to review and undo their own blocks. */}
          <Row
            icon={<UserX size={15} />}
            label="Blocked users"
            meta="3"
            onClick={() => router.push("/blocked")}
          />
        </motion.section>

        {/* Visible conduct records reduce repeat offences. */}
        <motion.div
          variants={listItem}
          className="mt-5 flex items-start gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3"
        >
          <ShieldCheck
            size={15}
            className="mt-0.5 shrink-0 text-mint"
            strokeWidth={2.2}
          />
          <p className="text-[12px] leading-relaxed text-ash">
            Account in good standing. 0 reports in the last 90 days.
          </p>
        </motion.div>

        {/* Prototype affordance: flip tiers to inspect every entitlement state. */}
        <motion.div variants={listItem} className="mt-5 pb-2">
          <h2 className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-dim">
            Prototype — switch tier
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {(["guest", "free", "pro"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`tap rounded-xl border py-2 text-[12px] font-semibold capitalize ${
                  tier === t
                    ? "border-mint/60 bg-mint-tint text-mint"
                    : "border-line bg-surface text-slate"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </Screen>
  );
}

function Row({
  icon,
  label,
  meta,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left hover:bg-surface"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-hi text-ash">
        {icon}
      </span>
      <span className="flex-1 text-[14px] font-medium text-chalk">{label}</span>
      {meta && <span className="text-[11.5px] text-slate">{meta}</span>}
      <ChevronRight size={15} className="text-dim" />
    </button>
  );
}

export default function ProfilePage() {
  return (
    <TabsChrome>
      <ProfileScreen />
    </TabsChrome>
  );
}
