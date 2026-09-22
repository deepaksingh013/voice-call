"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Toggle } from "./Toggle";

/** Label + description + trailing control. Shared by the settings screens. */
export function SettingsRow({
  title,
  body,
  trailing,
  tone = "default",
  onClick,
}: {
  title: string;
  body?: string;
  trailing?: ReactNode;
  tone?: "default" | "danger";
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left",
        onClick && "tap hover:border-slate/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13.5px] font-semibold",
            tone === "danger" ? "text-coral" : "text-chalk",
          )}
        >
          {title}
        </p>
        {body && (
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate">{body}</p>
        )}
      </div>
      {trailing}
    </Tag>
  );
}

export function SettingsToggleRow({
  title,
  body,
  checked,
  onChange,
}: {
  title: string;
  body?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <SettingsRow
      title={title}
      body={body}
      trailing={<Toggle checked={checked} onChange={onChange} label={title} />}
    />
  );
}
