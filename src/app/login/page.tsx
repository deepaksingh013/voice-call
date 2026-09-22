"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { GoogleMark } from "@/components/ui/GoogleMark";
import { useApp } from "@/lib/store";
import { apiRequestCode, apiVerify, ApiError } from "@/lib/api";

/**
 * Log in — the "I already have an account" path from screen 01.
 *
 * Same two doors as signup and no password, because signup never created
 * one. There is no phone field here either.
 */
export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useApp();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiRequestCode(email);
      setStep("code");
      // Development only: the API returns the code so there is no need for
      // a mail provider while building.
      if (r.devCode) setHint(`Development code: ${r.devCode}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiVerify({ email, code });
      if (r.needsProfile) {
        // No account on this email yet — that is signup, not login.
        router.push(`/signup?email=${encodeURIComponent(email)}`);
        return;
      }
      await refresh();
      router.push("/talk");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

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
          Same email you used before. There is no password to remember — we send a
          code.
        </p>

        <div className="mt-7 space-y-4">
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

          {step === "email" ? (
            <form onSubmit={sendCode}>
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
              <Button type="submit" disabled={!valid || busy} className="mt-4">
                {busy ? "Sending…" : "Send me a code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitCode}>
              <label
                htmlFor="login-code"
                className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate"
              >
                Six-digit code
              </label>
              <input
                id="login-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="h-[52px] w-full rounded-2xl border border-line bg-surface px-4 text-center text-[20px] font-semibold tracking-[0.3em] tabular-nums text-chalk placeholder:text-dim focus:border-mint/60 focus:outline-none"
              />
              {hint && <p className="mt-2 text-[11.5px] text-mint">{hint}</p>}
              <Button
                type="submit"
                disabled={code.length !== 6 || busy}
                className="mt-4"
              >
                {busy ? "Checking…" : "Log in"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setHint(null);
                }}
                className="tap mt-3 w-full text-center text-[12px] text-slate hover:text-ash"
              >
                Use a different email
              </button>
            </form>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-coral/40 bg-danger-tint px-4 py-3 text-[12px] leading-relaxed text-coral"
            >
              {error}
            </p>
          )}
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
