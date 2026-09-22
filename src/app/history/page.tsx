"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Flag, Info, UserPlus } from "lucide-react";
import { Screen, listItem, listStagger } from "@/components/shell/Screen";
import { TabsChrome } from "@/components/shell/TabsChrome";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { useApp } from "@/lib/store";
import { apiAddFriend, apiHistory, type HistoryRow } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * SCREEN 15 — Call history.
 *
 * Recent calls with duration and a per-row action. Late reporting matters —
 * many users only report after they have hung up and calmed down — so the
 * server keeps the report window open for 24 hours and tells us per row.
 *
 * A guest's history follows their device, which is the honest reason to
 * create an account and what the notice at the bottom says.
 */

const TABS = ["All", "Friends", "Reported"] as const;
const PARAM = { All: "all", Friends: "friends", Reported: "reported" } as const;

function HistoryScreen() {
  const router = useRouter();
  const { isGuest } = useApp();

  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [deviceOnly, setDeviceOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiHistory(PARAM[tab])
      .then((r) => {
        if (!alive) return;
        setRows(r.calls);
        setDeviceOnly(r.deviceOnly);
      })
      .catch(() => alive && setRows([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tab]);

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
                {call.country} · {new Date(call.at).toLocaleString()}
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
                {(call.canAddFriend || isGuest) && (
                  <button
                    type="button"
                    disabled={added.has(call.deviceId)}
                    onClick={async () => {
                      if (isGuest) return router.push("/signup");
                      await apiAddFriend(call.deviceId).catch(() => undefined);
                      setAdded((s) => new Set(s).add(call.deviceId));
                    }}
                    aria-label={`Add ${call.name} as a friend`}
                    className="tap grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-mint hover:border-mint/40 disabled:opacity-40"
                  >
                    <UserPlus size={14} strokeWidth={2.2} />
                  </button>
                )}
                {call.canReport && (
                  <button
                    type="button"
                    aria-label={`Report ${call.name}`}
                    className="tap grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-slate hover:border-coral/40 hover:text-coral"
                  >
                    <Flag size={14} strokeWidth={2.2} />
                  </button>
                )}
              </div>
            )}
          </motion.li>
        ))}

        {!loading && rows.length === 0 && (
          <li className="py-16 text-center text-[13px] text-slate">
            {tab === "All" ? "No calls yet." : "Nothing here."}
          </li>
        )}
        {loading && (
          <li className="py-16 text-center text-[13px] text-slate">Loading…</li>
        )}
      </motion.ul>

      <div className="shrink-0 space-y-3 pt-3">
        <p className="text-[11px] leading-relaxed text-dim">
          Two-word names are guests. A real first name means a verified account.
        </p>

        {deviceOnly && (
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
