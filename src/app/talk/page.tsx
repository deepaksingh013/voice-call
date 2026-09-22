"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SlidersHorizontal, Users } from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { Toggle } from "@/components/ui/Toggle";
import { Screen } from "@/components/shell/Screen";
import { TabsChrome } from "@/components/shell/TabsChrome";
import { CallButton } from "@/components/call/CallButton";
import { GenderFilterBar } from "@/components/call/GenderFilterBar";
import { INTERESTS } from "@/lib/data";
import { useApp } from "@/lib/store";

/**
 * SCREEN 02 — Home, guest idle.
 *
 * Everything is arranged around a single dominant call button. The controls
 * that only matter during a call live on screen 04, not here.
 *
 * Phones stack: filters, heading, button, interests. From `lg` the
 * secondary controls move into a right rail so the call button keeps the
 * optical centre instead of being pushed up by everything below it.
 */
function TalkScreen() {
  const router = useRouter();
  const {
    isGuest,
    isPro,
    interests,
    toggleInterest,
    autoConnect,
    setAutoConnect,
    filters,
  } = useApp();

  const interestTags = (
    <div className="flex flex-wrap gap-2">
      {INTERESTS.map((tag) => (
        <Pill
          key={tag}
          active={interests.includes(tag)}
          onClick={() => toggleInterest(tag)}
        >
          {tag}
        </Pill>
      ))}
    </div>
  );

  const autoConnectRow = (
    <motion.div
      layout
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-chalk">
          Auto-connect next call
        </p>
        <p className="text-[11.5px] text-slate">Hang up and we dial again</p>
      </div>
      <Toggle
        checked={autoConnect}
        onChange={setAutoConnect}
        label="Auto-connect next call"
      />
    </motion.div>
  );

  return (
    <Screen width="full" className="pb-4 pt-4 lg:pb-8 lg:pt-8">
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10 xl:gap-14">
        {/* Primary column — nothing competes with the call button. */}
        <div className="flex flex-1 flex-col lg:min-h-[calc(100dvh-9rem)]">
          {/* Filter pills: the free one is active, the locked one shows a
              padlock. Tapping the locked pill routes to the filters gate. */}
          <div className="flex shrink-0 flex-wrap gap-2">
            <Pill
              icon={<Users size={13} strokeWidth={2.2} />}
              onClick={() => router.push("/filters")}
            >
              {isPro ? filters.gender : "Anyone"} · {filters.country}
            </Pill>
            <Pill
              locked={isGuest}
              icon={
                !isGuest ? (
                  <SlidersHorizontal size={13} strokeWidth={2.2} />
                ) : undefined
              }
              onClick={() => router.push("/filters")}
            >
              Filters
            </Pill>
          </div>

          <div className="mt-5 shrink-0">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-chalk sm:text-[30px] lg:text-[34px]">
              Talk to someone new
            </h1>
            <p className="mt-1.5 max-w-[52ch] text-[12.5px] leading-relaxed text-slate sm:text-[14px]">
              Voice only — no video, no photos. Leave any call in one tap.
            </p>
          </div>

          {/* The paid lever, directly under the heading: the user decides who
              they want before they press call. On desktop it moves to the top
              of the rail so it does not push the button off centre. */}
          <GenderFilterBar className="mt-4 shrink-0 lg:hidden" />

          <div className="flex flex-1 items-center justify-center py-6 lg:py-10">
            <CallButton onClick={() => router.push("/searching")} />
          </div>

          {/* Below lg these sit under the button; above lg they are in the rail. */}
          <div className="shrink-0 space-y-3 lg:hidden">
            <section>
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-dim">
                Match me on
              </h2>
              {interestTags}
            </section>
            {autoConnectRow}
          </div>
        </div>

        {/* Right rail — desktop only. */}
        <aside className="hidden shrink-0 space-y-4 lg:block lg:pt-14">
          <GenderFilterBar />

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-dim">
              Match me on
            </h2>
            {interestTags}
            <p className="mt-3 text-[11.5px] leading-relaxed text-slate">
              Interest tags are free for everyone. They cut the dead &ldquo;hi,
              asl?&rdquo; calls.
            </p>
          </section>

          {autoConnectRow}
        </aside>
      </div>
    </Screen>
  );
}

export default function TalkPage() {
  return (
    <TabsChrome>
      <TalkScreen />
    </TabsChrome>
  );
}
