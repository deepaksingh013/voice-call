"use client";

import { Menu } from "lucide-react";
import { APP_NAME } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";
import { useDrawer } from "./Drawer";

/**
 * The app header.
 *
 * Phones and tablets only. It carries the wordmark, the tier chip, the online
 * counter and the drawer trigger. From `lg` the sidebar shows all of that in
 * the open, so this bar disappears rather than repeating it.
 */
export function TopBar({ className }: { className?: string }) {
  const { tier, onlineCount } = useApp();
  const { open } = useDrawer();

  const tierLabel = tier === "guest" ? "GUEST" : tier === "pro" ? "PRO" : "FREE";

  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-1.5 border-b border-line/70 px-3.5 py-3 sm:px-6 lg:hidden",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span aria-hidden className="flex h-4 shrink-0 items-end gap-[2px]">
          {[6, 12, 16, 10, 5].map((h, i) => (
            <span
              key={i}
              style={{ height: h, animationDelay: `${i * 110}ms` }}
              className="w-[2px] animate-pulse rounded-pill bg-mint"
            />
          ))}
        </span>
        <span className="truncate text-[13px] font-bold tracking-tight text-chalk sm:text-[15px]">
          {APP_NAME}
        </span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <span
          className={cn(
            "rounded-pill border px-2 py-[3px] text-[9.5px] font-bold tracking-[0.08em] sm:text-[10.5px]",
            tier === "pro"
              ? "border-gold/40 bg-gold/10 text-gold"
              : "border-line bg-surface-hi text-slate",
          )}
        >
          {tierLabel}
        </span>

        <span className="flex items-center gap-1 rounded-pill border border-mint/25 bg-mint-tint px-2 py-[3.5px] text-[10.5px] font-semibold tabular-nums text-mint sm:text-[11.5px]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
          </span>
          {onlineCount} online
        </span>

        <button
          type="button"
          onClick={open}
          aria-label="Open menu"
          className="tap -mr-1.5 grid h-8 w-8 place-items-center rounded-lg text-ash hover:bg-surface hover:text-chalk"
        >
          <Menu size={19} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
