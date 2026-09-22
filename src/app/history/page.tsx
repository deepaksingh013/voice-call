"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Flag, Info, UserPlus } from "lucide-react";
import { Screen, listItem, listStagger } from "@/components/shell/Screen";
import { TabsChrome } from "@/components/shell/TabsChrome";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { CALL_HISTORY } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";

/**
 * SCREEN 15 — Call history.
 *
 * Recent calls with duration and a per-row action: add friend for good calls,
 * report for ones that ended badly. Late reporting matters — many users only
 * report after they have hung up and calmed down, so the report action stays
 * open for at least 24 hours.
 *
 * Guest history lives on the device. On signup it should migrate to the
 * account rather than be discarded.
 */

const TABS = ["All", "Friends", "Reported"] as const;

function HistoryScreen() {
  const router = useRouter();
  const { isGuest } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");

  const rows = CALL_HISTORY.filter((c) =>
    tab === "Friends" ? c.friend : tab === "Reported" ? c.reported : true,
  );

  return (
    <Screen width="wide" className="pb-4 pt-4 lg:pt-7">
      <h1 className="shrink-0 text-[22px] font-bold tracking-tight text-chalk">
        Call history
      </h1>

      <div className="mt-3 flex shrink-0 gap-2">
        {TABS.map((t) => (
          <Pill key={t} active={tab === t} onClick={() => setTab(t)}>
            {t}
          </Pill>
        ))}
      </div>

      <motion.ul
        key={tab}
        variants={listStagger}
        initial="hidden"
        animate="show"
        className="mt-4 flex-1 space-y-1"
      >
        {rows.map((call) => (
          <motion.li
            key={call.id}
            variants={listItem}
            className="flex items-center gap-3 rounded-xl px-1 py-2.5 hover:bg-surface/60 sm:gap-4 sm:px-2 sm:py-3"
          >
            <Avatar name={call.name} size="md" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-chalk">
                {call.name}
              </p>
              {/* Country on every row — the fastest way to recognise a call
                  you want to report or add. */}
              <p className="truncate text-[11.5px] text-slate">
                {call.country} · {call.when}
              </p>
            </div>

            <span className="shrink-0 text-[12.5px] tabular-nums text-ash">
              {call.duration}
            </span>

            {call.reported ? (
              <span className="shrink-0 rounded-lg bg-danger-tint px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide text-coral">
                Reported
              </span>
            ) : call.friend ? (
              <button
                type="button"
                onClick={() => router.push("/friends")}
                className="tap shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11.5px] font-semibold text-slate"
              >
                Friend
              </button>
            ) : (
              <div className="flex shrink-0 gap-1">
                {/* Another signup door. */}
                <button
                  type="button"
                  onClick={() => router.push(isGuest ? "/signup" : "/friends")}
                  aria-label={`Add ${call.name} as a friend`}
                  className="tap grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-mint hover:border-mint/40"
                >
                  <UserPlus size={14} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  aria-label={`Report ${call.name}`}
                  className="tap grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-slate hover:border-coral/40 hover:text-coral"
                >
                  <Flag size={14} strokeWidth={2.2} />
                </button>
              </div>
            )}
          </motion.li>
        ))}

        {rows.length === 0 && (
          <li className="py-16 text-center text-[13px] text-slate">
            Nothing here yet.
          </li>
        )}
      </motion.ul>

      <div className="shrink-0 space-y-3 pt-3">
        <p className="text-[11px] leading-relaxed text-dim">
          Two-word names are guests. A real first name means a verified account.
        </p>

        {/* The honest reason a guest should create an account. */}
        {isGuest && (
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className={cn(
              "tap flex w-full items-start gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-left",
              "hover:border-mint/40",
            )}
          >
            <Info
              size={15}
              className="mt-0.5 shrink-0 text-mint"
              strokeWidth={2.2}
            />
            <p className="text-[12px] leading-relaxed text-ash">
              Guest history stays on this device only.{" "}
              <span className="font-semibold text-mint">Sign up</span> to keep it if
              you change phones.
            </p>
          </button>
        )}
      </div>
    </Screen>
  );
}

export default function HistoryPage() {
  return (
    <TabsChrome>
      <HistoryScreen />
    </TabsChrome>
  );
}
