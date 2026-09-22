"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { GoogleMark } from "@/components/ui/GoogleMark";
import { VenusIcon, MarsIcon } from "@/components/ui/GenderIcons";
import { apiRequestCode, ApiError } from "@/lib/api";

/**
 * SCREEN 10 — Signup, email or Google.
 *
 * No phone number is requested anywhere in this product. Google is the
 * one-tap path; email is the fallback. Nothing else is asked — no username,
 * no password, no phone.
 */
function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set when the user arrived by reaching for the gender filter. Naming
  // the reason they came keeps the thread intact all the way to the
  // paywall, which opens with the same promise.
  const wantsGender = params.get("want") === "gender";

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiRequestCode(email);
      const q = new URLSearchParams({ email });
      if (wantsGender) q.set("want", "gender");
      // Development only: the API hands back the code so no mail provider
      // is needed while building.
      if (r.devCode) q.set("dev", r.devCode);
      router.push(`/signup/verify?${q}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not send a code. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Create account" dismiss="close" />

      <Screen width="narrow" center className="pb-5 pt-4 sm:pt-8">
        <Stepper step={1} of={3} />

        {wantsGender && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 flex items-center gap-2.5 rounded-2xl border border-gold/25 bg-gold/[0.06] px-4 py-3"
          >
            <span className="flex shrink-0 items-center gap-1 text-gold">
              <VenusIcon size={15} />
              <MarsIcon size={15} />
            </span>
            <p className="text-[12px] leading-snug text-ash">
              To choose who you talk to, you need an account first.{" "}
              <span className="text-slate">Takes 30 seconds.</span>
            </p>
          </motion.div>
        )}

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
          <Button variant="secondary" disabled>
            <GoogleMark />
            Continue with Google
          </Button>
          <p className="-mt-2 text-center text-[11px] text-dim">
            Google sign-in is not wired up yet.
          </p>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-dim">
              or
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={submit}>
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

            <Button type="submit" disabled={!valid || busy} className="mt-4">
              {busy ? "Sending…" : "Send me a code"}
            </Button>
          </form>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-coral/40 bg-danger-tint px-4 py-3 text-[12px] leading-relaxed text-coral"
            >
              {error}
            </p>
          )}
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <SignupForm />
    </Suspense>
  );
}
