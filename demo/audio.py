"""Build the demo soundtrack: original synthesized music, sound effects and voice-over, mixed to the
recorded timeline. Everything here is generated in code, so there are no licensing questions.

Usage: python3 demo/audio.py demo/out2/events.json demo/vo demo/out2/soundtrack.wav
"""
import json, sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

SR = 44100
BPM = 112
BEAT = 60 / BPM
rng = np.random.default_rng(7)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def env(n, a=0.005, d=0.2, s=0.0, r=0.05, hold=None):
    """Simple attack / exponential decay envelope of length n samples."""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * (s + (1 - s) * np.exp(-t / d))
    if hold is not None:
        rel = np.clip((t - hold) / r, 0, 1)
        e *= 1 - rel
    return e


def note_hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x)


def place(buf, clip, at, gain=1.0):
    i = int(at * SR)
    if i < 0:
        clip, i = clip[-i:], 0
    if i >= len(buf) or len(clip) == 0:
        return
    j = min(len(buf), i + len(clip))
    buf[i:j] += clip[: j - i] * gain


# ---------- instruments ----------
def pad_chord(notes, sec):
    t = t_axis(sec)
    out = np.zeros_like(t)
    for m in notes:
        f = note_hz(m)
        for det in (-0.004, 0.0, 0.004):
            for h in range(1, 7):
                out += np.sin(2 * np.pi * f * (1 + det) * h * t + rng.random() * 6) / h**1.6
    out = lp(out, 2200)
    e = np.minimum(1, t / 0.35) * np.minimum(1, (sec - t) / 0.3)
    return out * e / (len(notes) * 6)


def pluck(m, sec=0.32, bright=1.0):
    t = t_axis(sec)
    f = note_hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.35 * bright * np.sin(4 * np.pi * f * t) + 0.12 * bright * np.sin(6 * np.pi * f * t)
    return x * env(len(t), 0.002, 0.11)


def bass(m, sec):
    t = t_axis(sec)
    f = note_hz(m)
    x = np.tanh(1.6 * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)))
    return lp(x, 900) * env(len(t), 0.004, 0.22, s=0.35, hold=sec - 0.04, r=0.04)


def kick():
    t = t_axis(0.38)
    f = 45 + 95 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(len(t), 0.001, 0.16) * 1.1


def clap():
    n = rng.standard_normal(int(0.22 * SR))
    x = hp(lp(n, 3500), 900)
    e = env(len(x), 0.001, 0.07)
    for off in (0.0, 0.011, 0.022):
        e[int(off * SR):] += 0.5 * env(len(x) - int(off * SR), 0.001, 0.012)
    return x * e * 0.5


def hat(open_=False):
    n = rng.standard_normal(int((0.18 if open_ else 0.05) * SR))
    return hp(n, 7500) * env(len(n), 0.001, 0.06 if open_ else 0.018) * 0.28


def whoosh(sec=0.6, up=True):
    n = rng.standard_normal(int(sec * SR))
    t = np.arange(len(n)) / SR
    out = np.zeros_like(n)
    steps = 24
    seg = len(n) // steps
    for k in range(steps):
        frac = k / steps if up else 1 - k / steps
        hz = 400 + 5200 * frac**2
        s = n[k * seg:(k + 1) * seg + 512]
        f = sosfilt(butter(2, [hz * 0.7, min(hz * 1.4, 18000)], "band", fs=SR, output="sos"), s)
        out[k * seg:k * seg + len(f)][: len(f)] += f[: len(out[k * seg:k * seg + len(f)])]
    e = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 2
    return out * e * 0.6


def click_sfx():
    t = t_axis(0.06)
    return (np.sin(2 * np.pi * 1800 * t) * 0.6 + np.sin(2 * np.pi * 900 * t) * 0.4) * env(len(t), 0.0005, 0.012) * 0.35


def power_down():
    t = t_axis(0.9)
    f = 660 * np.exp(-t / 0.35) + 90
    ph = 2 * np.pi * np.cumsum(f) / SR
    return lp(np.sin(ph) + 0.3 * np.sin(2 * ph), 3000) * env(len(t), 0.005, 0.5) * 0.35


def chime():
    out = np.zeros(int(1.6 * SR))
    for k, m in enumerate((76, 81, 84, 88)):
        place(out, pluck(m, 1.2, 0.6) * 0.5, k * 0.07)
    return out


# ---------- arrangement ----------
CHORDS = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]  # Am F C G
ROOTS = [45, 41, 36, 43]


def music(total, drop, low, end):
    bar = BEAT * 4
    n_bars = int(np.ceil(total / bar)) + 1
    pads = np.zeros(int((n_bars + 2) * bar * SR))
    bassb = np.zeros_like(pads)
    arp = np.zeros_like(pads)
    drums = np.zeros_like(pads)
    kicks = np.zeros_like(pads)
    for b in range(n_bars):
        ch = CHORDS[(b // 2) % 4]
        root = ROOTS[(b // 2) % 4]
        t0 = b * bar
        place(pads, pad_chord(ch, bar * 1.02), t0)
        tones = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24]
        for s in range(16):
            place(arp, pluck(tones[s % 4] + (12 if s % 8 == 7 else 0)), t0 + s * BEAT / 4, 0.32 if s % 2 == 0 else 0.2)
        if t0 >= drop - 0.01:
            for s in range(8):
                place(bassb, bass(root if s % 4 else root, BEAT / 2 * 0.95), t0 + s * BEAT / 2, 0.55)
            for q in range(4):
                place(kicks, kick(), t0 + q * BEAT)
                if q in (1, 3):
                    place(drums, clap(), t0 + q * BEAT)
                place(drums, hat(open_=(q == 3)), t0 + q * BEAT + BEAT / 2)
                place(drums, hat(), t0 + q * BEAT)
    # sidechain: duck pads and bass after each kick
    duck = np.ones_like(pads)
    for b in range(n_bars):
        for q in range(4):
            t0 = b * bar + q * BEAT
            if t0 >= drop:
                i = int(t0 * SR)
                n = int(0.3 * SR)
                curve = 1 - 0.55 * np.exp(-np.arange(n) / SR / 0.09)
                duck[i:i + n] = np.minimum(duck[i:i + n], curve[: len(duck[i:i + n])])
    # echo on the arp
    d = int(BEAT * 0.75 * SR)
    arp_e = arp.copy()
    arp_e[d:] += 0.35 * arp[:-d]
    arp_e[2 * d:] += 0.15 * arp[:-2 * d]
    mix = pads * 0.9 * duck + bassb * duck + lp(arp_e, 5000) * 0.55 + drums * 0.8 + kicks * 0.9
    mix = mix[: int(total * SR)]
    # low power section: muffle the track and drop it a little
    if low:
        a, b2 = int(low[0] * SR), int(low[1] * SR)
        muff = lp(mix, 600, 4)
        ramp = np.zeros(len(mix))
        fade = int(0.4 * SR)
        ramp[a:b2] = 1
        ramp[a:a + fade] = np.linspace(0, 1, fade)
        ramp[max(a, b2 - fade):b2] = np.linspace(1, 0, min(fade, b2 - a))
        mix = mix * (1 - ramp) + muff * ramp * 0.85
    # intro swell and outro fade
    t = np.arange(len(mix)) / SR
    mix *= np.clip(t / 1.2, 0, 1) * np.clip((total - t) / 2.5, 0, 1)
    return mix


def load_vo(path):
    x, sr = sf.read(path)
    if x.ndim > 1:
        x = x.mean(1)
    if sr != SR:
        x = resample_poly(x, SR, sr)
    return x


def main(events_path, vo_dir, out_path):
    ev = json.load(open(events_path))
    total = ev["duration"]
    m = music(total, ev["drop"], ev.get("low"), ev["end"])
    m /= np.max(np.abs(m)) + 1e-9
    vo = np.zeros(len(m))
    for idx, at in ev["vo"]:
        place(vo, load_vo(f"{vo_dir}/vo{idx:02}.wav"), at)
    vo /= np.max(np.abs(vo)) + 1e-9
    # duck music under the voice
    envv = np.convolve(np.abs(vo), np.ones(int(0.25 * SR)) / int(0.25 * SR), mode="same")
    envv = np.clip(envv / (envv.max() + 1e-9) * 6, 0, 1)
    smooth = np.convolve(envv, np.ones(int(0.3 * SR)) / int(0.3 * SR), mode="same")
    music_gain = 0.42 - 0.27 * np.clip(smooth, 0, 1)
    sfx = np.zeros(len(m))
    for at in ev.get("whoosh", []):
        place(sfx, whoosh(0.55), at - 0.3)
    for at in ev.get("click", []):
        place(sfx, click_sfx(), at)
    if ev.get("low"):
        place(sfx, power_down(), ev["low"][0])
    place(sfx, chime(), ev["end"])
    mix = m * music_gain + vo * 0.95 + sfx * 0.5
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    stereo = np.stack([mix, mix], 1)
    # light stereo width on music only
    sf.write(out_path, stereo.astype(np.float32), SR)
    print("wrote", out_path, round(len(mix) / SR, 2), "s")


if __name__ == "__main__":
    main(*sys.argv[1:4])
