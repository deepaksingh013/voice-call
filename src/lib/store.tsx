"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * The spec turns on one axis: guest → free account → pro.
 * Screens 09 and 13 are the same screen in two entitlement states, so the
 * tier lives here rather than in either page.
 */
export type Tier = "guest" | "free" | "pro";

export type Filters = {
  languages: string[];
  country: string;
  gender: string;
  region: string | null;
  ageRange: [number, number];
};

type Prefs = {
  /** "Don't ask me again" is stored per action — screen 05. */
  skipConfirmEnd: boolean;
  skipConfirmNext: boolean;
};

type State = {
  tier: Tier;
  name: string;
  interests: string[];
  autoConnect: boolean;
  filters: Filters;
  prefs: Prefs;
  onlineCount: number;
  hydrated: boolean;
};

type Store = State & {
  isPro: boolean;
  isGuest: boolean;
  setTier: (t: Tier) => void;
  setName: (n: string) => void;
  toggleInterest: (i: string) => void;
  setAutoConnect: (v: boolean) => void;
  setFilters: (f: Partial<Filters>) => void;
  toggleLanguage: (l: string) => void;
  resetFilters: () => void;
  setPref: (k: keyof Prefs, v: boolean) => void;
  filterSummary: string;
};

const DEFAULT_FILTERS: Filters = {
  languages: ["Hinglish"],
  country: "India",
  gender: "Anyone",
  region: null,
  ageRange: [18, 28],
};

const INITIAL: State = {
  tier: "guest",
  name: "Aarav",
  interests: ["Music"],
  autoConnect: false,
  filters: DEFAULT_FILTERS,
  prefs: { skipConfirmEnd: false, skipConfirmNext: false },
  onlineCount: 891,
  hydrated: false,
};

const KEY = "voice-only:state";
const Ctx = createContext<Store | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(INITIAL);

  // Guest state lives on the device only — screen 15's build note.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState((s) => ({ ...s, ...JSON.parse(raw), hydrated: true }));
      else setState((s) => ({ ...s, hydrated: true }));
    } catch {
      setState((s) => ({ ...s, hydrated: true }));
    }
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      const persist: Partial<State> = { ...state };
      delete persist.hydrated;
      localStorage.setItem(KEY, JSON.stringify(persist));
    } catch {
      /* private mode — the prototype still works, it just forgets. */
    }
  }, [state]);

  // Gentle drift on the online counter so it reads as live, not painted on.
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => ({
        ...s,
        onlineCount: Math.max(
          640,
          s.onlineCount + Math.round((Math.random() - 0.45) * 9),
        ),
      }));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const setTier = useCallback(
    (tier: Tier) => setState((s) => ({ ...s, tier })),
    [],
  );
  const setName = useCallback(
    (name: string) => setState((s) => ({ ...s, name })),
    [],
  );
  const setAutoConnect = useCallback(
    (autoConnect: boolean) => setState((s) => ({ ...s, autoConnect })),
    [],
  );

  const toggleInterest = useCallback((i: string) => {
    setState((s) => ({
      ...s,
      interests: s.interests.includes(i)
        ? s.interests.filter((x) => x !== i)
        : [...s.interests, i],
    }));
  }, []);

  const setFilters = useCallback((f: Partial<Filters>) => {
    setState((s) => ({ ...s, filters: { ...s.filters, ...f } }));
  }, []);

  const toggleLanguage = useCallback((l: string) => {
    setState((s) => {
      const on = s.filters.languages.includes(l);
      // Never let the user clear every language — the queue needs at least one.
      const next = on
        ? s.filters.languages.filter((x) => x !== l)
        : [...s.filters.languages, l];
      return {
        ...s,
        filters: {
          ...s.filters,
          languages: next.length ? next : s.filters.languages,
        },
      };
    });
  }, []);

  const resetFilters = useCallback(
    () => setState((s) => ({ ...s, filters: DEFAULT_FILTERS })),
    [],
  );

  const setPref = useCallback((k: keyof Prefs, v: boolean) => {
    setState((s) => ({ ...s, prefs: { ...s.prefs, [k]: v } }));
  }, []);

  const value = useMemo<Store>(() => {
    const { filters, tier } = state;
    // Guests and free accounts always match inside their own country.
    const parts = [
      filters.country,
      tier === "pro" ? filters.gender : "Anyone",
      filters.languages[0],
      ...state.interests.slice(0, 1),
    ].filter(Boolean);

    return {
      ...state,
      isPro: tier === "pro",
      isGuest: tier === "guest",
      setTier,
      setName,
      toggleInterest,
      setAutoConnect,
      setFilters,
      toggleLanguage,
      resetFilters,
      setPref,
      filterSummary: parts.join(" · "),
    };
  }, [
    state,
    setTier,
    setName,
    toggleInterest,
    setAutoConnect,
    setFilters,
    toggleLanguage,
    resetFilters,
    setPref,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}
