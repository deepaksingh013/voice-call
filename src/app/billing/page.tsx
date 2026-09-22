"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Section";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { useApp } from "@/lib/store";
import { apiCancelSubscription } from "@/lib/api";

/**
 * Payments and billing.
 *
 * Cancellation is two taps from the profile and never requires contacting
 * support — unclear renewal terms and buried cancel flows are what get a
 * merchant account frozen in this category.
 */

const INVOICES = [
  { id: "i1", date: "12 Sep 2026", amount: "[₹]", status: "Paid" },
  { id: "i2", date: "12 Aug 2026", amount: "[₹]", status: "Paid" },
  { id: "i3", date: "12 Jul 2026", amount: "[₹]", status: "Paid" },
];

export default function BillingPage() {
  const router = useRouter();
  const { isPro, refresh } = useApp();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <PageHeader title="Payments & billing" />

      <Screen width="wide" className="pb-5 pt-4 lg:pt-7">
        {isPro ? (
          <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-4">
            <div className="flex items-center gap-2">
              <Badge tone="gold">Pro</Badge>
              <span className="text-[12px] text-slate">Monthly</span>
            </div>
            <p className="mt-2.5 text-[15px] font-bold text-chalk">[₹] per month</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-slate">
              Auto-renews on [DATE]. You keep Pro until the end of the period if you
              cancel.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[15px] font-bold text-chalk">No subscription</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-slate">
              You are on the free tier. Calls, language filter and interest tags are
              all included.
            </p>
            <Button
              size="md"
              className="mt-3"
              onClick={() => router.push("/paywall")}
            >
              See Pro plans
            </Button>
          </div>
        )}

        <div className="mt-5 space-y-2">
          <SettingsRow
            title="Payment method"
            body="Card ending [••••]"
            trailing={<CreditCard size={16} className="text-slate" />}
          />
          <SettingsRow
            title="Restore purchase"
            body="If you subscribed on another device"
            onClick={() => {}}
          />
        </div>

        <h2 className="mb-2 mt-6 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate">
          Invoices
        </h2>
        <ul className="space-y-1">
          {INVOICES.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center gap-3 rounded-xl px-1 py-2.5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-hi text-slate">
                <Receipt size={14} />
              </span>
              <span className="flex-1 text-[13px] text-chalk">{inv.date}</span>
              <span className="text-[12.5px] tabular-nums text-ash">
                {inv.amount}
              </span>
              <span className="rounded-lg bg-mint-tint px-2 py-0.5 text-[10.5px] font-bold uppercase text-mint">
                {inv.status}
              </span>
            </li>
          ))}
        </ul>

        {isPro && (
          <div className="mt-auto pt-8">
            <Button variant="outline" onClick={() => setConfirming(true)}>
              Cancel subscription
            </Button>
          </div>
        )}
      </Screen>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        label="Cancel subscription?"
      >
        <h2 className="text-[19px] font-bold tracking-tight text-chalk">
          Cancel subscription?
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ash">
          You keep Pro until [DATE]. After that the gender, country and region
          filters switch off and your language filter stays free.
        </p>
        <div className="mt-5 space-y-2.5">
          <Button
            variant="danger"
            onClick={async () => {
              await apiCancelSubscription().catch(() => undefined);
              await refresh();
              setConfirming(false);
              router.push("/profile");
            }}
          >
            Yes, cancel
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Keep Pro
          </Button>
        </div>
      </Dialog>
    </>
  );
}
