"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Gamepad2, Dices, Brain, MessagesSquare } from "lucide-react";
import { Screen, listItem, listStagger } from "@/components/shell/Screen";
import { TabsChrome } from "@/components/shell/TabsChrome";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Section";

/**
 * Games tab.
 *
 * The build order in the spec is explicit: do not build Games until the call
 * loop retains users. So the tab exists and states what is coming, rather
 * than shipping three half-built games that dilute the call button.
 */

const PLANNED = [
  {
    Icon: MessagesSquare,
    title: "Two truths and a lie",
    body: "A prompt on both screens, guess while you talk.",
  },
  {
    Icon: Brain,
    title: "Would you rather",
    body: "Rotating questions when a call goes quiet.",
  },
  {
    Icon: Dices,
    title: "Quick trivia",
    body: "Ten questions, both of you answering out loud.",
  },
];

function GamesScreen() {
  const router = useRouter();

  return (
    <Screen width="wide" className="pb-4 pt-4 lg:pt-7">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="text-[22px] font-bold tracking-tight text-chalk">Games</h1>
        <Badge>Soon</Badge>
      </div>
      <p className="mt-1.5 shrink-0 text-[12.5px] leading-relaxed text-slate">
        Something to do when a call goes quiet. Nothing here is live yet.
      </p>

      <motion.ul
        variants={listStagger}
        initial="hidden"
        animate="show"
        className="mt-6 flex-1 space-y-2.5 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0 lg:grid-cols-3"
      >
        {PLANNED.map(({ Icon, title, body }) => (
          <motion.li
            key={title}
            variants={listItem}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 opacity-70 sm:flex-col sm:items-start sm:gap-3 sm:p-5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-hi text-slate">
              <Icon size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-chalk">{title}</p>
              <p className="text-[11.5px] leading-relaxed text-slate">{body}</p>
            </div>
          </motion.li>
        ))}
      </motion.ul>

      <div className="shrink-0 space-y-3 pt-4">
        <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3">
          <Gamepad2 size={16} className="shrink-0 text-slate" strokeWidth={2} />
          <p className="text-[11.5px] leading-relaxed text-slate">
            Games ship after the call loop proves it retains people. The call is the
            product.
          </p>
        </div>
        <Button onClick={() => router.push("/talk")}>Back to calling</Button>
      </div>
    </Screen>
  );
}

export default function GamesPage() {
  return (
    <TabsChrome>
      <GamesScreen />
    </TabsChrome>
  );
}
