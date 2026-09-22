"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { WS_URL, getDeviceToken, getSessionToken, type ServerGender } from "./api";

/**
 * The call engine.
 *
 * The socket carries matchmaking and signalling; the audio itself goes
 * peer-to-peer over WebRTC and never touches the server. Keeping those
 * separate is why a 1:1 voice product needs no media server.
 *
 * Everything the UI needs is exposed as plain state, so screens stay
 * declarative and none of them touch a WebSocket or an RTCPeerConnection.
 */

export type CallStatus =
  | "idle"
  | "connecting" // socket opening
  | "searching" // in the queue
  | "queue-empty" // waited too long, nobody there
  | "connected" // on a call
  | "ended";

export type Peer = {
  deviceId: string;
  name: string;
  country: string;
  verified: boolean;
  age: number | null;
  gender: ServerGender | null;
};

type CallState = {
  status: CallStatus;
  peer: Peer | null;
  callId: string | null;
  seconds: number;
  muted: boolean;
  estimateSec: number;
  micDenied: boolean;
  error: string | null;
  /** Set when the other side hung up rather than us. */
  endedByPeer: boolean;
  lastCallSeconds: number;
};

type CallApi = CallState & {
  search: (opts?: { wantsGender?: ServerGender | null }) => Promise<void>;
  cancel: () => void;
  end: (reason?: "HANGUP" | "SKIPPED") => void;
  next: () => void;
  toggleMute: () => void;
  rate: (value: -1 | 0 | 1) => void;
  reset: () => void;
};

const Ctx = createContext<CallApi | null>(null);

/** Public STUN is enough to discover candidates; a TURN relay is needed for
 *  the minority of networks where the direct path fails. Add yours here. */
const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
};

const INITIAL: CallState = {
  status: "idle",
  peer: null,
  callId: null,
  seconds: 0,
  muted: false,
  estimateSec: 4,
  micDenied: false,
  error: null,
  endedByPeer: false,
  lastCallSeconds: 0,
};

export function CallProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CallState>(INITIAL);

  const ws = useRef<WebSocket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Candidates that arrive before the remote description is set. */
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  /** Guards against React StrictMode queueing the same search twice. */
  const searching = useRef(false);

  const patch = useCallback(
    (p: Partial<CallState>) => setState((s) => ({ ...s, ...p })),
    [],
  );

  const send = useCallback((msg: Record<string, unknown>) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  /* ----------------------------- media ------------------------------- */

  const getMic = useCallback(async () => {
    if (localStream.current) return localStream.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStream.current = stream;
      patch({ micDenied: false });
      return stream;
    } catch {
      patch({ micDenied: true, error: "Microphone access is needed to call." });
      return null;
    }
  }, [patch]);

  const teardownPeer = useCallback(() => {
    pc.current?.getSenders().forEach((s) => s.track?.stop());
    pc.current?.close();
    pc.current = null;
    pendingIce.current = [];
    if (remoteAudio.current) remoteAudio.current.srcObject = null;
  }, []);

  const buildPeer = useCallback(
    async (initiator: boolean) => {
      const stream = await getMic();
      if (!stream) return;

      const conn = new RTCPeerConnection(ICE);
      pc.current = conn;

      stream.getTracks().forEach((t) => conn.addTrack(t, stream));

      conn.ontrack = (e) => {
        if (remoteAudio.current && e.streams[0]) {
          remoteAudio.current.srcObject = e.streams[0];
          void remoteAudio.current.play().catch(() => undefined);
        }
      };

      conn.onicecandidate = (e) => {
        if (e.candidate) send({ t: "signal", data: { ice: e.candidate.toJSON() } });
      };

      conn.onconnectionstatechange = () => {
        if (conn.connectionState === "failed") {
          patch({
            error: "Connection failed. Trying the next call usually fixes it.",
          });
        }
      };

      // Exactly one side offers, or the negotiation collides.
      if (initiator) {
        const offer = await conn.createOffer();
        await conn.setLocalDescription(offer);
        send({ t: "signal", data: { sdp: conn.localDescription } });
      }
    },
    [getMic, send, patch],
  );

  const handleSignal = useCallback(
    async (data: {
      sdp?: RTCSessionDescriptionInit;
      ice?: RTCIceCandidateInit;
    }) => {
      const conn = pc.current;
      if (!conn) return;

      if (data.sdp) {
        await conn.setRemoteDescription(new RTCSessionDescription(data.sdp));

        // Anything that arrived early can be applied now.
        for (const c of pendingIce.current) {
          await conn.addIceCandidate(new RTCIceCandidate(c)).catch(() => undefined);
        }
        pendingIce.current = [];

        if (data.sdp.type === "offer") {
          const answer = await conn.createAnswer();
          await conn.setLocalDescription(answer);
          send({ t: "signal", data: { sdp: conn.localDescription } });
        }
        return;
      }

      if (data.ice) {
        if (conn.remoteDescription) {
          await conn
            .addIceCandidate(new RTCIceCandidate(data.ice))
            .catch(() => undefined);
        } else {
          pendingIce.current.push(data.ice);
        }
      }
    },
    [send],
  );

  /* ----------------------------- timer -------------------------------- */

  const startTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    setState((s) => ({ ...s, seconds: 0 }));
    timer.current = setInterval(
      () => setState((s) => ({ ...s, seconds: s.seconds + 1 })),
      1000,
    );
  }, []);

  const stopTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  /* ---------------------------- socket -------------------------------- */

  const connect = useCallback(async () => {
    if (ws.current?.readyState === WebSocket.OPEN) return ws.current;
    if (ws.current?.readyState === WebSocket.CONNECTING) return ws.current;

    const device = getDeviceToken();
    if (!device) {
      // No token means the very first API call never succeeded, which in
      // practice means the backend is not reachable at all.
      patch({
        error:
          "Cannot reach the server, so calls are unavailable. Check that the API is running and that NEXT_PUBLIC_API_URL points at it.",
      });
      return null;
    }

    const params = new URLSearchParams({ device });
    const session = getSessionToken();
    if (session) params.set("session", session);

    const socket = new WebSocket(`${WS_URL}?${params}`);
    ws.current = socket;

    socket.onmessage = async (e) => {
      const msg = JSON.parse(e.data as string) as {
        t: string;
        [k: string]: unknown;
      };

      switch (msg.t) {
        case "searching":
          patch({
            status: "searching",
            estimateSec: (msg.estimateSec as number) ?? 4,
          });
          break;

        case "matched": {
          searching.current = false;
          patch({
            status: "connected",
            peer: msg.peer as Peer,
            callId: msg.callId as string,
            endedByPeer: false,
            error: null,
          });
          startTimer();
          await buildPeer(Boolean(msg.initiator));
          break;
        }

        case "signal":
          await handleSignal(
            msg.data as {
              sdp?: RTCSessionDescriptionInit;
              ice?: RTCIceCandidateInit;
            },
          );
          break;

        case "peer-left":
          stopTimer();
          teardownPeer();
          setState((s) => ({
            ...s,
            status: "ended",
            endedByPeer: true,
            lastCallSeconds: s.seconds,
          }));
          break;

        case "ended":
          stopTimer();
          teardownPeer();
          setState((s) => ({ ...s, status: "ended", lastCallSeconds: s.seconds }));
          break;

        case "queue-empty":
          patch({ status: "queue-empty" });
          break;

        case "cancelled":
          searching.current = false;
          patch({ status: "idle" });
          break;

        case "error":
          patch({ error: (msg.message as string) ?? "Something went wrong" });
          break;
      }
    };

    socket.onclose = () => {
      ws.current = null;
      stopTimer();
      teardownPeer();
    };

    // Wait for "ready", not merely for the socket to open. The server has a
    // database round trip to do before it can act on anything, and a message
    // sent into that window is a message the server has not registered a
    // handler for yet.
    await new Promise<void>((resolve) => {
      const done = () => {
        socket.removeEventListener("message", onReady);
        resolve();
      };
      const onReady = (e: MessageEvent) => {
        try {
          if ((JSON.parse(e.data as string) as { t?: string }).t === "ready")
            done();
        } catch {
          /* not our message */
        }
      };
      socket.addEventListener("message", onReady);
      socket.onerror = () => done();
      // Never hang the UI on a socket that refuses to talk.
      setTimeout(done, 6000);
    });

    return socket;
  }, [patch, startTimer, stopTimer, buildPeer, handleSignal, teardownPeer]);

  /* ---------------------------- actions ------------------------------- */

  const search = useCallback(
    async (opts?: { wantsGender?: ServerGender | null }) => {
      patch({ status: "connecting", error: null, endedByPeer: false });

      // Ask for the microphone before queueing. Being matched and then
      // discovering you have no mic wastes the other person's time.
      const stream = await getMic();
      if (!stream) {
        patch({ status: "idle" });
        return;
      }

      const socket = await connect();
      if (!socket) {
        patch({ status: "idle" });
        return;
      }

      if (searching.current) return;
      searching.current = true;
      send({ t: "search", wantsGender: opts?.wantsGender ?? null });
      patch({ status: "searching" });
    },
    [connect, getMic, patch, send],
  );

  const cancel = useCallback(() => {
    searching.current = false;
    send({ t: "cancel" });
    patch({ status: "idle" });
  }, [send, patch]);

  const end = useCallback(
    (reason: "HANGUP" | "SKIPPED" = "HANGUP") => {
      send({ t: "end", reason });
      stopTimer();
      teardownPeer();
      setState((s) => ({ ...s, status: "ended", lastCallSeconds: s.seconds }));
    },
    [send, stopTimer, teardownPeer],
  );

  const next = useCallback(() => {
    send({ t: "end", reason: "SKIPPED" });
    stopTimer();
    teardownPeer();
    setState((s) => ({ ...s, status: "searching", peer: null, callId: null }));
    send({ t: "search" });
  }, [send, stopTimer, teardownPeer]);

  const toggleMute = useCallback(() => {
    setState((s) => {
      const muted = !s.muted;
      localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
      return { ...s, muted };
    });
  }, []);

  const rate = useCallback(
    (value: -1 | 0 | 1) => send({ t: "rate", value }),
    [send],
  );

  const reset = useCallback(() => {
    searching.current = false;
    setState((s) => ({ ...INITIAL, lastCallSeconds: s.lastCallSeconds }));
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      teardownPeer();
      localStream.current?.getTracks().forEach((t) => t.stop());
      ws.current?.close();
    };
  }, [stopTimer, teardownPeer]);

  const value = useMemo<CallApi>(
    () => ({ ...state, search, cancel, end, next, toggleMute, rate, reset }),
    [state, search, cancel, end, next, toggleMute, rate, reset],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* The only place remote audio plays. Hidden, but it must be in the
          DOM — a detached element will not play on iOS. */}
      <audio ref={remoteAudio} autoPlay playsInline className="hidden" />
    </Ctx.Provider>
  );
}

export function useCall() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCall must be used inside <CallProvider>");
  return v;
}
