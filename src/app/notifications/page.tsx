"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen } from "@/components/shell/Screen";
import { SettingsToggleRow } from "@/components/ui/SettingsRow";

/** Notification preferences. */
export default function NotificationsPage() {
  const [prefs, setPrefs] = useState({
    friendOnline: true,
    friendMessage: true,
    queueOpen: false,
    productNews: false,
  });

  const set = (k: keyof typeof prefs) => (v: boolean) =>
    setPrefs((p) => ({ ...p, [k]: v }));

  return (
    <>
      <PageHeader title="Notifications" />

      <Screen width="wide" className="pb-5 pt-4 lg:pt-7">
        <h2 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate">
          Friends
        </h2>
        <div className="space-y-2">
          <SettingsToggleRow
            title="A friend comes online"
            body="Only for people you both added."
            checked={prefs.friendOnline}
            onChange={set("friendOnline")}
          />
          <SettingsToggleRow
            title="New message"
            body="Messages from friends, never from strangers."
            checked={prefs.friendMessage}
            onChange={set("friendMessage")}
          />
        </div>

        <h2 className="mb-2 mt-6 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate">
          Calling
        </h2>
        <div className="space-y-2">
          <SettingsToggleRow
            title="The queue opens up"
            body="When people matching your filters come online."
            checked={prefs.queueOpen}
            onChange={set("queueOpen")}
          />
        </div>

        <h2 className="mb-2 mt-6 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate">
          Other
        </h2>
        <div className="space-y-2">
          <SettingsToggleRow
            title="Product news"
            body="Rare. New features only, never marketing."
            checked={prefs.productNews}
            onChange={set("productNews")}
          />
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-dim">
          We never notify you about a stranger&rsquo;s activity, and we never send a
          notification that names someone you have not added.
        </p>
      </Screen>
    </>
  );
}
