"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Header for screens that are pushed on top of the tab stack. */
export function PageHeader({
  title,
  badge,
  action,
  dismiss = "back",
  fallbackHref = "/talk",
  className,
}: {
  title?: string;
  badge?: ReactNode;
  action?: ReactNode;
  dismiss?: "back" | "close" | "none";
  fallbackHref?: string;
  className?: string;
}) {
  const router = useRouter();

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  };

  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-2 border-b border-line/70 px-4 py-3 sm:px-6 lg:px-8 lg:py-4",
        className,
      )}
    >
      {dismiss !== "none" && (
        <button
          type="button"
          onClick={goBack}
          aria-label={dismiss === "close" ? "Close" : "Back"}
          className={cn(
            "tap grid h-9 w-9 place-items-center rounded-xl text-ash hover:bg-surface hover:text-chalk",
            dismiss === "back" && "-ml-2",
          )}
        >
          {dismiss === "close" ? <X size={19} /> : <ChevronLeft size={21} />}
        </button>
      )}

      {title && (
        <h1 className="text-[17px] font-bold tracking-tight text-chalk lg:text-[19px]">
          {title}
        </h1>
      )}
      {badge}

      {action && <div className="ml-auto">{action}</div>}
    </header>
  );
}
