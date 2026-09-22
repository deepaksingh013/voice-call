"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-mint text-ink font-semibold hover:bg-mint/90 active:bg-mint-deep shadow-[0_6px_24px_-10px_rgba(60,219,151,0.8)]",
  secondary:
    "bg-surface text-chalk font-semibold border border-line hover:bg-surface-hi",
  ghost: "text-slate font-medium hover:text-ash hover:bg-surface/60",
  danger:
    "bg-danger text-white font-semibold hover:bg-danger/90 shadow-[0_6px_24px_-10px_rgba(226,79,58,0.8)]",
  outline:
    "border border-line text-ash font-medium hover:border-slate/60 hover:text-chalk",
};

const SIZES: Record<Size, string> = {
  md: "h-11 px-4 text-[14px] rounded-xl",
  lg: "h-[52px] px-5 text-[15px] rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "lg", full = true, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "tap inline-flex items-center justify-center gap-2 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        "disabled:opacity-40 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        full && "w-full",
        className,
      )}
      {...rest}
    />
  );
});
