"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Bottom sheet on touch, centred modal on a pointer.
 *
 * A sheet that slides up from the thumb is right on a phone and wrong on a
 * 27" display, where the action is nowhere near the bottom edge. Above `md`
 * the same content becomes a centred dialog.
 */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isDesktop;
}

export function Sheet({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end md:items-center md:justify-center md:p-6">
          <motion.button
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={isDesktop ? { opacity: 0, scale: 0.95 } : { y: "100%" }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.97 } : { y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            className="
              relative max-h-[88dvh] w-full overflow-hidden rounded-t-3xl
              border-t border-line bg-ink
              md:max-h-[84dvh] md:max-w-[480px] md:rounded-3xl md:border
              md:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]
            "
          >
            <div className="mx-auto mt-3 h-1 w-9 rounded-pill bg-line md:hidden" />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
