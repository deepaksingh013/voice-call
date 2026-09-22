"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert, AudioLines, BellRing, MicOff } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { Screen } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { GenderFilterBar } from "@/components/call/GenderFilterBar";
import { SAFETY_TIPS } from "@/lib/data";
import { useApp, toServerGender } from "@/lib/store";
import { useCall } from "@/lib/call";

/**
 * SCREEN 03 — Searching for a match.
 *
 * A short wait that must never feel broken or empty. When the queue really
 * is empty the server says so after twenty seconds, and this stops spinning
 * and offers something useful instead — a user who watches an empty spinner
 * twice does not come back.
 */
export default function SearchingPage() {
  const router = useRouter();
  const { filterSummary, filters, isPro } = useApp();
  const { status, estimateSec, micDenied, error, search, cancel } = useCall();

  const [tip, setTip] = useState(0);

  // Rotate the safety tip — this is the only moment the user is idle and
  // reading.
  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % SAFETY_TIPS.length), 3600);
    return () => clearInterval(id);
  }, []);

  // Join the queue on arrival, unless we are already in it or on a call.
  useEffect(() => {
    if (status === "idle") {
      void search({ wantsGender: isPro ? toServerGender(filters.gender) : null });
    }
    // Intentionally only on mount: re-running on every status change would
    // re-queue the user the moment a call ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "connected") router.replace("/call");
  }, [status, router]);

  const queueEmpty = status === "queue-empty";

  return (
    <>
      <TopBar />
      <Screen width="base" className="pb-4 pt-6 lg:pb-10 lg:pt-10">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative grid h-[200px] w-[200px] place-items-center">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                aria-hidden
                style={{ animationDelay: `${i * 0.85}s` }}
                className="absolute h-[168px] w-[168px] animate-ring rounded-full border border-mint/45"
              />
            ))}
            <motion.span
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="relative grid h-[96px] w-[96px] place-items-center rounded-full bg-mint-tint text-mint"
            >
              <AudioLines size={34} strokeWidth={2} />
            </motion.span>
          </div>

          <h1
            aria-live="polite"
            className="mt-7 text-[23px] font-bold tracking-tight text-chalk sm:text-[27px]"
          >
            {micDenied
              ? "Microphone needed"
              : queueEmpty
                ? "It is quiet right now"
                : "Finding someone…"}
          </h1>

          {/* Reminds the user what they asked for before they blame the app. */}
          <p className="mt-2 text-[12.5px] text-slate">{filterSummary}</p>

          {micDenied ? (
            <div className="mt-5 w-full space-y-2.5">
              <div className="flex items-start gap-2.5 rounded-2xl border border-coral/30 bg-danger-tint px-4 py-3 text-left">
                <MicOff size={15} className="mt-0.5 shrink-0 text-coral" />
                <p className="text-[12px] leading-relaxed text-ash">
                  This is a voice app, so it needs your microphone. Allow it in your
                  browser and try again.
                </p>
              </div>
              <Button onClick={() => void search()}>Try again</Button>
            </div>
          ) : !queueEmpty ? (
            <span className="mt-4 rounded-pill border border-line bg-surface px-3 py-1.5 text-[11.5px] font-medium text-ash">
              avg wait {estimateSec}s
            </span>
          ) : (
            <div className="mt-5 w-full space-y-2.5">
              <Button variant="secondary">
                <BellRing size={15} strokeWidth={2.2} />
                Notify me when someone is online
              </Button>
              <p className="text-[11.5px] text-slate">
                Busiest hours are 9 PM to 1 AM.
              </p>
            </div>
          )}

          {error && !micDenied && (
            <p className="mt-4 text-[12px] text-coral">{error}</p>
          )}
        </div>

        <div className="shrink-0 space-y-3">
          <GenderFilterBar variant="inline" />

          <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3">
            <ShieldAlert
              size={15}
              className="mt-0.5 shrink-0 text-gold"
              strokeWidth={2.2}
            />
            <AnimatePresence mode="wait">
              <motion.p
                key={tip}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-[12px] leading-relaxed text-ash"
              >
                {SAFETY_TIPS[tip]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Cancel is full width and always reachable. */}
          <Button
            variant="secondary"
            onClick={() => {
              cancel();
              router.push("/talk");
            }}
          >
            Cancel
          </Button>
        </div>
      </Screen>
    </>
  );
}
