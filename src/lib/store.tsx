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
import {
  apiGetFilters,
  apiGetMe,
  apiLogout,
  apiOnline,
  apiPatchFilters,
  clearSession,
  type FiltersResponse,
  type Me,
  type ServerGender,
} from "./api";

/**
 * Session and preferences, backed by the server.
 *
 * The client keeps a local copy so screens stay snappy, but the server is
 * the authority on entitlement. Screens 09 and 13 are the same screen in two
 * states, and `locked` below comes from the API rather than being decided
 * here — a client that decides its own tier is a client that can grant
 * itself Pro.
 */

export type Tier = "guest" | "free" | "pro";

/** UI-facing filters. The API speaks FEMALE/MALE; the UI speaks Women/Men. */
export type Filters = {
  languages: string[];
  country: string;
  gender: "Anyone" | "Women" | "Men";
  region: string | null;
  ageRange: [number, number];
};

type Prefs = {
  /** "Don't ask me again", stored per action — screen 05. */
  skipConfirmEnd: boolean;
  skipConfirmNext: boolean;
};

type Store = {
  ready: boolean;
  /** True when the API could not be reached at all. */
  offline: boolean;
  tier: Tier;
  isGuest: boolean;
  isPro: boolean;
  name: string;
  me: Me | null;
  banned: boolean;

  filters: Filters;
  locked: FiltersResponse["locked"];
  estimateSec: number;

  interests: string[];
  autoConnect: boolean;
  prefs: Prefs;
  onlineCount: number;
  showOnline: boolean;

  filterSummary: string;

  refresh: () => Promise<void>;
  setFilters: (f: Partial<Filters>) => Promise<void>;
  toggleLanguage: (l: string) => Promise<void>;
  resetFilters: () => Promise<void>;
  toggleInterest: (i: string) => void;
  setAutoConnect: (v: boolean) => void;
  setPref: (k: keyof Prefs, v: boolean) => void;
  signOut: () => Promise<void>;
};

const toUiGender = (g: ServerGender | null): Filters["gender"] =>
  g === "FEMALE" ? "Women" : g === "MALE" ? "Men" : "Anyone";

export const toServerGender = (g: Filters["gender"]): ServerGender | null =>
  g === "Women" ? "FEMALE" : g === "Men" ? "MALE" : null;

const toTier = (t: Me["tier"]): Tier =>
  t === "PRO" ? "pro" : t === "FREE" ? "free" : "guest";

const DEFAULT_FILTERS: Filters = {
  languages: ["Hinglish"],
  country: "IN",
  gender: "Anyone",
  region: null,
  ageRange: [18, 28],
};

const LOCAL_KEY = "vo:local";

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const [locked, setLocked] = useState<FiltersResponse["locked"]>({
    gender: true,
    country: true,
    region: true,
    age: true,
  });
  const [estimateSec, setEstimateSec] = useState(4);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showOnline, setShowOnline] = useState(false);

  // Interests, auto-connect and the confirm prefs are genuinely local — the
  // server has no opinion on them, so they stay in localStorage.
  const [interests, setInterests] = useState<string[]>(["Music"]);
  const [autoConnect, setAutoConnect] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    skipConfirmEnd: false,
    skipConfirmNext: false,
  });

  const applyFilters = useCallback((r: FiltersResponse) => {
    setFiltersState({
      languages: r.filters.languages,
      country: r.filters.country,
      gender: toUiGender(r.filters.gender),
      region: r.filters.region,
      ageRange: [r.filters.ageMin, r.filters.ageMax],
    });
    setLocked(r.locked);
    if (r.estimateSec) setEstimateSec(r.estimateSec);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [meRes, filtersRes] = await Promise.all([apiGetMe(), apiGetFilters()]);
      setMe(meRes);
      applyFilters(filtersRes);
      setOffline(false);
    } catch {
      // The backend is unreachable. Say so loudly rather than rendering a
      // shell where every button quietly does nothing — that reads as a
      // broken app, and the cause is invisible.
      setOffline(true);
    } finally {
      setReady(true);
    }
  }, [applyFilters]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<{
          interests: string[];
          autoConnect: boolean;
          prefs: Prefs;
        }>;
        if (saved.interests) setInterests(saved.interests);
        if (typeof saved.autoConnect === "boolean")
          setAutoConnect(saved.autoConnect);
        if (saved.prefs) setPrefs(saved.prefs);
      }
    } catch {
      /* private mode */
    }
    void refresh();
  }, [refresh]);

  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_KEY,
        JSON.stringify({ interests, autoConnect, prefs }),
      );
    } catch {
      /* private mode */
    }
  }, [interests, autoConnect, prefs]);

  // Real presence, polled. Never fake this number; the API hides it when low.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await apiOnline();
        if (alive) {
          setOnlineCount(r.online);
          setShowOnline(r.show);
        }
      } catch {
        /* leave the last known value */
      }
    };
    void tick();
    const id = setInterval(tick, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const tier = toTier(me?.tier ?? "GUEST");

  const setFilters = useCallback(
    async (f: Partial<Filters>) => {
      const next = { ...filters, ...f };
      setFiltersState(next); // optimistic
      try {
        const r = await apiPatchFilters({
          languages: next.languages,
          country: next.country,
          gender: toServerGender(next.gender),
          region: next.region,
          ageMin: next.ageRange[0],
          ageMax: next.ageRange[1],
        });
        // The server drops Pro fields for a free account, so its answer is
        // the truth and the optimistic value has to yield to it.
        applyFilters(r);
      } catch {
        void refresh();
      }
    },
    [filters, applyFilters, refresh],
  );

  const toggleLanguage = useCallback(
    async (l: string) => {
      const on = filters.languages.includes(l);
      const next = on
        ? filters.languages.filter((x) => x !== l)
        : [...filters.languages, l];
      // Never let the queue end up with no language at all.
      await setFilters({ languages: next.length ? next : filters.languages });
    },
    [filters.languages, setFilters],
  );

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [setFilters]);

  const toggleInterest = useCallback((i: string) => {
    setInterests((cur) =>
      cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i],
    );
  }, []);

  const setPref = useCallback((k: keyof Prefs, v: boolean) => {
    setPrefs((p) => ({ ...p, [k]: v }));
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout().catch(() => undefined);
    clearSession();
    await refresh();
  }, [refresh]);

  const value = useMemo<Store>(() => {
    const parts = [
      filters.country,
      tier === "pro" ? filters.gender : "Anyone",
      filters.languages[0],
      interests[0],
    ].filter(Boolean);

    return {
      ready,
      offline,
      tier,
      isGuest: tier === "guest",
      isPro: tier === "pro",
      name: me?.user?.name ?? "Guest",
      me,
      banned: me?.device.banned ?? false,
      filters,
      locked,
      estimateSec,
      interests,
      autoConnect,
      prefs,
      onlineCount,
      showOnline,
      filterSummary: parts.join(" · "),
      refresh,
      setFilters,
      toggleLanguage,
      resetFilters,
      toggleInterest,
      setAutoConnect,
      setPref,
      signOut,
    };
  }, [
    ready,
    offline,
    tier,
    me,
    filters,
    locked,
    estimateSec,
    interests,
    autoConnect,
    prefs,
    onlineCount,
    showOnline,
    refresh,
    setFilters,
    toggleLanguage,
    resetFilters,
    toggleInterest,
    setPref,
    signOut,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}
