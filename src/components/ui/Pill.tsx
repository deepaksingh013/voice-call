"use client";

import { Lock } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  locked?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * The single pill used for interests, languages, countries, genders and
 * the header filter chips. Locked pills stay readable — the spec sells the
 * feature by showing it, so they are dimmed, never hidden.
 */
export function Pill({
  active,
  locked,
  icon,
  children,
  className,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "tap inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-2 text-[13px] font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60",
        active
          ? "border-mint/60 bg-mint-tint text-mint"
          : "border-line bg-surface text-ash hover:border-slate/50",
        locked && "text-dim",
        className,
      )}
      {...rest}
    >
      {locked ? <Lock size={12} strokeWidth={2.4} /> : icon}
      {children}
    </button>
  );
}
