"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { useApp } from "@/lib/store";
import { apiVerify, ApiError, type ServerGender } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * SCREEN 11 — Signup, verify and basics.
 *
 * Six-box email code with auto-advance, then gender and date of birth.
 * Gender is collected here rather than at first launch because this is the
 * first point where it does any work.
 *
 * Under-18 is a hard block, enforced on the server: it bans the device and
 * ends the guest session too, so the answer here is simply to surface it.
 */

const IDENTITIES: Array<{ label: string; value: ServerGender }> = [
  { label: "Woman", value: "FEMALE" },
  { label: "Man", value: "MALE" },
  { label: "Other", value: "OTHER" },
];

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useApp();

  const email = params.get("email") ?? "";
  const devCode = params.get("dev");

  const [code, setCode] = useState(devCode ?? "");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<ServerGender | null>(null);
  const [dob, setDob] = useState({ d: "", m: "", y: "" });
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  const age = useMemo(() => {
    const d = +dob.d;
    const m = +dob.m;
    const y = +dob.y;
    if (!d || !m || y < 1900) return null;
    const birth = new Date(y, m - 1, d);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    let a = now.getFullYear() - y;
    const before =
      now.getMonth() < m - 1 || (now.getMonth() === m - 1 && now.getDate() < d);
    if (before) a -= 1;
    return a;
  }, [dob]);

  const dobComplete = dob.d.length > 0 && dob.m.length > 0 && dob.y.length === 4;
  const ready =
    code.length === 6 &&
    name.trim().length > 0 &&
    !!gender &&
    dobComplete &&
    agreed;

  const onCodeChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = code.padEnd(6, " ").split("");
    next[i] = digit || " ";
    setCode(next.join("").trimEnd());
    if (digit && i < 5) boxes.current[i + 1]?.focus();
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;

    if (age !== null && age < 18) {
      setError("You must be 18 or older to use this app.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiVerify({
        email,
        code,
        name: name.trim(),
        gender: gender!,
        dateOfBirth: new Date(+dob.y, +dob.m - 1, +dob.d).toISOString(),
      });
      await refresh();
      // Straight to the paywall, while the intent that brought them here is
      // still fresh.
      router.push("/paywall");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "That did not work. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!email) {
    return (
      <Screen width="narrow" center className="pb-5 pt-8">
        <p className="text-[13px] text-slate">
          Start from the beginning so we know where to send your code.
        </p>
        <Button className="mt-4" onClick={() => router.push("/signup")}>
          Create account
        </Button>
      </Screen>
    );
  }

  return (
    <Screen width="narrow" className="pb-5 pt-4 sm:pt-8">
      <Stepper step={2} of={3} />

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="mt-5 text-[27px] font-bold leading-[1.15] tracking-tight text-chalk"
      >
        A few basics
      </motion.h1>

      <form onSubmit={submit} className="mt-5 space-y-6">
        <section>
          <p className="text-[12.5px] leading-relaxed text-slate">
            Sent a 6-digit code to {email}.
          </p>
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                value={code[i]?.trim() ?? ""}
                onChange={(e) => onCodeChange(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !code[i]?.trim() && i > 0) {
                    boxes.current[i - 1]?.focus();
                  }
                }}
                inputMode="numeric"
                maxLength={1}
                aria-label={`Digit ${i + 1}`}
                className={cn(
                  "h-[52px] flex-1 rounded-xl border bg-surface text-center text-[20px] font-semibold tabular-nums text-chalk",
                  "focus:border-mint/60 focus:outline-none focus:ring-2 focus:ring-mint/20",
                  code[i]?.trim() ? "border-mint/40" : "border-line",
                )}
              />
            ))}
          </div>
          {devCode && (
            <p className="mt-2 text-[11.5px] text-mint">
              Development code filled in for you.
            </p>
          )}
        </section>

        <section>
          <label
            htmlFor="name"
            className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate"
          >
            First name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="What should we call you?"
            className="h-[52px] w-full rounded-xl border border-line bg-surface px-4 text-[15px] text-chalk placeholder:text-dim focus:border-mint/60 focus:outline-none"
          />
          <p className="mt-2 text-[11.5px] text-slate">
            Shown to people you call. A first name is enough.
          </p>
        </section>

        {/* Gender is locked after signup. Stating it on the screen is what
            keeps the gender filter worth anything a week later. */}
        <section>
          <h2 className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate">
            I am
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {IDENTITIES.map((g) => (
              <button
                key={g.value}
                type="button"
                aria-pressed={gender === g.value}
                onClick={() => setGender(g.value)}
                className={cn(
                  "tap rounded-xl border py-3 text-[13.5px] font-semibold",
                  gender === g.value
                    ? "border-mint/60 bg-mint-tint text-mint"
                    : "border-line bg-surface text-ash hover:border-slate/40",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-slate">
            Cannot be changed later — it powers the gender filter.
          </p>
        </section>

        {/* Date of birth, not an age checkbox: it gives a defensible record. */}
        <section>
          <h2 className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate">
            Date of birth
          </h2>
          <div className="flex items-center gap-2">
            {(
              [
                ["d", "DD", 2],
                ["m", "MM", 2],
                ["y", "YYYY", 4],
              ] as const
            ).map(([key, ph, len], i) => (
              <div key={key} className="flex flex-1 items-center gap-2">
                {i > 0 && <span className="text-dim">/</span>}
                <input
                  value={dob[key]}
                  onChange={(e) =>
                    setDob((s) => ({
                      ...s,
                      [key]: e.target.value.replace(/\D/g, "").slice(0, len),
                    }))
                  }
                  inputMode="numeric"
                  placeholder={ph}
                  aria-label={ph}
                  className="h-[52px] w-full rounded-xl border border-line bg-surface text-center text-[15px] tabular-nums text-chalk placeholder:text-dim focus:border-mint/60 focus:outline-none"
                />
              </div>
            ))}
          </div>
          {age !== null && age < 18 && (
            <p className="mt-2 text-[11.5px] font-medium text-coral">
              You must be 18 or older to use this app.
            </p>
          )}
        </section>

        {/* Specific rules are enforceable; "be nice" is not. */}
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#3cdb97]"
          />
          <span className="text-[11.5px] leading-relaxed text-slate">
            I am 18 or older, and I understand that sexual content, abuse or
            harassing anyone gets my account permanently banned.
          </span>
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-coral/40 bg-danger-tint px-4 py-3 text-[12px] leading-relaxed text-coral"
          >
            {error}
          </p>
        )}

        <Button type="submit" disabled={!ready || busy}>
          {busy ? "Checking…" : "Verify & continue"}
        </Button>
      </form>
    </Screen>
  );
}

export default function VerifyPage() {
  return (
    <>
      <PageHeader title="Create account" dismiss="back" fallbackHref="/signup" />
      <Suspense fallback={<div className="flex-1" />}>
        <VerifyForm />
      </Suspense>
    </>
  );
}
