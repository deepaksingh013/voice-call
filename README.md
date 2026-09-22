# Voice-Only — Random Calling App (frontend)

A Next.js implementation of the 17-screen UI specification in
`Voice-Call-App-UI-Spec.pdf`, wired to the backend in [`backend/`](backend/).

Calls are real: matchmaking over a WebSocket, audio peer-to-peer over WebRTC.
Guests, accounts, Pro entitlement, filters, history, friends and reports all
come from the API.

## Run it

This is the frontend. It needs the backend in [`backend/`](backend/) running.

```bash
# 1. backend  (Postgres :5434, Redis :6381, API :4000)
cd backend
docker compose up -d
npm install && npm run db:push && npm run dev

# 2. voice classifier  (:8000) — optional, guests stay "unknown" without it
cd backend/voice-service
pip install -r requirements.txt
uvicorn main:app --port 8000

# 3. frontend  (:3000)
npm install
npm run dev
```

`NEXT_PUBLIC_API_URL` points at the backend — see `.env.example`.

```bash
npm run build    # production build
npm run lint
npm run format
```

## The flow the design is built around

Talk first, sign up later, pay last. A guest calls a stranger without an
account, without an email and without giving their gender. Nothing is asked
until they reach for a filter; only then do we ask for signup, and only after
signup do we ask for money.

Three entitlement states — `guest`, `free`, `pro` — decided by the **server**,
not the client. `src/lib/store.tsx` mirrors them for rendering, but the API
drops Pro-only filter fields for anyone who has not paid, so a tampered client
gains nothing.

To see the Pro state: sign up, then Profile → Upgrade. In development the
paywall activates a subscription directly; in production only a signed gateway
webhook can.

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

## How the client talks to the server

| File | Job |
|---|---|
| `src/lib/api.ts` | Typed fetch client. Mirrors the httpOnly device/session tokens into memory so the WebSocket handshake can carry them as query params. |
| `src/lib/call.tsx` | The call engine: socket for matchmaking and signalling, `RTCPeerConnection` for the audio. Screens never touch either directly. |
| `src/lib/store.tsx` | Session, tier and filters, refreshed from the API. |

The socket waits for the server's `ready` before sending anything — the
server has a database round trip to do on connect, and a message sent into
that window has no handler yet.

## Still to do

- **Google sign-in** — the buttons are disabled and say so.
- **TURN** — peer-to-peer covers most networks; roughly 15% need a relay.
  Add your ICE servers in `src/lib/call.tsx`.
- **Report audio** — the 60-second buffer is not captured client-side yet.
- **Voice mic-check** — `apiClassifyVoice` exists but no screen records the
  sample yet, so guests stay "unknown" until it is wired to a mic check.

Prices and app name are placeholders, exactly as in the spec.
