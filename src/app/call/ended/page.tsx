"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, Flag, UserPlus, ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { Screen } from "@/components/shell/Screen";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { GenderFilterBar } from "@/components/call/GenderFilterBar";
import { useApp } from "@/lib/store";
import { useCall } from "@/lib/call";
import { apiAddFriend } from "@/lib/api";
import { clock, cn } from "@/lib/cn";

/**
 * SCREEN 07 — Call ended.
 *
 * The highest-intent moment in the whole app. It collects a one-tap rating
 * that feeds the matching quality score, then offers the next call.
 *
 * The friend prompt appears here rather than during the call, because a user
 * decides they liked someone after the call, not during it. This is the
 * better of the two signup doors — the user has a specific person in mind.
 */

type Rating = "up" | "down" | "flag";

function CallEnded() {
  const router = useRouter();
  const params = useSearchParams();
  const { isGuest } = useApp();
  const { peer, lastCallSeconds, endedByPeer, rate, reset, search } = useCall();

  const [rating, setRating] = useState<Rating | null>(null);
  const [added, setAdded] = useState(false);

  const reported = params.get("reported") === "1";
  const name = peer?.name ?? "them";

  const choose = (r: Rating) => {
    setRating(r);
    // Down-votes quietly de-prioritise that pairing.
    rate(r === "up" ? 1 : r === "down" ? -1 : 0);
  };

  return (
    <Screen width="base" className="pb-4 pt-6 lg:pb-10 lg:pt-10">
      <div className="flex flex-1 flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 19, stiffness: 280 }}
        >
          <Avatar name={name} size="xl" className="opacity-60" />
        </motion.div>

        <h1 className="mt-4 text-[22px] font-bold tracking-tight text-chalk sm:text-[26px]">
          Call ended
        </h1>
        <p className="mt-1 text-[13px] text-slate">
          {name} · {clock(lastCallSeconds)}
          {endedByPeer && !reported && " · they hung up"}
        </p>

        {reported ? (
          <div className="mt-5 flex w-full items-start gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-left">
            <ShieldCheck
              size={16}
              className="mt-0.5 shrink-0 text-mint"
              strokeWidth={2.2}
            />
            <p className="text-[12px] leading-relaxed text-ash">
              Report sent. You will never be matched with {name} again, and a
              moderator will review it.
            </p>
          </div>
        ) : (
          <>
            {/* Three taps, no text field. */}
            <section className="mt-7 w-full">
              <h2 className="text-[12.5px] font-semibold text-ash">How was it?</h2>
              <div className="mt-3 flex justify-center gap-3">
                <RateButton
                  active={rating === "up"}
                  tone="mint"
                  label="Good call"
                  onClick={() => choose("up")}
                >
                  <ThumbsUp size={19} strokeWidth={2.1} />
                </RateButton>
                <RateButton
                  active={rating === "down"}
                  tone="neutral"
                  label="Bad call"
                  onClick={() => choose("down")}
                >
                  <ThumbsDown size={19} strokeWidth={2.1} />
                </RateButton>
                <RateButton
                  active={rating === "flag"}
                  tone="coral"
                  label="Report this call"
                  onClick={() => choose("flag")}
                >
                  <Flag size={19} strokeWidth={2.1} />
                </RateButton>
              </div>
            </section>

            {/* The friend door. */}
            {peer && (peer.verified || isGuest) && (
              <motion.section
                layout
                className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint-tint text-mint">
                  <UserPlus size={16} strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-chalk">
                    Add {name} as a friend
                  </p>
                  {isGuest && (
                    <p className="text-[11.5px] text-slate">Needs a free account</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={added}
                  onClick={async () => {
                    if (isGuest) return router.push("/signup");
                    await apiAddFriend(peer.deviceId).catch(() => undefined);
                    setAdded(true);
                  }}
                  className="tap shrink-0 rounded-lg bg-mint px-3.5 py-1.5 text-[12px] font-bold text-ink disabled:opacity-50"
                >
                  {added ? "Sent" : isGuest ? "Sign up" : "Add"}
                </button>
              </motion.section>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 space-y-2.5">
        <GenderFilterBar />

        {/* Primary, so the loop continues without a trip back to home. */}
        <Button
          onClick={() => {
            reset();
            void search();
            router.push("/searching");
          }}
        >
          Next call
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            reset();
            router.push("/talk");
          }}
        >
          Back to home
        </Button>
      </div>
    </Screen>
  );
}

const RATE_TONES = {
  mint: "border-mint/60 bg-mint-tint text-mint",
  neutral: "border-slate/50 bg-surface-hi text-chalk",
  coral: "border-coral/60 bg-danger-tint text-coral",
};

function RateButton({
  active,
  tone,
  label,
  onClick,
  children,
}: {
  active: boolean;
  tone: keyof typeof RATE_TONES;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className={cn(
        "grid h-[54px] w-[54px] place-items-center rounded-2xl border transition-colors",
        active
          ? RATE_TONES[tone]
          : "border-line bg-surface text-slate hover:text-ash",
      )}
    >
      {children}
    </motion.button>
  );
}

export default function CallEndedPage() {
  return (
    <>
      <TopBar />
      <Suspense fallback={<div className="flex-1" />}>
        <CallEnded />
      </Suspense>
    </>
  );
}
