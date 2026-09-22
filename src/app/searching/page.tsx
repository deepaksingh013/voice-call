"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert, AudioLines, BellRing } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { Screen } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { SAFETY_TIPS } from "@/lib/data";
import { useApp } from "@/lib/store";

/**
 * SCREEN 03 — Searching for a match.
 *
 * A two to six second wait that must never feel broken or empty. After about
 * twenty seconds it stops spinning and offers a notify option instead — a
 * user who watches an empty spinner twice does not come back.
 */

const MATCH_MS = 4200;
const EMPTY_QUEUE_MS = 20000;

export default function SearchingPage() {
  const router = useRouter();
  const { filterSummary } = useApp();
  const [tip, setTip] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Rotate the safety tip — this is the only moment the user is idle and reading.
  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % SAFETY_TIPS.length), 3600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 500), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => router.push("/call"), MATCH_MS);
    return () => clearTimeout(id);
  }, [router]);

  const queueEmpty = elapsed >= EMPTY_QUEUE_MS;

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
            {queueEmpty ? "It is quiet right now" : "Finding someone…"}
          </h1>

          {/* Reminds the user what they asked for before they blame the app. */}
          <p className="mt-2 text-[12.5px] text-slate">{filterSummary}</p>

          {!queueEmpty ? (
            <span className="mt-4 rounded-pill border border-line bg-surface px-3 py-1.5 text-[11.5px] font-medium text-ash">
              avg wait 4s
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
        </div>

        <div className="shrink-0 space-y-3">
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
          <Button variant="secondary" onClick={() => router.push("/talk")}>
            Cancel
          </Button>
        </div>
      </Screen>
    </>
  );
}
