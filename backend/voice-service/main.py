"""
Voice gender inference.

Takes a few seconds of speech, returns female / male / unknown with a
confidence. The audio is held in memory for the length of the request and
never written anywhere, and no embedding is produced or returned — a derived
label is ordinary personal data, a stored voiceprint is a biometric
identifier, and the difference matters a great deal legally.

The classifier here is deliberately the "light path": fundamental frequency
and formants fed into a calibrated logistic score. It runs in ~10ms on CPU,
it needs no GPU and no model file, and — unlike a neural net — it can tell
you why it decided, which you will want the first time a user disputes their
label. When you have real call audio to train on, swap `score()` for a
LightGBM model over the same feature vector; nothing else has to change.

Run:
    uvicorn main:app --port 8000
"""

from __future__ import annotations

import io
import math
import wave

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from scipy.signal import lfilter, resample_poly

app = FastAPI(title="voice-gender", version="1.0.0")

TARGET_SR = 16_000
FRAME_MS = 25
HOP_MS = 10

# Adult speaking ranges. The band between them is real and is exactly why F0
# alone is not enough to decide on.
F0_MIN, F0_MAX = 60.0, 320.0


# --------------------------------------------------------------------------
# Decoding
# --------------------------------------------------------------------------

def decode_wav(raw: bytes) -> tuple[np.ndarray, int]:
    """PCM WAV only. Anything else should be transcoded before it gets here."""
    try:
        with wave.open(io.BytesIO(raw), "rb") as w:
            channels = w.getnchannels()
            width = w.getsampwidth()
            sr = w.getframerate()
            frames = w.readframes(w.getnframes())
    except wave.Error as exc:
        raise HTTPException(400, f"Could not read WAV: {exc}") from exc

    if width == 2:
        audio = np.frombuffer(frames, dtype="<i2").astype(np.float32) / 32768.0
    elif width == 1:
        audio = (np.frombuffer(frames, dtype=np.uint8).astype(np.float32) - 128) / 128.0
    elif width == 4:
        audio = np.frombuffer(frames, dtype="<i4").astype(np.float32) / 2147483648.0
    else:
        raise HTTPException(400, f"Unsupported sample width: {width}")

    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1)

    return audio, sr


def to_target_rate(audio: np.ndarray, sr: int) -> np.ndarray:
    if sr == TARGET_SR:
        return audio
    g = math.gcd(sr, TARGET_SR)
    return resample_poly(audio, TARGET_SR // g, sr // g).astype(np.float32)


# --------------------------------------------------------------------------
# Voiced-frame selection
#
# Skipping this is the single most common way these classifiers go wrong:
# F0 is meaningless on silence and on unvoiced consonants, and background
# noise wrecks formant estimation.
# --------------------------------------------------------------------------

def voiced_frames(audio: np.ndarray) -> list[np.ndarray]:
    n = int(TARGET_SR * FRAME_MS / 1000)
    hop = int(TARGET_SR * HOP_MS / 1000)
    if len(audio) < n:
        return []

    frames = [audio[i : i + n] for i in range(0, len(audio) - n, hop)]
    if not frames:
        return []

    energies = np.array([float(np.sqrt(np.mean(f**2))) for f in frames])
    peak = float(energies.max())
    if peak < 1e-4:
        return []

    # Keep frames well above the noise floor, and require some periodicity so
    # that fricatives and clicks do not sneak in.
    floor = max(peak * 0.15, float(np.median(energies)))

    kept = []
    for f, e in zip(frames, energies):
        if e < floor:
            continue
        zcr = float(np.mean(np.abs(np.diff(np.sign(f))) > 0))
        if zcr > 0.35:  # noisy / unvoiced
            continue
        kept.append(f)
    return kept


# --------------------------------------------------------------------------
# Features
# --------------------------------------------------------------------------

def frame_f0(frame: np.ndarray) -> float | None:
    """Autocorrelation pitch. Returns None when the frame is not periodic."""
    f = frame - frame.mean()
    if np.allclose(f, 0):
        return None

    corr = np.correlate(f, f, mode="full")[len(f) - 1 :]
    if corr[0] <= 0:
        return None
    corr = corr / corr[0]

    lo = int(TARGET_SR / F0_MAX)
    hi = min(int(TARGET_SR / F0_MIN), len(corr) - 1)
    if hi <= lo:
        return None

    window = corr[lo:hi]
    peak = int(np.argmax(window)) + lo

    # A weak peak means we are not looking at periodic speech.
    if corr[peak] < 0.3:
        return None

    return float(TARGET_SR / peak)


def frame_formants(frame: np.ndarray, order: int = 12) -> list[float]:
    """First formants via LPC roots. Female tracts are shorter, so higher."""
    f = frame * np.hamming(len(frame))
    f = lfilter([1.0, -0.97], 1.0, f)  # pre-emphasis lifts the high end

    # Levinson-Durbin via autocorrelation.
    r = np.correlate(f, f, mode="full")[len(f) - 1 :][: order + 1]
    if r[0] == 0:
        return []

    a = np.zeros(order + 1)
    a[0] = 1.0
    e = r[0]
    for i in range(1, order + 1):
        acc = r[i] + sum(a[j] * r[i - j] for j in range(1, i))
        k = -acc / e if e != 0 else 0.0
        new = a.copy()
        for j in range(1, i):
            new[j] = a[j] + k * a[i - j]
        new[i] = k
        a = new
        e *= 1 - k * k
        if e <= 0:
            return []

    roots = np.roots(a)
    roots = roots[np.imag(roots) > 0.01]
    if roots.size == 0:
        return []

    freqs = sorted(float(np.arctan2(np.imag(r_), np.real(r_)) * TARGET_SR / (2 * np.pi)) for r_ in roots)
    return [f_ for f_ in freqs if 90 < f_ < 5000]


def extract(audio: np.ndarray) -> dict[str, float] | None:
    frames = voiced_frames(audio)
    # Two seconds of *voiced speech*, not two seconds of audio.
    if len(frames) < 40:
        return None

    f0s = [v for v in (frame_f0(f) for f in frames) if v is not None]
    if len(f0s) < 20:
        return None

    f1s, f2s, f3s = [], [], []
    for f in frames:
        fm = frame_formants(f)
        if len(fm) >= 3:
            f1s.append(fm[0])
            f2s.append(fm[1])
            f3s.append(fm[2])

    arr = np.array(f0s)
    feats = {
        # Median, not mean: far more robust to octave errors.
        "f0_median": float(np.median(arr)),
        "f0_p5": float(np.percentile(arr, 5)),
        "f0_p95": float(np.percentile(arr, 95)),
        "f0_std": float(np.std(arr)),
        "voiced_frames": float(len(frames)),
    }
    if f1s:
        feats["f1_median"] = float(np.median(f1s))
        feats["f2_median"] = float(np.median(f2s))
        feats["f3_median"] = float(np.median(f3s))
    return feats


# --------------------------------------------------------------------------
# Scoring
# --------------------------------------------------------------------------

def _logistic(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def score(feats: dict[str, float]) -> tuple[str, float]:
    """
    Returns (label, confidence).

    Weights are hand-set from published adult speaking ranges, which is a
    reasonable cold start and nothing more. Retrain on your own call audio
    before trusting the numbers: phone codecs mangle exactly the high
    frequencies formants live in, so lab accuracy will not survive contact
    with a real call.
    """
    f0 = feats["f0_median"]

    # Centred at 155 Hz, in the middle of the overlap band.
    z = (f0 - 155.0) / 22.0

    # Formants are the backstop. A pitch-shifting app moves F0 easily; moving
    # F3 convincingly is much harder, and a male vocal tract cannot produce
    # female formant spacing.
    f3 = feats.get("f3_median")
    if f3 is not None:
        z += (f3 - 2600.0) / 420.0

    p_female = _logistic(z)

    label = "female" if p_female >= 0.5 else "male"
    confidence = p_female if label == "female" else 1.0 - p_female

    # Short samples do not earn full confidence however clean they look.
    if feats["voiced_frames"] < 80:
        confidence *= 0.85

    return label, round(min(confidence, 0.99), 4)


# --------------------------------------------------------------------------
# API
# --------------------------------------------------------------------------

@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "model": "f0+formant logistic v1", "sampleRate": TARGET_SR}


@app.post("/classify")
async def classify(request: Request) -> dict[str, object]:
    raw = await request.body()
    if len(raw) < 4000:
        raise HTTPException(400, "Clip too short")

    audio, sr = decode_wav(raw)
    audio = to_target_rate(audio, sr)

    feats = extract(audio)
    if feats is None:
        # Not enough usable speech. "unknown" is a perfectly good answer and
        # keeps the caller in the general pool rather than guessing.
        return {"label": "unknown", "confidence": 0.0, "reason": "insufficient voiced speech"}

    label, confidence = score(feats)
    # The audio goes out of scope here and is never persisted.
    return {"label": label, "confidence": confidence, "features": feats}
