"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Page-level wrapper: owns the scrolling, the responsive gutters and the
 * measure. Every route animates in the same way so movement between screens
 * reads as one app rather than a set of documents.
 *
 * `width` picks the measure for tablet and up. Reading-style screens stay
 * narrow because a 1400px line of body copy is unreadable; list and grid
 * screens go wider.
 */
const WIDTHS = {
  /** Auth, paywall, confirmations — a single tight column. */
  narrow: "max-w-[460px]",
  /** Default: one column of content. */
  base: "max-w-[600px]",
  /** Lists and settings that benefit from room. */
  wide: "max-w-[860px]",
  /** Multi-column dashboards. */
  full: "max-w-[1180px]",
} as const;

export function Screen({
  children,
  className,
  width = "base",
  center,
}: {
  children: ReactNode;
  className?: string;
  width?: keyof typeof WIDTHS;
  /** Vertically centre the content once there is room for it. */
  center?: boolean;
}) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "scroll-area flex min-h-0 flex-1 flex-col",
        center && "lg:justify-center",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col px-5 sm:px-6 lg:px-8",
          WIDTHS[width],
          className,
        )}
      >
        {children}
      </div>
    </motion.main>
  );
}

/** Staggered list entrance, used by filters, history and friends. */
export const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};

export const listItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
  },
};
