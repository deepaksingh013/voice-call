import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Small caps section label used across filters, drawer and profile. */
export function SectionLabel({
  children,
  badge,
  className,
}: {
  children: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center gap-2", className)}>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
        {children}
      </h2>
      {badge}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "mint" | "gold";
}) {
  const tones = {
    neutral: "border-line bg-surface text-slate",
    mint: "border-mint/40 bg-mint-tint text-mint",
    gold: "border-gold/40 bg-gold/10 text-gold",
  };
  return (
    <span
      className={cn(
        "rounded-pill border px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.1em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
