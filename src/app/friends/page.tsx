"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Users } from "lucide-react";
import { Screen, listItem, listStagger } from "@/components/shell/Screen";
import { TabsChrome } from "@/components/shell/TabsChrome";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FRIENDS } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";

/**
 * Friends list — the entry point to screen 16.
 *
 * A thread exists only after both sides accepted, so this list is mutual by
 * construction. Guests get the locked state instead: friends are the whole
 * reason a free account exists.
 */
function FriendsScreen() {
  const router = useRouter();
  const { isGuest } = useApp();

  if (isGuest) {
    return (
      <Screen width="base" center className="pb-6 pt-4 lg:pt-8">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 18, stiffness: 280 }}
            className="relative grid h-16 w-16 place-items-center rounded-3xl bg-surface text-slate"
          >
            <Users size={26} strokeWidth={1.9} />
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-surface-hi text-dim">
              <Lock size={11} strokeWidth={2.6} />
            </span>
          </motion.span>

          <h1 className="mt-5 text-[20px] font-bold tracking-tight text-chalk">
            Friends need a free account
          </h1>
          <p className="mt-2 max-w-[260px] text-[12.5px] leading-relaxed text-slate">
            Add someone after a good call and you can message them or call them
            back. Both people have to agree — nobody can add you one-sidedly.
          </p>
        </div>

        <div className="shrink-0 space-y-2.5">
          <Button onClick={() => router.push("/signup")}>
            Create free account
          </Button>
          <Button variant="ghost" onClick={() => router.push("/talk")}>
            Not now
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen width="wide" className="pb-4 pt-4 lg:pt-8">
      <h1 className="shrink-0 text-[22px] font-bold tracking-tight text-chalk">
        Friends
      </h1>
      <p className="mt-1 shrink-0 text-[12px] text-slate">
        {FRIENDS.filter((f) => f.online).length} online now
      </p>

      <motion.ul
        variants={listStagger}
        initial="hidden"
        animate="show"
        className="mt-4 flex-1 space-y-1 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-0 md:space-y-0 lg:grid-cols-1 xl:grid-cols-2"
      >
        {FRIENDS.map((f) => (
          <motion.li key={f.id} variants={listItem}>
            <Link
              href={`/friends/${f.id}`}
              className="tap flex items-center gap-3 rounded-xl px-1 py-2.5 hover:bg-surface/60"
            >
              <span className="relative shrink-0">
                <Avatar name={f.name} size="md" />
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink",
                    f.online ? "bg-mint" : "bg-dim",
                  )}
                />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-chalk">
                  {f.name}
                </p>
                <p className="truncate text-[11.5px] text-slate">{f.preview}</p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[10.5px] text-dim">{f.at}</p>
                {f.unread ? (
                  <span className="mt-1 inline-grid h-[18px] min-w-[18px] place-items-center rounded-pill bg-mint px-1.5 text-[10.5px] font-bold text-ink">
                    {f.unread}
                  </span>
                ) : null}
              </div>
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </Screen>
  );
}

export default function FriendsPage() {
  return (
    <TabsChrome>
      <FriendsScreen />
    </TabsChrome>
  );
}
