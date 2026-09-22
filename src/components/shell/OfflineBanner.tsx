"use client";

import { AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/store";
import { API_URL } from "@/lib/api";

/**
 * Shown when the API cannot be reached.
 *
 * Without this the app renders perfectly and every button does nothing,
 * which looks like a broken build rather than a missing backend. Naming the
 * URL it tried is the difference between "nothing works" and a fix that
 * takes thirty seconds.
 */
export function OfflineBanner() {
  const { offline, ready } = useApp();
  if (!ready || !offline) return null;

  const isLocalhost = API_URL.includes("localhost");

  return (
    <div
      role="alert"
      className="shrink-0 border-b border-coral/30 bg-danger-tint px-4 py-2.5 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-[1180px] items-start gap-2.5">
        <AlertTriangle
          size={15}
          className="mt-0.5 shrink-0 text-coral"
          strokeWidth={2.3}
        />
        <p className="text-[11.5px] leading-relaxed text-ash">
          <span className="font-semibold text-coral">Cannot reach the server.</span>{" "}
          Calls, signup and history will not work.{" "}
          <span className="text-slate">
            Tried <code className="text-ash">{API_URL}</code>
            {isLocalhost &&
              " — this build has no NEXT_PUBLIC_API_URL set, so it is pointing at your own machine."}
          </span>
        </p>
      </div>
    </div>
  );
}
