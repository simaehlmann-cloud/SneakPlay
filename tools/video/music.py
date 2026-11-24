#!/usr/bin/env python3
"""SneakPlay – eigene, lizenzfreie Hintergrundmusik synthetisieren.

    python3 music.py 40.0 out/musik-40.wav
    python3 music.py 28.4 out/musik-28.wav

Fröhlicher, leichter Pop-Groove (116 BPM, C-Dur, I–V–vi–IV) aus Zupf-Arpeggio,
weichem Flächen-Akkord, Bass, Kick, Clap und Hi-Hat. Alles hier berechnet,
keine fremden Samples – deshalb ohne Rechte Dritter nutzbar."""
import sys
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 48000
BPM = 116
BEAT = 60 / BPM
rng = np.random.default_rng(7)


def hz(n):  # MIDI → Hz
    return 440.0 * 2 ** ((n - 69) / 12)


def env(n, a, d):
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def pluck(f, dur, amp):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum((0.6 ** k) * np.sin(2 * np.pi * f * (k + 1) * t + k) for k in range(5))
    return amp * s * env(n, 0.004, 0.22)


def pad(freqs, dur, amp):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.12):
            ff = f * 2 ** (det / 12)
            s += sum(np.sin(2 * np.pi * ff * (k + 1) * t) / (k + 1) for k in range(4))
    a = int(0.35 * SR); r = int(0.4 * SR)
    e = np.ones(n); e[:a] = np.linspace(0, 1, a); e[-r:] = np.linspace(1, 0, r)
    s = sosfilt(butter(2, 1800, fs=SR, output="sos"), s)
    return amp * s * e / len(freqs)


def bass(f, dur, amp):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)
    return amp * s * env(n, 0.006, 0.18)


def kick(amp):
    n = int(0.32 * SR); t = np.arange(n) / SR
    f = 45 + 85 * np.exp(-t / 0.04)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return amp * np.sin(ph) * np.exp(-t / 0.12)


def clap(amp):
    n = int(0.2 * SR)
    s = sosfilt(butter(2, [900, 4000], btype="band", fs=SR, output="sos"), rng.standard_normal(n))
    e = env(n, 0.002, 0.06)
    for off in (0.0, 0.012, 0.024):  # kurzer Mehrfach-Anschlag
        k = int(off * SR); e[k:k + 200] += np.linspace(0.6, 0, 200)[: n - k]
    return amp * s * e


def hat(amp, open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    s = sosfilt(butter(2, 7000, btype="high", fs=SR, output="sos"), rng.standard_normal(n))
    return amp * s * env(n, 0.001, 0.06 if open_ else 0.015)


def add(buf, sig, t, pan=0.0):
    i = int(t * SR)
    if i >= buf.shape[1]:
        return
    sig = sig[: buf.shape[1] - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + len(sig)] += sig * l * 1.414
    buf[1, i:i + len(sig)] += sig * r * 1.414


def make(length):
    n = int((length + 1.5) * SR)
    buf = np.zeros((2, n))
    # C – G – Am – F
    chords = [(60, [60, 64, 67]), (55, [55, 59, 62]), (57, [57, 60, 64]), (53, [53, 57, 60])]
    arp = [0, 1, 2, 4, 2, 1, 2, 1]   # Indizes in die erweiterte Akkordliste
    bar = 4 * BEAT
    bars = int(np.ceil(length / bar)) + 1
    intro = 2
    fin = length - 2.2          # Schlussakkord
    for b in range(bars):
        t0 = b * bar
        if t0 > length:
            break
        root, tones = chords[b % 4]
        ext = tones + [tones[0] + 12, tones[1] + 12]
        last = t0 >= fin
        if not last:
            add(buf, pad([hz(x) for x in tones], min(bar + 0.4, fin - t0 + 0.3), 0.10), t0, 0)
        # Arpeggio in Achteln (eine Oktave höher), ab Takt 2
        if b >= 1:
            for k, idx in enumerate(arp):
                tt = t0 + k * BEAT / 2
                if tt >= fin - 0.05:
                    break
                add(buf, pluck(hz(ext[idx] + 12), 0.5, 0.11), tt, -0.35 if k % 2 else 0.35)
        # Rhythmus ab Takt „intro“
        if b >= intro and not last:
            for beat in range(4):
                tb = t0 + beat * BEAT
                if tb >= fin - 0.05:
                    break
                if beat in (0, 2):
                    add(buf, kick(0.55), tb)
                if beat in (1, 3):
                    add(buf, clap(0.16), tb, 0.1)
                add(buf, hat(0.05), tb + BEAT / 2, 0.3)
                add(buf, hat(0.03), tb, 0.3)
            for k, step in enumerate([0, 0, 7, 0, 12, 0, 7, 5]):  # Bass in Achteln
                if t0 + k * BEAT / 2 >= fin - 0.05:
                    break
                add(buf, bass(hz(root - 24 + step), BEAT / 2, 0.22), t0 + k * BEAT / 2)
        elif b < intro:
            add(buf, hat(0.03, open_=True), t0 + 2 * BEAT, 0.3)
    # Schlussakkord
    add(buf, pad([hz(x) for x in (60, 64, 67, 72)], 2.6, 0.14), fin)
    add(buf, pluck(hz(84), 1.5, 0.12), fin)
    add(buf, bass(hz(36), 1.2, 0.25), fin)
    buf = buf[:, : int(length * SR)]
    # sanft ein- und ausblenden, leicht komprimieren
    f_in, f_out = int(0.4 * SR), int(1.6 * SR)
    buf[:, :f_in] *= np.linspace(0, 1, f_in)
    buf[:, -f_out:] *= np.linspace(1, 0, f_out) ** 1.5
    buf = np.tanh(buf * 1.3) / np.tanh(1.3)
    buf /= np.max(np.abs(buf)) / 0.89
    return buf


if __name__ == "__main__":
    length, out = float(sys.argv[1]), sys.argv[2]
    wavfile.write(out, SR, (make(length).T * 32767).astype(np.int16))
    print("Musik:", out, f"{length:.1f} s")
