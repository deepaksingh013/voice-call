"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mic, Timer, ShieldCheck, Phone, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { listItem, listStagger } from "@/components/shell/Screen";
import { APP_NAME } from "@/lib/data";

/**
 * SCREEN 01 — Welcome, guest entry.
 *
 * The only job of this screen is to get the user into a call in under five
 * seconds. The primary button starts a call immediately; it does not open a
 * signup form.
 *
 * On a phone this is a single column with the buttons under the thumb. From
 * `lg` it becomes a two-column landing — the promises move beside the
 * headline rather than below it — because a 1400px column of stacked cards
 * wastes the width and pushes the call to action off the first screen.
 */

const PROMISES = [
  {
    Icon: Mic,
    title: "Voice only",
    body: "No video, no photos, nothing to upload.",
  },
  {
    Icon: Timer,
    title: "Start in 5 seconds",
    body: "No signup, no OTP, no profile to fill.",
  },
  {
    Icon: ShieldCheck,
    title: "Leave any time",
    body: "One tap to skip or report. Always.",
  },
];

export default function WelcomePage() {
  const router = useRouter();

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="scroll-area flex min-h-0 flex-1 flex-col lg:justify-center"
    >
      <div
        className="
          mx-auto flex w-full max-w-[600px] flex-1 flex-col px-5 pb-5 pt-7
          sm:px-6 sm:pt-10
          lg:max-w-[1040px] lg:flex-none lg:grid lg:grid-cols-2 lg:items-center
          lg:gap-16 lg:px-10 lg:py-12
        "
      >
        {/* Column one — the pitch and the action. */}
        <div className="flex flex-1 flex-col lg:flex-none">
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              damping: 16,
              stiffness: 260,
              delay: 0.05,
            }}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-mint-tint text-mint lg:h-14 lg:w-14"
          >
            <AudioLines size={22} strokeWidth={2.2} />
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-[28px] font-bold leading-[1.15] tracking-tight text-chalk sm:text-[34px] lg:text-[44px]"
          >
            Talk to a stranger.
            <br />
            No account needed.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-3 max-w-[46ch] text-[13px] leading-relaxed text-slate sm:text-[15px]"
          >
            Voice only. Press call, meet someone new, hang up whenever you want.
          </motion.p>

          {/* Promises: inline here on a phone, moved to column two on lg. */}
          <motion.ul
            variants={listStagger}
            initial="hidden"
            animate="show"
            className="mt-7 space-y-3 lg:hidden"
          >
            {PROMISES.map(({ Icon, title, body }) => (
              <motion.li key={title} variants={listItem} className="flex gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-mint">
                  <Icon size={15} strokeWidth={2.2} />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-chalk">{title}</p>
                  <p className="text-[12px] text-slate">{body}</p>
                </div>
              </motion.li>
            ))}
          </motion.ul>

          <div className="mt-auto pt-10 lg:mt-0 lg:pt-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-2.5 lg:flex lg:max-w-[520px] lg:space-y-0 lg:gap-3"
            >
              <Button onClick={() => router.push("/searching")}>
                <Phone size={16} strokeWidth={2.4} />
                Start talking
              </Button>

              <Button
                variant="secondary"
                onClick={() => router.push("/login")}
                className="lg:whitespace-nowrap"
              >
                I already have an account
              </Button>
            </motion.div>

            {/* Small but present. Tapping "Start talking" is the acceptance. */}
            <p className="mt-3 text-center text-[10.5px] leading-relaxed text-dim lg:max-w-[520px] lg:text-left lg:text-[11.5px]">
              You must be 18 or older. By continuing you accept our{" "}
              <Link
                href="/legal/terms"
                className="text-slate underline underline-offset-2"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                className="text-slate underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Column two — desktop only. The same three promises, given room. */}
        <motion.ul
          variants={listStagger}
          initial="hidden"
          animate="show"
          className="hidden lg:block lg:space-y-3"
        >
          {PROMISES.map(({ Icon, title, body }) => (
            <motion.li
              key={title}
              variants={listItem}
              className="flex gap-4 rounded-2xl border border-line bg-surface p-5"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-tint text-mint">
                <Icon size={19} strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-[16px] font-semibold text-chalk">{title}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-slate">
                  {body}
                </p>
              </div>
            </motion.li>
          ))}
          <motion.li variants={listItem} className="pt-2 text-[12px] text-dim">
            {APP_NAME} · voice only, no video, no photos.
          </motion.li>
        </motion.ul>
      </div>
    </motion.main>
  );
}
