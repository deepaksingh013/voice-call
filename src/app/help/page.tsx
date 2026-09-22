"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Mail } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen } from "@/components/shell/Screen";
import { cn } from "@/lib/cn";

/**
 * Help and contact.
 *
 * The named grievance contact lives here — under the IT Rules it has to be
 * reachable, so it is on the page rather than behind a form.
 */

const FAQ = [
  {
    q: "Do I need an account to call someone?",
    a: "No. Calls are unlimited without an account, without an email and without giving your gender. An account is only needed for filters, friends and keeping your history across devices.",
  },
  {
    q: "Why do you ask for an email at all?",
    a: "So we can sign you back in on another device and stop banned users returning. It is never shown on a call and never appears in your profile. A throwaway address works fine.",
  },
  {
    q: "Will you ever ask for my phone number?",
    a: "No. Not at signup, not for verification, not later.",
  },
  {
    q: "What happens to in-call chat messages?",
    a: "They disappear when the call ends. Only messages with a friend you both added are kept.",
  },
  {
    q: "Someone was abusive. What do I do?",
    a: "Tap Report during the call, or report the call from your history for up to 24 hours afterwards. Reporting ends the call immediately and you are never matched with them again.",
  },
  {
    q: "How do I cancel Pro?",
    a: "Profile, then Manage subscription, then Cancel. Two taps, no need to contact us. You keep Pro until the end of the period.",
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <PageHeader title="Help & contact" />

      <Screen width="wide" className="pb-6 pt-4 lg:pt-7">
        <ul className="space-y-1.5">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <li
                key={item.q}
                className="overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="tap flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className="flex-1 text-[13.5px] font-semibold text-chalk">
                    {item.q}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "shrink-0 text-slate transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="px-4 pb-3.5 text-[12.5px] leading-relaxed text-slate">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>

        {/* Named contact, reachable — not a ticket form. */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
          <h2 className="flex items-center gap-2 text-[13.5px] font-bold text-chalk">
            <Mail size={15} className="text-mint" strokeWidth={2.3} />
            Grievance officer
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-slate">
            [NAME], [COMPANY]
            <br />
            [ADDRESS]
            <br />
            <span className="text-ash">grievance@[domain]</span>
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-dim">
            Complaints are acknowledged within 24 hours and resolved within 15 days.
          </p>
        </section>

        <p className="mt-5 text-center text-[11.5px] text-dim">
          <Link
            href="/guidelines"
            className="underline underline-offset-2 hover:text-slate"
          >
            Community guidelines
          </Link>
          {" · "}
          <Link
            href="/legal/terms"
            className="underline underline-offset-2 hover:text-slate"
          >
            Terms
          </Link>
          {" · "}
          <Link
            href="/legal/privacy"
            className="underline underline-offset-2 hover:text-slate"
          >
            Privacy
          </Link>
        </p>
      </Screen>
    </>
  );
}
