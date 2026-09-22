"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Lock, ChevronRight } from "lucide-react";
import { APP_VERSION } from "@/lib/data";
import { ACCOUNT_NAV, CALLING_NAV, SAFETY_NAV, type NavItem } from "@/lib/nav";
import { useApp } from "@/lib/store";
import { Badge } from "@/components/ui/Section";
import { cn } from "@/lib/cn";

/* ------------------------------ context ------------------------------ */

const DrawerCtx = createContext<{ open: () => void; close: () => void } | null>(
  null,
);

export function useDrawer() {
  const v = useContext(DrawerCtx);
  if (!v) throw new Error("useDrawer must be used inside <DrawerProvider>");
  return v;
}

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ open, close }), [open, close]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    // The drawer only exists below lg; if the window grows past it, close.
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && close();
    mq.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
    };
  }, [isOpen, close]);

  return (
    <DrawerCtx.Provider value={value}>
      {children}
      <SideMenu open={isOpen} onClose={close} />
    </DrawerCtx.Provider>
  );
}

/* ------------------------------- rows -------------------------------- */

function Row({
  item,
  meta,
  onNavigate,
}: {
  item: NavItem;
  meta?: ReactNode;
  onNavigate: (href: string) => void;
}) {
  const { isGuest } = useApp();
  const locked = item.needsAccount && isGuest;
  const href = locked && item.href !== "/filters" ? "/signup" : item.href;

  return (
    <button
      type="button"
      onClick={() => onNavigate(href)}
      className="tap flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface"
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-hi",
          item.tone === "gold" && "bg-gold/10 text-gold",
          item.tone === "danger" && "bg-danger-tint text-coral",
          (!item.tone || item.tone === "default") && "text-ash",
        )}
      >
        <item.Icon size={15} />
      </span>
      <span
        className={cn(
          "flex-1 text-[14px] font-medium",
          item.tone === "danger" ? "text-coral" : "text-chalk",
        )}
      >
        {item.label}
      </span>
      {meta}
      {item.pro && <Badge tone="gold">Pro</Badge>}
      {locked ? (
        <Lock size={13} className="text-dim" strokeWidth={2.4} />
      ) : (
        <ChevronRight size={15} className="text-dim" />
      )}
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-dim">
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

/* ------------------------------ screen 08 ---------------------------- */

function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tier, name, isGuest, isPro, filters } = useApp();
  const router = useRouter();

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <motion.button
            aria-label="Close menu"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 360 }}
            className="scroll-area relative flex w-[85%] max-w-[330px] flex-col border-r border-line bg-ink px-3 py-5"
          >
            {/* Account header: states the status plainly and gives one concrete
                reason to sign up, not a generic "unlock more". */}
            <div className="mb-5 rounded-2xl border border-line bg-surface p-4">
              <p className="text-[17px] font-bold text-chalk">
                {isGuest ? "Guest" : name}
              </p>
              <p className="mt-0.5 text-[12px] text-slate">
                {isGuest
                  ? "Not signed in"
                  : isPro
                    ? "Pro · renews [DATE]"
                    : "Free account"}
              </p>

              {isGuest && (
                <>
                  <button
                    type="button"
                    onClick={() => go("/signup")}
                    className="tap mt-3 w-full rounded-xl bg-mint py-2.5 text-[13px] font-semibold text-ink"
                  >
                    Create free account
                  </button>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate">
                    Keeps your friends, history and filters when you switch phones.
                  </p>
                </>
              )}
            </div>

            <Group title="Calling">
              {CALLING_NAV.map((item) => (
                <Row
                  key={item.href}
                  item={item}
                  onNavigate={go}
                  meta={
                    item.href === "/filters" && !isGuest ? (
                      <span className="text-[11px] text-slate">
                        {filters.country} · {isPro ? filters.gender : "Anyone"}
                      </span>
                    ) : undefined
                  }
                />
              ))}
            </Group>

            <Group title="Account">
              {ACCOUNT_NAV.filter((i) => !(i.pro && isPro)).map((item) => (
                <Row
                  key={item.href}
                  item={item}
                  onNavigate={go}
                  meta={
                    item.href === "/app-language" ? (
                      <span className="text-[11px] text-slate">English</span>
                    ) : undefined
                  }
                />
              ))}
            </Group>

            <Group title="Safety & support">
              {SAFETY_NAV.map((item) => (
                <Row key={item.href} item={item} onNavigate={go} />
              ))}
            </Group>

            <footer className="mt-auto px-2 pt-4 text-[11px] text-dim">
              {APP_VERSION} ·{" "}
              <Link
                href="/legal/terms"
                onClick={onClose}
                className="hover:text-slate"
              >
                Terms
              </Link>{" "}
              ·{" "}
              <Link
                href="/legal/privacy"
                onClick={onClose}
                className="hover:text-slate"
              >
                Privacy
              </Link>
              <span className="sr-only"> — current tier: {tier}</span>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
