"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { GoogleMark } from "@/components/ui/GoogleMark";
import { useApp } from "@/lib/store";

/**
 * Log in — the "I already have an account" path from screen 01.
 *
 * Same two doors as signup and no password, because signup never created
 * one. There is no phone field here either.
 */
export default function LoginPage() {
  const router = useRouter();
  const { setTier } = useApp();
  const [email, setEmail] = useState("");

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const signIn = () => {
    setTier("free");
    router.push("/talk");
  };

  return (
    <>
      <PageHeader title="Log in" dismiss="back" fallbackHref="/" />

      <Screen width="narrow" center className="pb-5 pt-5 sm:pt-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          className="text-[27px] font-bold leading-[1.15] tracking-tight text-chalk"
        >
          Welcome back
        </motion.h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-slate">
          Same email or Google account you used before. There is no password to
          remember — we send a code.
        </p>

        <div className="mt-7 space-y-4">
          <Button variant="secondary" onClick={signIn}>
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
              if (valid) signIn();
            }}
          >
            <label
              htmlFor="login-email"
              className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate"
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-[52px] w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-chalk placeholder:text-dim focus:border-mint/60 focus:outline-none focus:ring-2 focus:ring-mint/20"
            />
            <Button type="submit" disabled={!valid} className="mt-4">
              Send me a code
            </Button>
          </form>
        </div>

        <div className="mt-auto pt-8">
          <button
            type="button"
            onClick={() => router.push("/talk")}
            className="tap w-full py-2 text-center text-[12.5px] text-slate hover:text-ash"
          >
            Keep calling as a guest instead
          </button>
        </div>
      </Screen>
    </>
  );
}
