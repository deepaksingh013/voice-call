"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Flag,
  PhoneOff,
  SkipForward,
  Mic,
  MicOff,
  MessageSquare,
  UserPlus,
  Lock,
  Globe,
} from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar } from "@/components/ui/Avatar";
import { Waveform } from "@/components/call/Waveform";
import {
  ConfirmLeaveDialog,
  type LeaveAction,
} from "@/components/call/ConfirmLeaveDialog";
import { InCallChat } from "@/components/call/InCallChat";
import { ReportSheet } from "@/components/call/ReportSheet";
import { GenderFilterBar } from "@/components/call/GenderFilterBar";
import { PEER } from "@/lib/data";
import { useApp } from "@/lib/store";
import { clock, cn } from "@/lib/cn";

/**
 * SCREEN 04 — In call.
 *
 * The three actions a user actually needs mid-call sit together right below
 * the caller: Report, End call, Next call. End is the largest and sits in the
 * centre. Mute, Chat and Add drop to a flat second row because they are
 * convenience controls, not decisions.
 *
 * Every label is written out — icon-only controls get mis-tapped, and a
 * mis-tap here loses a conversation.
 */
export default function CallPage() {
  const router = useRouter();
  const { isGuest, prefs, setPref, autoConnect } = useApp();

  const [seconds, setSeconds] = useState(252); // the spec shows 04:12
  const [muted, setMuted] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirming, setConfirming] = useState<LeaveAction | null>(null);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const leave = useCallback(
    (action: LeaveAction) => {
      if (action === "next") router.push("/searching");
      else router.push(autoConnect ? "/searching" : "/call/ended");
    },
    [router, autoConnect],
  );

  const request = (action: LeaveAction) => {
    const skip = action === "end" ? prefs.skipConfirmEnd : prefs.skipConfirmNext;
    if (skip) leave(action);
    else setConfirming(action);
  };

  const confirm = (remember: boolean) => {
    if (!confirming) return;
    if (remember) {
      setPref(confirming === "end" ? "skipConfirmEnd" : "skipConfirmNext", true);
    }
    const action = confirming;
    setConfirming(null);
    leave(action);
  };

  return (
    <>
      <TopBar />

      <main className="scroll-area flex min-h-0 flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col px-5 pb-4 pt-4 sm:px-6 lg:max-w-[680px] lg:pb-10 lg:pt-10">
          <div className="flex flex-1 flex-col items-center">
            <motion.span
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 rounded-pill border border-mint/30 bg-mint-tint px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mint"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-mint" />
              Connected
            </motion.span>

            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 260 }}
              className="mt-5"
            >
              <Avatar name={PEER.initial} size="xl" />
            </motion.div>

            <h1 className="mt-4 text-[22px] font-bold tracking-tight text-chalk sm:text-[26px]">
              {PEER.name}
            </h1>

            {/* The country pill sits directly under the name, for every user, on
                every call including guests. It sets the language expectation and
                it is the main reason people report a call as spam or a scam. */}
            <div className="mt-2 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ash">
                <Globe size={11} strokeWidth={2.4} />
                {PEER.country}
              </span>
              <span className="text-[11.5px] text-slate">
                {PEER.age} · {PEER.city} · {PEER.language}
              </span>
            </div>

            <Waveform muted={muted} className="mt-6" />

            <p
              aria-live="off"
              className="mt-1 text-[30px] font-light tabular-nums tracking-[0.06em] text-chalk sm:text-[38px]"
            >
              {clock(seconds)}
            </p>
          </div>

          {/* The three primary controls. */}
          <div className="mb-3 flex shrink-0 items-end justify-center gap-7 sm:mb-4 sm:gap-10">
            <PrimaryControl
              label="Report"
              tone="report"
              onClick={() => setReportOpen(true)}
            >
              <Flag size={20} strokeWidth={2.1} />
            </PrimaryControl>

            <PrimaryControl
              label="End call"
              tone="end"
              onClick={() => request("end")}
            >
              <PhoneOff size={26} strokeWidth={2.1} />
            </PrimaryControl>

            <PrimaryControl
              label="Next call"
              tone="next"
              onClick={() => request("next")}
            >
              <SkipForward size={20} strokeWidth={2.1} />
            </PrimaryControl>
          </div>

          {/* Second row — convenience controls, flat and quieter. */}
          <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
            <SecondaryControl
              label="Mute"
              active={muted}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? <MicOff size={15} /> : <Mic size={15} />}
            </SecondaryControl>

            <SecondaryControl label="Chat" onClick={() => setChatOpen(true)}>
              <MessageSquare size={15} />
            </SecondaryControl>

            {/* Padlocked for guests; tapping routes to signup. */}
            <SecondaryControl
              label="Add"
              locked={isGuest}
              onClick={() => router.push(isGuest ? "/signup" : "/friends")}
            >
              {isGuest ? <Lock size={14} /> : <UserPlus size={15} />}
            </SecondaryControl>
          </div>

          {/* Who the next call is with. Mid-call is when a user is most
              certain about who they do and do not want to meet, so the
              choice is offered here rather than only back on the home
              screen. */}
          <div className="mt-3 shrink-0">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dim">
              Next call with
            </p>
            <GenderFilterBar variant="inline" />
          </div>
        </div>
      </main>

      <ConfirmLeaveDialog
        action={confirming}
        seconds={seconds}
        onConfirm={confirm}
        onCancel={() => setConfirming(null)}
      />

      <InCallChat
        open={chatOpen}
        seconds={seconds}
        onClose={() => setChatOpen(false)}
        onEnd={() => {
          setChatOpen(false);
          request("end");
        }}
      />

      {/* Report fires on the first tap into its own sheet — it is never
          wrapped in a confirmation. */}
      <ReportSheet
        open={reportOpen}
        seconds={seconds}
        onClose={() => setReportOpen(false)}
        onSubmit={() => {
          setReportOpen(false);
          router.push("/call/ended?reported=1");
        }}
      />
    </>
  );
}

/* --------------------------- controls --------------------------------- */

const PRIMARY_TONES = {
  report: {
    ring: "h-[58px] w-[58px] border-coral/45 bg-danger-tint text-coral",
    label: "text-coral",
  },
  end: {
    ring: "h-[76px] w-[76px] border-transparent bg-danger text-white shadow-[0_10px_34px_-12px_rgba(226,79,58,0.95)]",
    label: "text-danger",
  },
  next: {
    ring: "h-[58px] w-[58px] border-mint/45 bg-mint-tint text-mint",
    label: "text-mint",
  },
};

function PrimaryControl({
  label,
  tone,
  onClick,
  children,
}: {
  label: string;
  tone: keyof typeof PRIMARY_TONES;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const t = PRIMARY_TONES[tone];
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={label}
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", damping: 17, stiffness: 420 }}
        className={cn(
          "grid place-items-center rounded-full border focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20",
          t.ring,
        )}
      >
        {children}
      </motion.button>
      <span className={cn("text-[11.5px] font-semibold", t.label)}>{label}</span>
    </div>
  );
}

function SecondaryControl({
  label,
  active,
  locked,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  locked?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "tap flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-[13px] font-semibold",
        active
          ? "border-transparent bg-chalk text-ink"
          : "border-line bg-surface text-ash hover:border-slate/40",
        locked && "text-dim",
      )}
    >
      {children}
      {label}
    </button>
  );
}
