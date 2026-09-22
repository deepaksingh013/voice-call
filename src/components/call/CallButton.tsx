"use client";

import { motion } from "framer-motion";
import { Phone } from "lucide-react";

/**
 * The single dominant action the home screen is built around.
 *
 * Three things do the work of telling a first-time user this is the thing to
 * press, because a flat green circle on its own does not:
 *
 * 1. The icon and the word sit together as one tight stack. Splitting them to
 *    opposite edges of the circle reads as decoration, not a button.
 * 2. The verb is on the button — "Start call", not the noun "CALL".
 * 3. A hint line underneath says what pressing it does, worded for the
 *    pointer the visitor actually has.
 *
 * The rings keep pulling outward so the target reads as live and waiting
 * rather than as a static graphic.
 */
export function CallButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative grid h-[236px] w-[236px] place-items-center sm:h-[272px] sm:w-[272px]">
        {/* Expanding rings — decorative, and the reason the target reads live. */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            style={{ animationDelay: `${i * 0.9}s` }}
            className="absolute h-[190px] w-[190px] animate-ring rounded-full border border-mint/45 sm:h-[220px] sm:w-[220px]"
          />
        ))}

        {/* A soft halo under the button, so it sits on the page rather than
            being pasted onto it. */}
        <span
          aria-hidden
          className="absolute h-[200px] w-[200px] rounded-full bg-mint/15 blur-2xl sm:h-[232px] sm:w-[232px]"
        />

        <motion.button
          type="button"
          onClick={onClick}
          aria-label="Start a call with a stranger"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.035 }}
          transition={{ type: "spring", damping: 18, stiffness: 400 }}
          className="
            group relative flex h-[172px] w-[172px] flex-col items-center
            justify-center gap-2 rounded-full
            bg-[radial-gradient(120%_120%_at_50%_0%,#5ef0b0_0%,var(--color-mint)_45%,var(--color-mint-deep)_100%)]
            text-ink ring-1 ring-inset ring-white/25
            shadow-[0_20px_60px_-16px_rgba(60,219,151,0.85)]
            transition-shadow duration-200
            hover:shadow-[0_26px_70px_-14px_rgba(60,219,151,1)]
            focus-visible:outline-none focus-visible:ring-4
            focus-visible:ring-mint/50 focus-visible:ring-offset-4
            focus-visible:ring-offset-ink
            sm:h-[196px] sm:w-[196px]
          "
        >
          <Phone
            size={36}
            strokeWidth={2.2}
            className="transition-transform duration-200 group-hover:-rotate-12 sm:h-[42px] sm:w-[42px]"
          />
          <span className="text-[14px] font-extrabold tracking-[0.06em] sm:text-[16px]">
            Start call
          </span>
        </motion.button>
      </div>

      {/* Says what happens, in the words of whichever pointer they are on. */}
      <p className="mt-4 text-center text-[12.5px] leading-relaxed text-slate sm:text-[13.5px]">
        <span className="lg:hidden">Tap</span>
        <span className="hidden lg:inline">Click</span> to talk to a stranger
        <span className="mx-1.5 text-dim">·</span>
        <span className="text-ash">usually under 5s</span>
      </p>
    </div>
  );
}
