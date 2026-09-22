"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Toggle } from "@/components/ui/Toggle";
import { PEER, REPORT_REASONS } from "@/lib/data";
import { clock, cn } from "@/lib/cn";

/**
 * SCREEN 14 — Report a call.
 *
 * A bottom sheet over the live call, reachable in one tap. Five specific
 * reasons — a generic "inappropriate" bucket is useless to whoever reviews
 * these. "Seems to be under 18" is its own reason and should route to a
 * separate, faster moderation queue.
 *
 * Reporting and ending are one action. Never make a user stay on a call to
 * finish reporting.
 */
export function ReportSheet({
  open,
  seconds,
  onClose,
  onSubmit,
}: {
  open: boolean;
  seconds: number;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [attachAudio, setAttachAudio] = useState(true);

  return (
    <Sheet open={open} onClose={onClose} label="Report this call">
      <div className="scroll-area max-h-[78vh] px-5 pb-6 pt-4">
        <div className="mb-4 flex items-center gap-3">
          <Avatar name={PEER.initial} size="md" />
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-chalk">{PEER.name}</p>
            <p className="text-[12px] tabular-nums text-slate">{clock(seconds)}</p>
          </div>
        </div>

        <h2 className="text-[19px] font-bold tracking-tight text-chalk">
          Report this call
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate">
          The call ends immediately and you will never be matched with them again.
        </p>

        <div className="mt-4 space-y-2">
          {REPORT_REASONS.map(({ id, label }) => {
            const active = reason === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setReason(id)}
                aria-pressed={active}
                className={cn(
                  "tap flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[13.5px] font-medium",
                  active
                    ? "border-coral/60 bg-danger-tint text-chalk"
                    : "border-line bg-surface text-ash hover:border-slate/40",
                )}
              >
                <span
                  className={cn(
                    "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border",
                    active ? "border-coral bg-coral text-ink" : "border-dim",
                  )}
                >
                  {active && <Check size={11} strokeWidth={3.4} />}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {/* On by default, with retention stated on the screen. */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-chalk">
              Attach last 60 seconds of audio
            </p>
            <p className="text-[11.5px] leading-relaxed text-slate">
              Helps moderators act faster. Deleted after 30 days.
            </p>
          </div>
          <Toggle
            checked={attachAudio}
            onChange={setAttachAudio}
            label="Attach last 60 seconds of audio"
          />
        </div>

        <motion.div layout className="mt-5 space-y-2.5">
          <Button variant="danger" disabled={!reason} onClick={onSubmit}>
            Report &amp; end call
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </motion.div>
      </div>
    </Sheet>
  );
}
