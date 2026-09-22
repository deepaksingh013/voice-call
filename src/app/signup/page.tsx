"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { GoogleMark } from "@/components/ui/GoogleMark";

/**
 * SCREEN 10 — Signup, email or Google.
 *
 * No phone number is requested anywhere in this product. Google is the
 * one-tap path; email is the fallback. Nothing else is asked — no username,
 * no password, no phone.
 */
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <>
      <PageHeader title="Create account" dismiss="close" />

      <Screen width="narrow" center className="pb-5 pt-4 sm:pt-8">
        <Stepper step={1} of={3} />

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 text-[27px] font-bold leading-[1.15] tracking-tight text-chalk"
        >
          Create your
          <br />
          account
        </motion.h1>

        {/* On a stranger-chat product this is a feature worth stating,
            not a gap to hide. */}
        <p className="mt-2.5 text-[13px] leading-relaxed text-slate">
          No phone number. We never ask for one, and we never will.
        </p>

        <div className="mt-7 space-y-4">
          {/* Google first: one tap, already verified, skips the code screen. */}
          <Button
            variant="secondary"
            onClick={() => {
              // Google users land on step 2 with the code step already done.
              router.push("/signup/verify?via=google");
            }}
          >
            <GoogleMark />
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-dim">
              or
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) router.push("/signup/verify");
            }}
          >
            <label
              htmlFor="email"
              className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-[52px] w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-chalk placeholder:text-dim focus:border-mint/60 focus:outline-none focus:ring-2 focus:ring-mint/20"
            />
            <p className="mt-2 text-[11.5px] text-slate">
              Use a throwaway address if you prefer — that works fine here.
            </p>

            <Button type="submit" disabled={!valid} className="mt-4">
              Send me a code
            </Button>
          </form>
        </div>

        <p className="mt-auto pt-8 text-[11px] leading-relaxed text-dim">
          Your email is never shown to anyone on a call and never appears in your
          profile. It is only used to sign you back in and to contact you about your
          account.
        </p>
      </Screen>
    </>
  );
}
