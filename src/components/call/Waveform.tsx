"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/** Relative heights of the 15 bars, mirrored around the centre. */
const BARS = [
  0.35, 0.6, 0.45, 0.85, 0.55, 1, 0.7, 0.9, 0.6, 1, 0.5, 0.8, 0.42, 0.62, 0.3,
];

/**
 * Live voice indicator. It is decorative — there is no audio in this
 * prototype — so it is hidden from assistive tech, and it flattens while
 * muted so the mute state is legible without reading the button.
 */
export function Waveform({
  muted,
  className,
}: {
  muted?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("flex h-11 items-center justify-center gap-[3px]", className)}
    >
      {BARS.map((peak, i) => (
        <motion.span
          key={i}
          className={cn("w-[3.5px] rounded-pill", muted ? "bg-dim" : "bg-mint")}
          animate={
            muted
              ? { height: 4 }
              : { height: [6, 6 + peak * 34, 10 + peak * 12, 6] }
          }
          transition={
            muted
              ? { duration: 0.25 }
              : {
                  duration: 1.1 + (i % 4) * 0.22,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05,
                }
          }
        />
      ))}
    </div>
  );
}
