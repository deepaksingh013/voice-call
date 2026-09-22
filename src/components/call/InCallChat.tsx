"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, PhoneOff, SendHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { QUICK_REPLIES } from "@/lib/data";
import { clock, cn } from "@/lib/cn";
import type { Message } from "@/lib/data";

/**
 * SCREEN 06 — In-call chat.
 *
 * Slides over the call screen without ending it. The call bar stays pinned at
 * the top with the timer, the country and a reachable End button — a chat
 * screen that hides the call controls is a trap.
 *
 * Plain text only: no images, no files, no link previews. That single
 * restriction removes most of the abuse surface chat would otherwise add.
 */
export function InCallChat({
  open,
  seconds,
  peerName,
  peerCountry,
  onClose,
  onEnd,
}: {
  open: boolean;
  seconds: number;
  peerName: string;
  peerCountry: string;
  onClose: () => void;
  onEnd: () => void;
}) {
  // Starts empty and is never persisted: in-call chat disappears when the
  // call ends, which is stated at the top of the thread.
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  const send = (text: string) => {
    const body = text.trim();
    if (!body) return;
    setMessages((m) => [...m, { id: `s${m.length}`, from: "me", text: body }]);
    setDraft("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="In-call chat"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 34, stiffness: 320 }}
          className="
            fixed inset-0 z-40 flex flex-col bg-ink
            md:left-auto md:right-6 md:top-6 md:bottom-6 md:w-[420px]
            md:rounded-3xl md:border md:border-line
            md:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]
            lg:right-10
          "
        >
          {/* Call bar — name, live timer, country, and End. */}
          <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to call"
              className="tap -ml-1 grid h-8 w-8 place-items-center rounded-lg text-ash hover:bg-surface"
            >
              <ChevronDown size={19} />
            </button>

            <Avatar name={peerName} size="sm" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-chalk">
                {peerName}
              </p>
              <p className="flex items-center gap-1.5 text-[11.5px] text-mint">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                On call{" "}
                <span className="tabular-nums text-slate">
                  {clock(seconds)} · {peerCountry}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={onEnd}
              aria-label="End call"
              className="tap grid h-9 w-9 place-items-center rounded-full bg-danger text-white"
            >
              <PhoneOff size={16} strokeWidth={2.2} />
            </button>
          </header>

          {/* Stated at the top of the thread, not buried in settings. */}
          <p className="shrink-0 border-b border-line/60 bg-surface/40 px-4 py-2 text-center text-[11px] text-slate">
            Messages disappear when the call ends
          </p>

          <div className="scroll-area flex-1 space-y-2 px-4 py-4">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "flex",
                  m.from === "me" ? "justify-end" : "justify-start",
                )}
              >
                <div className="max-w-[78%]">
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
                      m.from === "me"
                        ? "rounded-br-md bg-mint text-ink"
                        : "rounded-bl-md bg-surface text-chalk",
                    )}
                  >
                    {m.text}
                  </div>
                  {m.at && (
                    <p
                      className={cn(
                        "mt-1 text-[10.5px] text-dim",
                        m.from === "me" ? "text-right" : "text-left",
                      )}
                    >
                      {m.at}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Most in-call typing is one of these three. */}
          <div className="scroll-area flex shrink-0 gap-2 px-4 pb-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="tap shrink-0 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-[12px] font-medium text-ash hover:border-slate/50"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message"
              aria-label="Type a message"
              className="h-11 flex-1 rounded-pill border border-line bg-surface px-4 text-[13.5px] text-chalk placeholder:text-dim focus:border-mint/50 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!draft.trim()}
              className="tap grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint text-ink disabled:opacity-35"
            >
              <SendHorizontal size={17} strokeWidth={2.2} />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
