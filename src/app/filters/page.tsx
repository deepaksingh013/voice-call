"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { Clock3, Lock, MapPin } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Screen, listItem, listStagger } from "@/components/shell/Screen";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Badge, SectionLabel } from "@/components/ui/Section";
import { AgeRange } from "@/components/ui/AgeRange";
import { COUNTRIES, GENDERS, LANGUAGES, REGIONS } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";

/**
 * SCREENS 09 and 13 — Filters, locked and unlocked.
 *
 * This is one screen in two entitlement states. Language stays free and fully
 * usable for everyone; gender, country and region sit behind a card that gives
 * one honest reason, with the real controls visible but dimmed underneath so
 * the value is obvious. Show, then ask.
 *
 * Never trust the client for which state applies — the real build checks
 * entitlement server-side on every match request.
 */
export default function FiltersPage() {
  const router = useRouter();
  const { isPro, isGuest, filters, toggleLanguage, setFilters, resetFilters } =
    useApp();

  // Recalculates as filters change. Country is the filter that moves it most.
  const waitEstimate = useMemo(() => {
    let base = 8;
    if (filters.country !== "Worldwide") base += 9;
    if (filters.gender !== "Anyone") base += 14;
    if (filters.region) base += 11;
    base += Math.max(0, 28 - (filters.ageRange[1] - filters.ageRange[0])) / 2;
    return Math.round(base);
  }, [filters]);

  const locked = !isPro;

  return (
    <>
      <PageHeader
        title="Filters"
        badge={isPro ? <Badge tone="gold">Pro</Badge> : undefined}
      />

      <Screen width="full" className="pb-4 pt-4 lg:pb-8 lg:pt-8">
        <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10 xl:gap-14">
          <motion.div
            variants={listStagger}
            initial="hidden"
            animate="show"
            className={cn(
              "space-y-6 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-7 lg:space-y-0",
              isPro && "flex-1",
            )}
          >
            {/* Language stays free. Never lock everything — the free filter
              proves filters work before asking for money. */}
            <motion.section variants={listItem}>
              <SectionLabel badge={<Badge tone="mint">Free</Badge>}>
                Language
              </SectionLabel>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <Pill
                    key={l}
                    active={filters.languages.includes(l)}
                    onClick={() => toggleLanguage(l)}
                  >
                    {l}
                  </Pill>
                ))}
              </div>
              {!isPro && (
                <p className="mt-2.5 text-[11.5px] text-slate">
                  You are matching in {filters.country}, detected automatically.
                </p>
              )}
            </motion.section>

            {/* Country — detected, not chosen, until Pro. */}
            <LockedSection variants={listItem} locked={locked} title="Country">
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map((c) => (
                  <Pill
                    key={c}
                    active={filters.country === c}
                    disabled={locked}
                    onClick={() =>
                      setFilters({
                        country: c,
                        region: c === "India" ? filters.region : null,
                      })
                    }
                  >
                    {c}
                  </Pill>
                ))}
                <Pill disabled={locked} className="text-slate">
                  + 190 more
                </Pill>
              </div>
            </LockedSection>

            <LockedSection variants={listItem} locked={locked} title="Gender">
              <div className="flex flex-wrap gap-2">
                {GENDERS.map((g) => (
                  <Pill
                    key={g}
                    active={filters.gender === g}
                    disabled={locked}
                    onClick={() => setFilters({ gender: g })}
                  >
                    {g}
                  </Pill>
                ))}
              </div>
            </LockedSection>

            {/* Region only makes sense when exactly one country is selected. */}
            {filters.country !== "Worldwide" && (
              <LockedSection
                variants={listItem}
                locked={locked}
                title={`Region in ${filters.country}`}
              >
                <div className="flex flex-wrap gap-2">
                  <Pill
                    active={filters.region === null}
                    disabled={locked}
                    onClick={() => setFilters({ region: null })}
                  >
                    Anywhere
                  </Pill>
                  {REGIONS.map((r) => (
                    <Pill
                      key={r}
                      active={filters.region === r}
                      disabled={locked}
                      icon={<MapPin size={12} strokeWidth={2.2} />}
                      onClick={() => setFilters({ region: r })}
                    >
                      {r}
                    </Pill>
                  ))}
                </div>
              </LockedSection>
            )}

            <LockedSection variants={listItem} locked={locked} title="Age range">
              <AgeRange
                value={filters.ageRange}
                disabled={locked}
                onChange={(v) => setFilters({ ageRange: v })}
              />
            </LockedSection>

            {isPro && (
              <motion.p
                variants={listItem}
                className="flex items-start gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-[12px] leading-relaxed text-ash"
              >
                <Clock3
                  size={14}
                  className="mt-0.5 shrink-0 text-mint"
                  strokeWidth={2.2}
                />
                <span>
                  {filters.country}
                  {filters.gender !== "Anyone" &&
                    `, ${filters.gender.toLowerCase()} only`}
                  , ages {filters.ageRange[0]}–{filters.ageRange[1]}: average wait
                  about{" "}
                  <span className="font-semibold tabular-nums text-chalk">
                    {waitEstimate}s
                  </span>
                  .
                </span>
              </motion.p>
            )}
          </motion.div>

          {/* The gate. One honest reason, and the cost of signup stated up front. */}
          {locked && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="sticky bottom-0 mt-6 rounded-2xl border border-mint/25 bg-surface p-4 shadow-[0_14px_40px_rgba(15,17,19,0.95)] lg:static lg:mt-0 lg:p-5 lg:shadow-none"
            >
              <p className="flex items-center gap-2 text-[15px] font-bold text-chalk">
                <Lock size={14} className="text-mint" strokeWidth={2.6} />
                {isGuest ? "Create an account first" : "Upgrade to Pro"}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-slate">
                {isGuest
                  ? "Filters need a verified account so we can stop banned users coming back. Takes 30 seconds."
                  : "Gender, country and region filters are part of Pro. Your language filter stays free."}
              </p>

              <div className="mt-3.5 space-y-2">
                <Button
                  size="md"
                  onClick={() => router.push(isGuest ? "/signup" : "/paywall")}
                >
                  {isGuest ? "Create free account" : "See Pro plans"}
                </Button>
                {isGuest && (
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="tap w-full py-1 text-[12px] text-slate hover:text-ash"
                  >
                    Already have one?{" "}
                    <span className="font-semibold text-mint">Log in</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </Screen>

      {/* Reset and Apply are pinned outside the scroll area, so they stay
          reachable however long the filter list gets. */}
      <footer className="shrink-0 border-t border-line bg-ink px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1180px] gap-2 lg:justify-end">
          {isPro && (
            <Button
              variant="secondary"
              full={false}
              onClick={resetFilters}
              className="px-6"
            >
              Reset
            </Button>
          )}
          <Button onClick={() => router.push("/talk")} className="lg:w-[220px]">
            Apply filters
          </Button>
        </div>
      </footer>
    </>
  );
}

/* -------------------------------------------------------------------- */

function LockedSection({
  title,
  locked,
  children,
  variants,
}: {
  title: string;
  locked: boolean;
  children: React.ReactNode;
  variants?: Variants;
}) {
  return (
    <motion.section variants={variants} className={cn(locked && "opacity-45")}>
      <SectionLabel badge={locked ? <Badge tone="gold">Pro</Badge> : undefined}>
        {title}
      </SectionLabel>
      <div
        aria-hidden={locked}
        className={cn(locked && "pointer-events-none select-none")}
      >
        {children}
      </div>
    </motion.section>
  );
}
