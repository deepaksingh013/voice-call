"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useApp } from "@/lib/store";
import { apiDeleteAccount } from "@/lib/api";

/**
 * Delete my data.
 *
 * Not decoration — under India's DPDP Act and the IT Rules this has to be a
 * working path, reachable from the side menu, with a named contact on Help.
 */

const REMOVED = [
  "Your account, email and sign-in",
  "Call history and durations",
  "Friends list and every saved message",
  "Filter preferences and interest tags",
];

const KEPT = [
  "Reports made against you, and their outcomes, for as long as safety records require",
  "Payment records, where tax law requires us to keep them",
];

export default function DeleteDataPage() {
  const router = useRouter();
  const { refresh } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <>
      <PageHeader title="Delete my data" />

      <Screen width="base" className="pb-5 pt-4 lg:pt-7">
        <div className="flex items-start gap-2.5 rounded-2xl border border-coral/30 bg-danger-tint px-4 py-3">
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0 text-coral"
            strokeWidth={2.2}
          />
          <p className="text-[12px] leading-relaxed text-ash">
            This cannot be undone. Deletion completes within 30 days and you are
            signed out of every device immediately.
          </p>
        </div>

        <section className="mt-6">
          <h2 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate">
            What gets deleted
          </h2>
          <ul className="space-y-1.5">
            {REMOVED.map((r) => (
              <li
                key={r}
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-[12.5px] text-ash"
              >
                {r}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5">
          <h2 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate">
            What we have to keep
          </h2>
          <ul className="space-y-1.5">
            {KEPT.map((r) => (
              <li
                key={r}
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-[12px] leading-relaxed text-slate"
              >
                {r}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-auto space-y-2.5 pt-8">
          <Button variant="outline" onClick={() => setConfirming(true)}>
            Delete my data
          </Button>
          <Button variant="ghost" onClick={() => router.back()}>
            Keep my account
          </Button>
        </div>
      </Screen>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        label="Delete everything?"
      >
        <h2 className="text-[19px] font-bold tracking-tight text-chalk">
          Delete everything?
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ash">
          Type <span className="font-semibold text-coral">DELETE</span> to confirm.
          Your friends, history and messages go with it.
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-label="Type DELETE to confirm"
          placeholder="DELETE"
          className="mt-3 h-12 w-full rounded-xl border border-line bg-ink px-4 text-center text-[15px] font-semibold tracking-[0.1em] text-chalk placeholder:text-dim focus:border-coral/60 focus:outline-none"
        />
        <div className="mt-4 space-y-2.5">
          <Button
            variant="danger"
            disabled={typed.trim().toUpperCase() !== "DELETE"}
            onClick={async () => {
              await apiDeleteAccount().catch(() => undefined);
              await refresh();
              setConfirming(false);
              router.push("/");
            }}
          >
            Delete permanently
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  );
}
