"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen, listItem, listStagger } from "@/components/shell/Screen";
import { cn } from "@/lib/cn";

/**
 * App language — the language of the interface, which is a different thing
 * from the language filter on the filters screen. Stated on the page so
 * nobody changes this expecting to change who they match with.
 */

const UI_LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "ar", label: "Arabic", native: "العربية" },
];

export default function AppLanguagePage() {
  const [code, setCode] = useState("en");

  return (
    <>
      <PageHeader title="App language" />

      <Screen width="wide" className="pb-5 pt-4 lg:pt-7">
        <p className="mb-4 text-[12px] leading-relaxed text-slate">
          Changes the language of the app itself. It does not change who you are
          matched with — that is the language filter on{" "}
          <span className="text-ash">Filters</span>.
        </p>

        <motion.ul
          variants={listStagger}
          initial="hidden"
          animate="show"
          className="space-y-1.5"
        >
          {UI_LANGUAGES.map((l) => {
            const active = code === l.code;
            return (
              <motion.li key={l.code} variants={listItem}>
                <button
                  type="button"
                  onClick={() => setCode(l.code)}
                  aria-pressed={active}
                  className={cn(
                    "tap flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left",
                    active
                      ? "border-mint/60 bg-mint-tint"
                      : "border-line bg-surface hover:border-slate/40",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-[14px] font-semibold",
                        active ? "text-mint" : "text-chalk",
                      )}
                    >
                      {l.label}
                    </p>
                    <p className="text-[11.5px] text-slate">{l.native}</p>
                  </div>
                  {active && (
                    <Check size={16} className="text-mint" strokeWidth={2.8} />
                  )}
                </button>
              </motion.li>
            );
          })}
        </motion.ul>
      </Screen>
    </>
  );
}
