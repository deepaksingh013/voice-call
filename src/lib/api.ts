/**
 * Client for the backend.
 *
 * Two things here are less obvious than they look:
 *
 * 1. `credentials: "include"` on every call. The device and session tokens
 *    are httpOnly cookies, so JavaScript cannot read or attach them — the
 *    browser has to be told to send them cross-origin.
 *
 * 2. The same tokens are ALSO mirrored into response headers and cached
 *    here. A WebSocket handshake cannot carry custom headers, so the socket
 *    passes them as query parameters instead, and this is the only way the
 *    client can get hold of them.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const WS_URL = API_URL.replace(/^http/, "ws") + "/ws";

const DEVICE_KEY = "vo:device";
const SESSION_KEY = "vo:session";

/** In-memory first; localStorage is the fallback for a cleared cookie. */
let deviceToken: string | null = null;
let sessionToken: string | null = null;

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private mode
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* private mode — the cookie still works, we just cannot mirror it */
  }
}

export function getDeviceToken() {
  if (deviceToken) return deviceToken;
  if (typeof window !== "undefined") deviceToken = readStored(DEVICE_KEY);
  return deviceToken;
}

export function getSessionToken() {
  if (sessionToken) return sessionToken;
  if (typeof window !== "undefined") sessionToken = readStored(SESSION_KEY);
  return sessionToken;
}

export function clearSession() {
  sessionToken = null;
  writeStored(SESSION_KEY, null);
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const device = getDeviceToken();
  const session = getSessionToken();

  const res = await fetch(API_URL + path, {
    ...rest,
    credentials: "include",
    headers: {
      ...(body instanceof Blob || body instanceof ArrayBuffer
        ? {}
        : { "content-type": "application/json" }),
      ...(device ? { "x-device-token": device } : {}),
      ...(session ? { cookie: `vo_session=${session}` } : {}),
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : body instanceof Blob || body instanceof ArrayBuffer
          ? (body as BodyInit)
          : JSON.stringify(body),
  });

  // The server re-issues these whenever it mints a new one.
  const newDevice = res.headers.get("x-device-token");
  if (newDevice) {
    deviceToken = newDevice;
    writeStored(DEVICE_KEY, newDevice);
  }
  const newSession = res.headers.get("x-session-token");
  if (newSession) {
    sessionToken = newSession;
    writeStored(SESSION_KEY, newSession);
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (payload as { error?: string } | null)?.error ??
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}

/* ------------------------------ types -------------------------------- */

export type Tier = "GUEST" | "FREE" | "PRO";
export type ServerGender = "FEMALE" | "MALE" | "OTHER";

export type Me = {
  tier: Tier;
  device: { id: string; country: string; banned: boolean };
  gender: ServerGender | null;
  genderIsDeclared: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    gender: ServerGender;
    tier: Tier;
    proRenewsAt: string | null;
    strikes: number;
  } | null;
};

export type ServerFilters = {
  languages: string[];
  country: string;
  gender: ServerGender | null;
  region: string | null;
  ageMin: number;
  ageMax: number;
};

export type FiltersResponse = {
  filters: ServerFilters;
  locked: { gender: boolean; country: boolean; region: boolean; age: boolean };
  tier: Tier;
  estimateSec?: number;
};

export type HistoryRow = {
  id: string;
  deviceId: string;
  name: string;
  verified: boolean;
  country: string;
  at: string;
  duration: string;
  seconds: number;
  reported: boolean;
  friend: boolean;
  canAddFriend: boolean;
  canReport: boolean;
};

export type Stats = {
  calls: number;
  talkSeconds: number;
  talkTime: string;
  friends: number;
  strikes: number;
};

export type FriendRow = {
  friendshipId: string;
  userId: string;
  name: string;
  gender: ServerGender;
  since: string | null;
  preview: string | null;
  at: string | null;
};

export type ThreadMessage = {
  id: string;
  from: "me" | "them";
  text: string;
  at: string;
};

/* ----------------------------- endpoints ------------------------------ */

export const apiGetMe = () => api<Me>("/v1/auth/me");

export const apiRequestCode = (email: string) =>
  api<{ ok: true; expiresInMinutes: number; devCode?: string }>(
    "/v1/auth/request-code",
    { method: "POST", body: { email } },
  );

export const apiVerify = (input: {
  email: string;
  code: string;
  name?: string;
  gender?: ServerGender;
  dateOfBirth?: string;
}) =>
  api<{ ok: true; needsProfile?: boolean; user?: Me["user"] }>("/v1/auth/verify", {
    method: "POST",
    body: input,
  });

export const apiLogout = () =>
  api<{ ok: true }>("/v1/auth/logout", { method: "POST" });

export const apiDeleteAccount = () =>
  api<{ ok: true }>("/v1/auth/me", { method: "DELETE" });

export const apiGetFilters = () => api<FiltersResponse>("/v1/users/filters");

export const apiPatchFilters = (patch: Partial<ServerFilters>) =>
  api<FiltersResponse>("/v1/users/filters", { method: "PATCH", body: patch });

export const apiHistory = (filter: "all" | "friends" | "reported" = "all") =>
  api<{ calls: HistoryRow[]; deviceOnly: boolean }>(
    `/v1/calls/history?filter=${filter}`,
  );

export const apiOnline = () =>
  api<{ online: number; show: boolean }>("/v1/calls/online");

export const apiStats = () => api<Stats>("/v1/calls/stats");

export const apiReport = (input: {
  callId: string;
  reason: "SEXUAL" | "MINOR" | "ABUSE" | "SCAM" | "OTHER";
  note?: string;
  wrongGender?: boolean;
}) =>
  api<{ ok: true; reportId: string }>("/v1/reports", {
    method: "POST",
    body: input,
  });

export const apiFriends = () => api<{ friends: FriendRow[] }>("/v1/friends");

export const apiAddFriend = (deviceId: string) =>
  api<{ ok: true; status: string; friendshipId: string }>("/v1/friends/request", {
    method: "POST",
    body: { deviceId },
  });

export const apiThread = (friendshipId: string) =>
  api<{ messages: ThreadMessage[] }>(`/v1/friends/${friendshipId}/messages`);

export const apiSendMessage = (friendshipId: string, body: string) =>
  api<{ ok: true; id: string; at: string }>(
    `/v1/friends/${friendshipId}/messages`,
    { method: "POST", body: { body } },
  );

export const apiSubscribe = (plan: "weekly" | "monthly" | "yearly") =>
  api<{ ok: true; tier: Tier; renewsAt: string }>("/v1/billing/subscribe", {
    method: "POST",
    body: { plan },
  });

export const apiCancelSubscription = () =>
  api<{ ok: true; keepsProUntil: string | null }>("/v1/billing/cancel", {
    method: "POST",
  });

/** Raw WAV body. Used once, on the mic check, before the first call. */
export const apiClassifyVoice = (wav: Blob) =>
  api<{
    ok: true;
    label?: "female" | "male" | "unknown";
    confidence?: number;
    used?: boolean;
    degraded?: boolean;
    skipped?: string;
  }>("/v1/voice/classify", {
    method: "POST",
    body: wav,
    headers: { "content-type": "application/octet-stream" },
  });
