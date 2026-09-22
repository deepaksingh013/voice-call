"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen } from "@/components/shell/Screen";

/**
 * Terms and Privacy, linked from screen 01 and the drawer footer.
 * Placeholder copy — the real text is a legal deliverable, not a UI one.
 */

const DOCS = {
  terms: {
    title: "Terms",
    updated: "Updated 1 September 2026",
    sections: [
      {
        h: "Who can use this",
        p: "You must be 18 or older. If you are under 18 you may not use this app, and we will end any session and permanently close any account where we have reason to believe the user is a minor.",
      },
      {
        h: "What you agree not to do",
        p: "No sexual content, no abuse, threats or harassment, no scams, spam or promotion, and no recording or sharing a call without the other person's consent. Breaking these ends your access, and bans follow the device as well as the account.",
      },
      {
        h: "Calls are between you and a stranger",
        p: "We match people. We do not vet them. Treat everyone on a call as a stranger, because that is what they are. Never share your phone number, address or payment details on a call.",
      },
      {
        h: "Reports and moderation",
        p: "Reports are reviewed by a moderator. Three upheld reports suspend an account automatically. Reports involving a suspected minor are actioned first.",
      },
      {
        h: "Subscriptions",
        p: "Pro renews automatically until you cancel. You can cancel at any time from Profile, then Manage subscription, and you keep Pro until the end of the period you paid for.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    updated: "Updated 1 September 2026",
    sections: [
      {
        h: "What we never ask for",
        p: "We never ask for your phone number. Not at signup, not for verification, not later. We do not collect photos or video, because the product has neither.",
      },
      {
        h: "Guests",
        p: "A guest gets an anonymous device token and a country derived from the IP address. That token exists so that banned users cannot return by clearing cookies. It is not tied to a name, an email or a phone number, and nothing on any screen asks a guest for anything.",
      },
      {
        h: "Accounts",
        p: "An account holds an email address, a gender and a date of birth. Your email is never shown to anyone on a call and never appears in your profile. It is used to sign you back in and to contact you about your account.",
      },
      {
        h: "Calls and messages",
        p: "We do not record calls. A rolling 60-second audio buffer is held in memory during a call so that it can be attached to a report; it is discarded when the call ends clean, and a buffer attached to a report is deleted after 30 days. In-call chat disappears when the call ends. Messages with a friend you both added are kept until either of you deletes them.",
      },
      {
        h: "Your rights",
        p: "You can delete your account and data at any time from the side menu under Delete my data. Deletion completes within 30 days. Safety records and payment records are kept where the law requires it. Our grievance officer is named on the Help page.",
      },
    ],
  },
} as const;

export default function LegalPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = use(params);
  const content = DOCS[doc as keyof typeof DOCS];
  if (!content) notFound();

  return (
    <>
      <PageHeader title={content.title} />

      <Screen width="wide" className="pb-8 pt-4 lg:pt-7">
        <p className="text-[11px] uppercase tracking-[0.12em] text-dim">
          {content.updated}
        </p>

        <div className="mt-5 space-y-6">
          {content.sections.map((s, i) => (
            <motion.section
              key={s.h}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <h2 className="text-[14.5px] font-bold text-chalk">{s.h}</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate">
                {s.p}
              </p>
            </motion.section>
          ))}
        </div>

        <p className="mt-8 text-[11px] leading-relaxed text-dim">
          Placeholder text for the prototype. The shipping version of this document
          is a legal deliverable.
        </p>
      </Screen>
    </>
  );
}
