# Voice-Only — backend

API, matchmaking, realtime signalling and voice-based gender inference for the
Next.js frontend in the parent folder.

## Run it

```bash
docker compose up -d          # Postgres :5434, Redis :6381
npm install
npm run db:push               # create the schema
npm run dev                   # API :4000, WebSocket ws://localhost:4000/ws

# the classifier, in a second terminal
cd voice-service
pip install -r requirements.txt
uvicorn main:app --port 8000
```

Check it came up:

```bash
curl localhost:4000/health          # {"ok":true,"db":true,"redis":true}
curl localhost:8000/health
node e2e.mjs                        # drives the whole call loop
```

> Ports 5434 and 6381 are used because this machine already had something
> bound to 5433 and 6380. Change them in `docker-compose.yml` and `.env`
> together if you need to.

## Stack

| Piece | Choice |
|---|---|
| API | Node 22 + TypeScript + Express |
| Database | PostgreSQL 16 + Prisma |
| Queues, presence, rate limits | Redis 7 |
| Realtime | `ws` — matchmaking and WebRTC signalling |
| Media | Peer-to-peer WebRTC. **No SFU** — a 1:1 voice call does not need one |
| Voice inference | Python 3.12 + FastAPI + numpy/scipy |

Express rather than NestJS: roughly half the files for the same behaviour, and
everything is explicit. The module layout maps onto Nest modules if you migrate.

## Two identities, on purpose

**Device** — every visitor, including guests. Issued on first contact, before
the first call. Carries the ban, the inferred gender and a guest's call
history. This is why clearing cookies does not produce a fresh identity.

**User** — created only at signup. Carries the declared gender, the
subscription, friends and messages.

A declared gender always beats an inferred one.

## Matchmaking

The rule that keeps it simple:

> Every waiting person sits in **one** queue, chosen by their own gender.
> Seekers read from whichever queues satisfy their filter.

```
q:IN:f   q:IN:m   q:IN:u      Redis sorted sets, score = enqueue time
```

| Searching | Reads |
|---|---|
| Pro filtering Women | `q:IN:f` |
| Pro filtering Men | `q:IN:m` |
| Everyone else | all three, longest-waiting first |

So a guest classified female sits in `q:IN:f` and is reachable by a Pro filter
without ever having asked for anything.

Other behaviour worth knowing:

- **Acceptance is checked both ways.** The seeker's filter picks the queues;
  the waiting person's own filter is then verified before pairing.
- **Pairing is atomic.** Both sides are claimed with Redis `SET NX` before any
  database write, or two seekers get handed the same person under load.
- **Pro gets priority** via a score offset, not a separate queue — splitting a
  thin queue in two helps nobody.
- **Widening**: region relaxes at 8s, country at 15s, give up at 20s. Gender is
  **never** relaxed; quietly breaking the paid feature is worse than waiting.
- Pairs that reported each other are never matched again, and a pair that just
  hung up is not re-matched for 5 minutes.

## Voice gender inference

`POST /v1/voice/classify` with raw WAV → Node forwards to the Python service →
label, confidence and timestamp are stored against the **device**.

**What is stored:** a label, a confidence, a timestamp.
**What is never stored:** the audio, or any embedding derived from it.

That line is the whole legal posture. A derived label is ordinary personal
data; a stored voiceprint is a biometric identifier and carries statutory
damages in several jurisdictions.

The label is provisional by design:

- Used for filtered matching only above `VOICE_CONFIDENCE_THRESHOLD` (0.90).
  Below it the caller is `unknown` and stays in the general pool.
- Overridden the moment the person signs up and declares a gender.
- Thrown away when a wrong-gender report comes in — see `invalidateInference`.
- If the classifier is down, callers stay `unknown` and calling still works.

The model is the "light path": F0 and formants into a calibrated logistic
score. ~10ms on CPU, no GPU, no model file, and it can explain itself.

**Before you trust it in production**, retrain `score()` on your own call
audio. The current weights come from published adult speaking ranges, which is
a cold start and nothing more — phone codecs mangle exactly the high
frequencies formants live in, so lab accuracy will not survive a real call.
Tune for **precision on the female class**, not accuracy: a woman wrongly
marked unknown loses nothing, a man wrongly admitted to the female pool is a
refund.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | db + redis |
| GET | `/v1/auth/me` | issues a device on first contact |
| POST | `/v1/auth/request-code` | six digits, no password ever |
| POST | `/v1/auth/verify` | signup or login; **hard-blocks under 18** |
| POST | `/v1/auth/logout` | |
| DELETE | `/v1/auth/me` | working deletion path (DPDP) |
| GET/PATCH | `/v1/users/filters` | Pro fields dropped server-side for free |
| PATCH | `/v1/users/profile` | name only — gender is locked after signup |
| GET | `/v1/calls/history` | `?filter=all\|friends\|reported` |
| GET | `/v1/calls/online` | hides the counter below 20 |
| GET | `/v1/calls/stats` | calls, talk time, friends |
| POST | `/v1/reports` | fires on first tap, ends the call |
| POST | `/v1/reports/:id/review` | 3 upheld → auto-suspend + device ban |
| GET | `/v1/reports/pending` | moderation queue, minors first |
| GET/POST | `/v1/friends` … | mutual consent only |
| GET/POST | `/v1/billing/*` | entitlement state machine |
| POST | `/v1/voice/classify` | raw WAV body |

### WebSocket

Connect to `ws://localhost:4000/ws?device=<jwt>&session=<jwt>`.

| → server | ← client |
|---|---|
| `search`, `cancel` | `ready`, `searching`, `cancelled` |
| `signal` (WebRTC relay) | `matched`, `signal` |
| `end`, `rate`, `ping` | `peer-left`, `ended`, `queue-empty`, `error` |

`matched` carries `initiator` — exactly one side creates the offer, or the
negotiation collides.

## Not done yet

- **Email delivery.** Codes are logged in development. Wire a transactional
  provider before launch; `request-code` warns if it runs in production.
- **Payments.** `/v1/billing/subscribe` is a dev stub and refuses to run in
  production. Real entitlement must arrive via a signed Razorpay webhook —
  the client must never be able to grant itself Pro.
- **TURN.** Peer-to-peer covers most networks; roughly 15% need a relay.
  Run coturn and hand the ICE servers to the client.
- **Report audio storage.** `audioKey` is recorded with a 30-day expiry, but
  nothing uploads to R2/S3 yet.
- **Moderator auth.** `/v1/reports/:id/review` and `/pending` are unprotected.
  Put them behind admin auth before exposing this server.
