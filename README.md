# Voice-Only — Random Calling App (frontend)

A Next.js implementation of the 17-screen UI specification in
`Voice-Call-App-UI-Spec.pdf`. **Frontend only** — there is no backend, no
WebRTC and no network calls. Every screen is driven by local state and the
placeholder content in `src/lib/data.ts`.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
npm run format   # prettier
```

## The flow the design is built around

Talk first, sign up later, pay last. A guest calls a stranger without an
account, without an email and without giving their gender. Nothing is asked
until they reach for a filter; only then do we ask for signup, and only after
signup do we ask for money.

The app has three entitlement states — `guest`, `free`, `pro` — held in
`src/lib/store.tsx` and persisted to `localStorage`. **Profile → "Prototype —
switch tier"** flips between them so every locked and unlocked state can be
inspected without a backend.

## Screens and routes

| # | Screen | Route |
|---|--------|-------|
| 01 | Welcome — guest entry | `/` |
| 02 | Home — guest, idle | `/talk` |
| 03 | Searching for a match | `/searching` |
| 04 | In call | `/call` |
| 05 | Confirm before leaving a call | dialog on `/call` |
| 06 | In-call chat | sheet on `/call` |
| 07 | Call ended | `/call/ended` |
| 08 | Side menu (drawer) | global overlay, any screen |
| 09 | Filters — locked for guests | `/filters` (guest / free) |
| 10 | Signup — email or Google | `/signup` |
| 11 | Signup — verify and basics | `/signup/verify` |
| 12 | Subscription paywall | `/paywall` |
| 13 | Filters — Pro unlocked | `/filters` (pro) |
| 14 | Report a call | sheet on `/call` |
| 15 | Call history | `/history` |
| 16 | Chat with a friend | `/friends/[id]` |
| 17 | Your profile | `/profile` |

Supporting routes reached from the drawer so nothing dead-ends: `/login`,
`/friends`, `/games`, `/billing`, `/notifications`, `/app-language`,
`/guidelines`, `/blocked`, `/help`, `/delete-data`, `/legal/terms`,
`/legal/privacy`.

## Responsive behaviour

Three real layouts, one codebase — not a phone mockup scaled up.

| Breakpoint | Navigation | Content |
|---|---|---|
| **Phone** (< 768px) | bottom tab bar + drawer | single column, edge to edge, sized with `dvh` so collapsing browser chrome never cuts off the tab bar |
| **Tablet** (768px+) | bottom tab bar + drawer | single column with wider gutters and larger type; sheets become centred modals, cards go two-up |
| **Laptop / desktop** (1024px+) | persistent sidebar; the tab bar, the header and the drawer all disappear | real columns — call button with a right rail, filters two-up with the gate as a rail, profile as a two-column dashboard, welcome as a split hero |

Key pieces:

- `src/components/shell/AppShell.tsx` — sidebar + page column.
- `src/components/shell/Sidebar.tsx` — desktop navigation.
- `src/components/shell/TabBar.tsx` + `Drawer.tsx` — phone and tablet navigation, both `lg:hidden`.
- `src/lib/nav.ts` — one navigation model shared by all three, so they cannot drift apart.
- `src/components/shell/Screen.tsx` — per-page measure (`narrow` / `base` / `wide` / `full`) and gutters. Reading screens stay narrow; lists and dashboards go wide.

Verified at 390px, 834px and 1440px with no horizontal overflow on any route.

## Structure

```
src/
  app/                    one folder per route
  components/
    shell/                AppShell, Sidebar, TopBar, TabBar, TabsChrome,
                          Drawer, PageHeader, Screen
    call/                 CallButton, Waveform, ConfirmLeaveDialog,
                          InCallChat, ReportSheet
    ui/                   Button, Pill, Toggle, Sheet, Dialog, AgeRange, …
  lib/
    store.tsx             tier, filters, interests, per-action confirm prefs
    nav.ts                navigation model shared by sidebar, tabs and drawer
    data.ts               all placeholder content
    cn.ts                 class joiner + mm:ss clock
```

Design tokens (colours sampled from the specification) live in
`src/app/globals.css` under `@theme`. The product is dark-only by design.

Animation is Framer Motion: shared page entrance, drawer and sheet springs,
list stagger, the expanding call rings and the live waveform. Everything
respects `prefers-reduced-motion`.

## Not built here

Anything the specification lists as backend: device tokens, matchmaking
queues, the rolling 60-second audio buffer, the report pipeline and
server-side entitlement checks. Screens 09 and 13 are the same screen in two
states — in a real build, never trust the client for which one applies.

Prices, app name and ad creative are placeholders, exactly as in the spec.
