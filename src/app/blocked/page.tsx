"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen } from "@/components/shell/Screen";
import { Avatar } from "@/components/ui/Avatar";

/**
 * Blocked users.
 *
 * Users must be able to review and undo their own blocks. Unblocking does not
 * undo a report — that record stays with moderation either way.
 */

const INITIAL = [
  {
    id: "b1",
    name: "Loud Heron",
    country: "India",
    when: "Blocked 14 Sep",
    reported: true,
  },
  {
    id: "b2",
    name: "Quiet Marten",
    country: "UK",
    when: "Blocked 3 Sep",
    reported: false,
  },
  {
    id: "b3",
    name: "Idle Crane",
    country: "UAE",
    when: "Blocked 21 Aug",
    reported: true,
  },
];

export default function BlockedPage() {
  const [blocked, setBlocked] = useState(INITIAL);

  return (
    <>
      <PageHeader title="Blocked users" />

      <Screen width="wide" className="pb-5 pt-4 lg:pt-7">
        <p className="mb-4 text-[12px] leading-relaxed text-slate">
          You will never be matched with anyone on this list. Unblocking makes them
          matchable again — it does not withdraw a report.
        </p>

        <ul className="space-y-1">
          <AnimatePresence initial={false}>
            {blocked.map((b) => (
              <motion.li
                key={b.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
                className="flex items-center gap-3 rounded-xl px-1 py-2.5"
              >
                <Avatar name={b.name} size="md" className="opacity-60" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-chalk">
                    {b.name}
                  </p>
                  <p className="truncate text-[11.5px] text-slate">
                    {b.country} · {b.when}
                    {b.reported && " · reported"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBlocked((l) => l.filter((x) => x.id !== b.id))}
                  className="tap shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-ash hover:border-slate/50"
                >
                  Unblock
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {blocked.length === 0 && (
          <p className="py-16 text-center text-[13px] text-slate">
            Nobody is blocked.
          </p>
        )}
      </Screen>
    </>
  );
}
