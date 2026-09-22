"use client";

import { cn } from "@/lib/cn";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[30px] w-[54px] shrink-0 rounded-pill border transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60",
        checked ? "border-mint bg-mint" : "border-line bg-surface-hi",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-[22px] w-[22px] -translate-y-1/2 rounded-full bg-white shadow-sm",
          "transition-[left] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          checked ? "left-[27px]" : "left-[3px]",
        )}
      />
    </button>
  );
}
