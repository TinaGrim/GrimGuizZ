// Synthesized sound effects for the student quiz, generated with the Web
// Audio API so no audio files or network requests are needed. Playback is
// gated by a mute flag persisted across sessions (classrooms may want it off).

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem("quizz:sounds-muted") === "1";
} catch {
  muted = false;
}

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function tone(opts: {
  freq: number;
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  glideTo?: number;
}) {
  if (muted) return;
  const c = audioContext();
  if (!c) return;
  const { freq, at = 0, dur = 0.2, type = "sine", gain = 0.15, glideTo } = opts;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp);
  amp.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function note(freq: number, at: number, dur = 0.18, gain = 0.16) {
  tone({ freq, at, dur, gain });
}

export const Sounds = {
  isMuted() {
    return muted;
  },
  setMuted(m: boolean) {
    muted = m;
    try {
      localStorage.setItem("quizz:sounds-muted", m ? "1" : "0");
    } catch {
      // ignore — storage unavailable
    }
  },
  // Short wooden tap when an option is picked.
  click() {
    tone({ freq: 700, dur: 0.1, type: "sine", gain: 0.14, glideTo: 520 });
  },
  // Light tick as the wheel spins past segments.
  tick() {
    tone({ freq: 980, dur: 0.03, type: "square", gain: 0.03 });
  },
  // Two-note win when the wheel stops.
  land() {
    note(659.25, 0, 0.16, 0.16);
    note(987.77, 0.12, 0.28, 0.16);
  },
  // Rising major arpeggio for a correct answer.
  correct() {
    note(523.25, 0, 0.14);
    note(659.25, 0.1, 0.14);
    note(783.99, 0.2, 0.26);
  },
  // Low buzz for a wrong answer.
  wrong() {
    tone({ freq: 200, dur: 0.28, type: "sawtooth", gain: 0.1, glideTo: 130 });
  },
  // Sad descending slide for the third-miss troll.
  troll() {
    note(311.13, 0, 0.4, 0.12);
    tone({
      freq: 233.08,
      at: 0.32,
      dur: 0.6,
      type: "sawtooth",
      gain: 0.1,
      glideTo: 116.54,
    });
  },
  // Sharp double-ping when the timer runs out.
  timeUp() {
    note(587.33, 0, 0.14, 0.12);
    note(587.33, 0.16, 0.3, 0.12);
  },
  // Score-tuned fanfare on the results page, tiered to match the headings.
  fanfare(pct: number) {
    if (pct === 1) {
      note(523.25, 0, 0.16);
      note(659.25, 0.12, 0.16);
      note(783.99, 0.24, 0.16);
      note(1046.5, 0.36, 0.42, 0.18);
    } else if (pct >= 0.67) {
      note(523.25, 0, 0.16);
      note(659.25, 0.12, 0.16);
      note(783.99, 0.24, 0.36);
    } else if (pct >= 0.34) {
      note(440, 0, 0.14, 0.12);
      note(587.33, 0.12, 0.2, 0.12);
    } else {
      note(261.63, 0, 0.3, 0.12);
      note(196.0, 0.28, 0.4, 0.12);
    }
  },
};