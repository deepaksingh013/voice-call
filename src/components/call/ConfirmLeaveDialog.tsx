"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { PEER } from "@/lib/data";
import { clock } from "@/lib/cn";

export type LeaveAction = "end" | "next";

/**
 * SCREEN 05 — Confirm before leaving a call.
 *
 * End and Next both ask once. Report never does — an "are you sure?" between
 * someone being harassed and the exit is the wrong thing to build.
 *
 * The dialog states the actual cost ("you will not be able to reach Rhea
 * again"), not a generic "are you sure", and shows the call duration so the
 * user knows which call they are about to drop.
 */
export function ConfirmLeaveDialog({
  action,
  seconds,
  onConfirm,
  onCancel,
}: {
  action: LeaveAction | null;
  seconds: number;
  /** `remember` carries the "don't ask me again" choice for this action only. */
  onConfirm: (remember: boolean) => void;
  onCancel: () => void;
}) {
  const [remember, setRemember] = useState(false);
  const isEnd = action === "end";

  return (
    <Dialog
      open={action !== null}
      onClose={onCancel}
      label={isEnd ? "End this call?" : "Skip to a new stranger?"}
    >
      <h2 className="text-[19px] font-bold tracking-tight text-chalk">
        {isEnd ? "End this call?" : "Skip to a new stranger?"}
      </h2>

      <p className="mt-2 text-[13px] leading-relaxed text-ash">
        You have been talking for {clock(seconds)}. You will not be able to reach{" "}
        {PEER.name} again unless you add them as a friend first.
      </p>

      <div className="mt-5 space-y-2.5">
        {/* Destructive action first, safe one below it. */}
        <Button
          variant={isEnd ? "danger" : "primary"}
          onClick={() => onConfirm(remember)}
        >
          {isEnd ? "Yes, end call" : "Yes, skip"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Stay on the call
        </Button>
      </div>

      {/* Essential. A confirmation on every single call becomes noise within a
          day, and the preference is stored per action. */}
      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 text-[12px] text-slate">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 accent-[#3cdb97]"
        />
        Don&rsquo;t ask me again
      </label>
    </Dialog>
  );
}
