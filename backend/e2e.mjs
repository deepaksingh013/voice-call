/**
 * End-to-end check of the call loop.
 *
 * Drives two real clients through the whole thing: guest identity, queueing,
 * matching, WebRTC signal relay, hangup, and the history row that results.
 * Then proves the paid gender filter actually filters.
 *
 *   node e2e.mjs
 */
import { WebSocket } from "ws";

const API = "http://localhost:4000";
const WS = "ws://localhost:4000/ws";

let failures = 0;
const check = (label, ok, extra = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
};

/** A browser-ish client: keeps its device token, opens a socket, buffers. */
async function newClient(name) {
  const res = await fetch(`${API}/v1/auth/me`);
  const deviceJwt = res.headers.get("x-device-token");
  const me = await res.json();
  if (!deviceJwt) throw new Error(`${name}: no device token issued`);

  const c = {
    name,
    deviceJwt,
    sessionJwt: null,
    deviceId: me.device.id,
    msgs: [],
    ws: null,
  };

  c.headers = () => {
    const h = { "x-device-token": c.deviceJwt };
    if (c.sessionJwt) h.cookie = `vo_session=${c.sessionJwt}`;
    return h;
  };

  c.connect = () =>
    new Promise((resolve, reject) => {
      const q = new URLSearchParams({ device: c.deviceJwt });
      if (c.sessionJwt) q.set("session", c.sessionJwt);
      const ws = new WebSocket(`${WS}?${q}`);
      c.ws = ws;
      ws.on("message", (d) => c.msgs.push(JSON.parse(String(d))));
      ws.on("open", () => resolve(c));
      ws.on("error", reject);
    });

  c.send = (m) => c.ws.send(JSON.stringify(m));

  c.waitFor = (t, ms = 8000) =>
    new Promise((resolve, reject) => {
      const started = Date.now();
      const tick = setInterval(() => {
        const hit = c.msgs.find((m) => m.t === t);
        if (hit) {
          clearInterval(tick);
          resolve(hit);
        } else if (Date.now() - started > ms) {
          clearInterval(tick);
          reject(new Error(`${name}: timed out waiting for "${t}" (got ${c.msgs.map((m) => m.t).join(",") || "nothing"})`));
        }
      }, 60);
    });

  return c;
}

async function api(client, path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { "content-type": "application/json", ...client.headers(), ...opts.headers },
  });
  const session = res.headers.get("x-session-token");
  if (session) client.sessionJwt = session;
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function signup(client, email, name, gender, dob) {
  const req = await api(client, "/v1/auth/request-code", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  const code = req.body.devCode;
  const done = await api(client, "/v1/auth/verify", {
    method: "POST",
    body: JSON.stringify({ email, code, name, gender, dateOfBirth: dob }),
  });
  return done;
}

/* ===================================================================== */

console.log("\n1. Two guests match and talk");

const a = await newClient("A");
const b = await newClient("B");
check("guests get distinct devices", a.deviceId !== b.deviceId);

await a.connect();
await b.connect();
await a.waitFor("ready");
await b.waitFor("ready");
check("both sockets authenticated", true);

a.send({ t: "search" });
await a.waitFor("searching");
b.send({ t: "search" });

const mA = await a.waitFor("matched");
const mB = await b.waitFor("matched");
check("both sides matched", mA.callId === mB.callId, `call ${mA.callId}`);
check("exactly one initiator", mA.initiator !== mB.initiator);
check("peer identity exposed", Boolean(mA.peer?.name && mA.peer?.country));
check("guest gets a two-word handle", mA.peer.name.split(" ").length === 2, mA.peer.name);
check("guest is not marked verified", mA.peer.verified === false);

// WebRTC signalling relay — the server must pass this through untouched.
a.send({ t: "signal", data: { kind: "offer", sdp: "v=0-fake" } });
const relayed = await b.waitFor("signal");
check("signalling relayed to peer", relayed.data.sdp === "v=0-fake");

await new Promise((r) => setTimeout(r, 1200));
a.send({ t: "end", reason: "HANGUP" });
await a.waitFor("ended");
const left = await b.waitFor("peer-left");
check("peer told the call ended", left.reason === "HANGUP");

const hist = await api(a, "/v1/calls/history");
check("call appears in history", hist.body.calls.length === 1);
check("duration recorded", hist.body.calls[0]?.seconds >= 1, `${hist.body.calls[0]?.duration}`);
check("guest history flagged device-only", hist.body.deviceOnly === true);

/* ===================================================================== */

console.log("\n2. The paid gender filter actually filters");

// A Pro user who wants to talk to women only.
const pro = await newClient("PRO");
await signup(pro, `pro${Date.now()}@example.com`, "Aarav", "MALE", "1996-02-02");
await api(pro, "/v1/billing/subscribe", {
  method: "POST",
  body: JSON.stringify({ plan: "monthly" }),
});
const proMe = await api(pro, "/v1/auth/me");
check("subscription grants PRO", proMe.body.tier === "PRO");

await api(pro, "/v1/users/filters", {
  method: "PATCH",
  body: JSON.stringify({ gender: "FEMALE" }),
});
const pf = await api(pro, "/v1/users/filters");
check("Pro can set the gender filter", pf.body.filters.gender === "FEMALE");

// A free account that declared MALE — must never satisfy a FEMALE filter.
const male = await newClient("MALE");
await signup(male, `male${Date.now()}@example.com`, "Karan", "MALE", "1997-03-03");

await pro.connect();
await male.connect();
await pro.waitFor("ready");
await male.waitFor("ready");

pro.send({ t: "search", wantsGender: "FEMALE" });
await pro.waitFor("searching");
male.send({ t: "search" });

await new Promise((r) => setTimeout(r, 3500));
check(
  "male is NOT given to a Women-only filter",
  !pro.msgs.some((m) => m.t === "matched"),
);

// Now a guest whose voice was classified female at high confidence.
const guestF = await newClient("GUEST-F");
const inferred = await api(guestF, "/v1/voice/_test-set", {
  method: "POST",
  body: JSON.stringify({ label: "female", confidence: 0.97 }),
});
check("inference recorded for guest", inferred.status === 200, JSON.stringify(inferred.body));

await guestF.connect();
await guestF.waitFor("ready");
guestF.send({ t: "search" });

const proMatch = await pro.waitFor("matched", 9000).catch(() => null);
check(
  "guest inferred female IS matched to the Pro filter",
  proMatch !== null,
  proMatch ? `call ${proMatch.callId}` : "never matched",
);

if (proMatch) {
  pro.send({ t: "end", reason: "HANGUP" });
  await pro.waitFor("ended").catch(() => {});
}

/* ===================================================================== */

console.log("\n3. Free accounts cannot buy the filter by asking nicely");

const free = await newClient("FREE");
await signup(free, `free${Date.now()}@example.com`, "Dev", "MALE", "1995-05-05");
const attempt = await api(free, "/v1/users/filters", {
  method: "PATCH",
  body: JSON.stringify({ gender: "FEMALE" }),
});
check(
  "server drops Pro fields for a free account",
  attempt.body.filters.gender === null,
  `got ${attempt.body.filters.gender}`,
);

for (const c of [a, b, pro, male, free, guestF]) c.ws?.close();

console.log(
  failures === 0
    ? "\nAll checks passed.\n"
    : `\n${failures} check(s) failed.\n`,
);
process.exit(failures === 0 ? 0 : 1);
