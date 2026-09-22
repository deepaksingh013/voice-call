"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  MoreVertical,
  Phone,
  SendHorizontal,
  ShieldAlert,
  UserX,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FRIENDS, FRIEND_THREAD, type Message } from "@/lib/data";
import { cn } from "@/lib/cn";

/**
 * SCREEN 16 — Chat with a friend.
 *
 * The only place messages are kept, and only between people who both agreed
 * to the add. The call button sits in the header because the point of this
 * screen is to get back onto a call, not to become a messaging app.
 *
 * Text only here too. Keeping images out of a product built on anonymous
 * strangers is the single largest moderation decision available.
 */
export default function FriendChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const friend = FRIENDS.find((f) => f.id === id) ?? FRIENDS[0];

  const [messages, setMessages] = useState<Message[]>(FRIEND_THREAD);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: `s${m.length}`, from: "me", text, at: "Now" }]);
    setDraft("");
  };

  return (
    <>
      <header className="relative flex shrink-0 items-center gap-3 border-b border-line px-3 py-3 sm:px-5 lg:px-8">
        <button
          type="button"
          onClick={() => router.push("/friends")}
          aria-label="Back to friends"
          className="tap grid h-9 w-9 place-items-center rounded-xl text-ash hover:bg-surface"
        >
          <ChevronLeft size={21} />
        </button>

        <Avatar name={friend.name} size="sm" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-chalk">{friend.name}</p>
          {/* Online state and country, so the user knows whether calling now
              makes sense. */}
          <p className="truncate text-[11.5px] text-slate">
            <span className={cn(friend.online && "font-semibold text-mint")}>
              {friend.online ? "Online" : "Offline"}
            </span>{" "}
            · {friend.country} · {friend.language}
          </p>
        </div>

        {/* Primary action, green, always visible. */}
        <button
          type="button"
          onClick={() => router.push("/searching")}
          aria-label={`Call ${friend.name}`}
          className="tap grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-ink shadow-[0_6px_20px_-8px_rgba(60,219,151,0.9)]"
        >
          <Phone size={17} strokeWidth={2.3} />
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More options"
          aria-expanded={menuOpen}
          className="tap -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ash hover:bg-surface"
        >
          <MoreVertical size={18} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.16 }}
              className="absolute right-3 top-[58px] z-30 w-52 overflow-hidden rounded-xl border border-line bg-surface shadow-xl"
            >
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="tap flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] text-chalk hover:bg-surface-hi"
              >
                <UserX size={14} /> Block {friend.name}
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="tap flex w-full items-center gap-2.5 border-t border-line px-4 py-3 text-left text-[13px] text-coral hover:bg-surface-hi"
              >
                <ShieldAlert size={14} /> Report {friend.name}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="scroll-area flex min-h-0 flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-4 py-4 sm:px-6">
          <p className="mb-4 text-center text-[11px] text-dim">
            Friends since {friend.since}
          </p>

          <div className="space-y-2">
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
          </div>

          {/* Stated in the thread so nobody has to hunt for it. A friend can
            turn bad later. */}
          <p className="mt-6 text-center text-[11px] leading-relaxed text-dim">
            Block or report {friend.name} from the menu at any time.
          </p>

          <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={send}
        className="shrink-0 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-[720px] items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${friend.name}`}
            aria-label={`Message ${friend.name}`}
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
        </div>
      </form>
    </>
  );
}
