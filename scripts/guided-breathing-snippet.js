rf = [
  {
    id: "calm",
    name: "Calm",
    detail: "4 in · 6 out",
    phases: [
      { phase: "inhale", duration: 4, label: "Breathe In", sub: "slowly through your nose" },
      { phase: "exhale", duration: 6, label: "Breathe Out", sub: "long and easy" },
    ],
  },
  {
    id: "box",
    name: "Box",
    detail: "4 · 4 · 4 · 4",
    phases: [
      { phase: "inhale", duration: 4, label: "Breathe In", sub: "slow and steady" },
      { phase: "hold-in", duration: 4, label: "Hold", sub: "stay relaxed" },
      { phase: "exhale", duration: 4, label: "Breathe Out", sub: "slow and steady" },
      { phase: "hold-out", duration: 4, label: "Rest", sub: "stay empty" },
    ],
  },
  {
    id: "relax",
    name: "Deep Relax",
    detail: "4 · 4 · 6 · 2",
    phases: [
      { phase: "inhale", duration: 4, label: "Breathe In", sub: "slowly through your nose" },
      { phase: "hold-in", duration: 4, label: "Hold", sub: "gently" },
      { phase: "exhale", duration: 6, label: "Breathe Out", sub: "slowly through your mouth" },
      { phase: "hold-out", duration: 2, label: "Rest", sub: "let it all go" },
    ],
  },
  {
    id: "craving",
    name: "Craving Reset",
    detail: "60 seconds",
    fixedDuration: 60,
    phases: [
      { phase: "inhale", duration: 4, label: "Breathe In", sub: "this moment will pass" },
      { phase: "exhale", duration: 6, label: "Breathe Out", sub: "release the urge" },
    ],
  },
],
  S4 = [60, 180, 300, 600],
  wfSoothingVoiceCuesV4 = {
    "Breathe In": "/audio/breathing/breathe-in.m4a",
    "Breathe Out": "/audio/breathing/breathe-out.m4a",
    Hold: "/audio/breathing/hold.m4a",
    Rest: "/audio/breathing/rest.m4a",
    "Breathing session complete": "/audio/breathing/session-complete.m4a",
  };

function j4() {
  const readPreference = (key, fallback) => {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch {
        return fallback;
      }
    },
    [running, setRunning] = x.useState(false),
    [patternId, setPatternId] = x.useState(() => readPreference("wfBreathPattern", "calm")),
    [sessionSeconds, setSessionSeconds] = x.useState(() => Number(readPreference("wfBreathDuration", "180")) || 180),
    [elapsed, setElapsed] = x.useState(0),
    [hapticsOn, setHapticsOn] = x.useState(() => readPreference("wfBreathHaptics", "on") !== "off"),
    [voiceOn, setVoiceOn] = x.useState(() => readPreference("wfBreathSoothingVoiceV4", "on") !== "off"),
    [complete, setComplete] = x.useState(false),
    [reducedMotion] = x.useState(() => {
      try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch {
        return false;
      }
    }),
    frameRef = x.useRef(null),
    startedAtRef = x.useRef(0),
    baseElapsedRef = x.useRef(0),
    wakeLockRef = x.useRef(null),
    audioCacheRef = x.useRef({}),
    lastPhaseRef = x.useRef(-1),
    pattern = rf.find((item) => item.id === patternId) || rf[0],
    totalSeconds = pattern.fixedDuration || sessionSeconds,
    cycleSeconds = pattern.phases.reduce((sum, item) => sum + item.duration, 0),
    cyclePosition = cycleSeconds > 0 ? elapsed % cycleSeconds : 0;

  let phaseIndex = 0,
    phase = pattern.phases[0],
    phaseElapsed = cyclePosition,
    cursor = 0;
  for (let index = 0; index < pattern.phases.length; index += 1) {
    const candidate = pattern.phases[index];
    if (cyclePosition < cursor + candidate.duration) {
      phaseIndex = index;
      phase = candidate;
      phaseElapsed = cyclePosition - cursor;
      break;
    }
    cursor += candidate.duration;
  }

  const phaseProgress = Math.max(0, Math.min(1, phaseElapsed / phase.duration)),
    countdown = Math.max(1, Math.ceil(phase.duration - phaseElapsed)),
    remaining = Math.max(0, Math.ceil(totalSeconds - elapsed)),
    minutes = Math.floor(remaining / 60),
    seconds = remaining % 60,
    progress = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 0,
    cycles = Math.floor(elapsed / cycleSeconds),
    releaseWakeLock = x.useCallback(async () => {
      try {
        if (wakeLockRef.current) await wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }, []),
    requestWakeLock = x.useCallback(async () => {
      try {
        if ("wakeLock" in navigator) wakeLockRef.current = await navigator.wakeLock.request("screen");
      } catch {}
    }, []),
    playHaptic = x.useCallback(
      async (style = "LIGHT") => {
        if (!hapticsOn) return;
        try {
          const haptics = window.Capacitor?.Plugins?.Haptics;
          if (haptics?.impact) await haptics.impact({ style });
        } catch {}
      },
      [hapticsOn],
    ),
    stopVoice = x.useCallback(async () => {
      try {
        Object.values(audioCacheRef.current).forEach((audio) => {
          audio.pause();
          audio.currentTime = 0;
        });
      } catch {}
      try {
        const nativeSpeech = window.Capacitor?.Plugins?.TextToSpeech;
        if (nativeSpeech?.stop) await nativeSpeech.stop();
      } catch {}
      try {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      } catch {}
    }, []),
    speak = x.useCallback(
      async (message) => {
        if (!voiceOn) return;
        const recordedCue = wfSoothingVoiceCuesV4[message];
        if (recordedCue) {
          try {
            Object.values(audioCacheRef.current).forEach((audio) => {
              audio.pause();
              audio.currentTime = 0;
            });
            let audio = audioCacheRef.current[recordedCue];
            if (!audio) {
              audio = new Audio(recordedCue);
              audio.preload = "auto";
              audioCacheRef.current[recordedCue] = audio;
            }
            audio.currentTime = 0;
            audio.volume = 0.92;
            await audio.play();
            return;
          } catch {}
        }
        try {
          const nativeSpeech = window.Capacitor?.Plugins?.TextToSpeech;
          if (nativeSpeech?.speak) {
            try {
              await nativeSpeech.stop();
            } catch {}
            await nativeSpeech.speak({
              text: message,
              lang: "en-US",
              rate: 0.82,
              pitch: 1,
              volume: 1,
              category: "playback",
              queueStrategy: 0,
            });
            return;
          }
          if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const cue = new SpeechSynthesisUtterance(message);
            cue.rate = 0.86;
            cue.pitch = 0.95;
            cue.volume = 0.8;
            window.speechSynthesis.speak(cue);
          }
        } catch {}
      },
      [voiceOn],
    );

  x.useEffect(() => {
    try {
      Object.values(wfSoothingVoiceCuesV4).forEach((source) => {
        const audio = new Audio(source);
        audio.preload = "auto";
        audioCacheRef.current[source] = audio;
        audio.load();
      });
    } catch {}
    return () => {
      try {
        Object.values(audioCacheRef.current).forEach((audio) => audio.pause());
        audioCacheRef.current = {};
      } catch {}
    };
  }, []);

  x.useEffect(() => {
    try {
      localStorage.setItem("wfBreathPattern", patternId);
      localStorage.setItem("wfBreathDuration", String(sessionSeconds));
      localStorage.setItem("wfBreathHaptics", hapticsOn ? "on" : "off");
      localStorage.setItem("wfBreathSoothingVoiceV4", voiceOn ? "on" : "off");
    } catch {}
  }, [patternId, sessionSeconds, hapticsOn, voiceOn]);

  x.useEffect(() => {
    if (!running) return;
    startedAtRef.current = performance.now();
    const tick = (now) => {
      const next = Math.min(totalSeconds, baseElapsedRef.current + (now - startedAtRef.current) / 1000);
      setElapsed(next);
      if (next >= totalSeconds) {
        baseElapsedRef.current = totalSeconds;
        setRunning(false);
        setComplete(true);
        releaseWakeLock();
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [running, totalSeconds, releaseWakeLock]);

  x.useEffect(() => {
    if (!running || lastPhaseRef.current === phaseIndex) return;
    lastPhaseRef.current = phaseIndex;
    playHaptic(phase.phase === "exhale" ? "MEDIUM" : "LIGHT");
    speak(phase.label);
  }, [running, phaseIndex, phase.phase, phase.label, playHaptic, speak]);

  x.useEffect(() => {
    if (!complete) return;
    playHaptic("HEAVY");
    speak("Breathing session complete");
  }, [complete, playHaptic, speak]);

  x.useEffect(() => {
    if (!voiceOn) stopVoice();
  }, [voiceOn, stopVoice]);

  x.useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    releaseWakeLock();
    stopVoice();
  }, [releaseWakeLock, stopVoice]);

  const reset = () => {
      setRunning(false);
      setElapsed(0);
      baseElapsedRef.current = 0;
      lastPhaseRef.current = -1;
      setComplete(false);
      releaseWakeLock();
      stopVoice();
    },
    choosePattern = (id) => {
      setPatternId(id);
      setRunning(false);
      setElapsed(0);
      baseElapsedRef.current = 0;
      lastPhaseRef.current = -1;
      setComplete(false);
      releaseWakeLock();
      stopVoice();
    },
    chooseDuration = (duration) => {
      setSessionSeconds(duration);
      setRunning(false);
      setElapsed(0);
      baseElapsedRef.current = 0;
      lastPhaseRef.current = -1;
      setComplete(false);
      releaseWakeLock();
      stopVoice();
    },
    toggleRunning = () => {
      if (running) {
        baseElapsedRef.current = elapsed;
        setRunning(false);
        releaseWakeLock();
        stopVoice();
        return;
      }
      if (elapsed >= totalSeconds) {
        baseElapsedRef.current = 0;
        setElapsed(0);
        setComplete(false);
        lastPhaseRef.current = -1;
      } else {
        baseElapsedRef.current = elapsed;
        lastPhaseRef.current = phaseIndex;
        playHaptic(phase.phase === "exhale" ? "MEDIUM" : "LIGHT");
        speak(phase.label);
      }
      requestWakeLock();
      setRunning(true);
    };

  let circleScale = 0.58,
    circleOpacity = 0.35;
  if (phase.phase === "inhale") {
    circleScale = 0.58 + phaseProgress * 0.42;
    circleOpacity = 0.35 + phaseProgress * 0.5;
  } else if (phase.phase === "hold-in") {
    circleScale = 1;
    circleOpacity = 0.85;
  } else if (phase.phase === "exhale") {
    circleScale = 1 - phaseProgress * 0.42;
    circleOpacity = 0.85 - phaseProgress * 0.5;
  }
  if (reducedMotion) circleScale = 0.82;

  return c.jsxs("div", {
    className: "rounded-[2rem] bg-card/80 border border-border/60 overflow-hidden",
    children: [
      c.jsx("div", {
        className: "px-6 pt-6 pb-4 border-b border-border/40",
        children: c.jsxs("div", {
          className: "flex items-center gap-3",
          children: [
            c.jsx("div", {
              className: "w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0",
              children: c.jsx(Tf, { size: 16, className: "text-primary" }),
            }),
            c.jsxs("div", {
              children: [
                c.jsx("h2", { className: "text-base font-medium text-foreground", children: "Guided Breathing" }),
                c.jsx("p", { className: "text-xs text-muted-foreground font-light", children: "Choose a pace and settle into this moment" }),
              ],
            }),
          ],
        }),
      }),
      c.jsxs("div", {
        className: "px-5 py-6 flex flex-col items-center",
        children: [
          c.jsx("div", {
            className: "w-full mb-5",
            style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.5rem" },
            children: rf.map((item) =>
              c.jsxs("button", {
                type: "button",
                onClick: () => choosePattern(item.id),
                "aria-pressed": patternId === item.id,
                className: `rounded-xl border px-3 py-3 text-left transition-colors ${patternId === item.id ? "border-primary bg-primary/10 text-foreground" : "border-border/60 bg-background/50 text-muted-foreground"}`,
                children: [
                  c.jsx("span", { className: "block text-xs font-medium", children: item.name }),
                  c.jsx("span", { className: "block text-[10px] font-light mt-0.5", children: item.detail }),
                ],
              }, item.id),
            ),
          }),
          !pattern.fixedDuration &&
            c.jsxs("div", {
              className: "w-full mb-5",
              children: [
                c.jsx("p", { className: "text-[10px] text-muted-foreground font-medium mb-2 text-center", children: "SESSION LENGTH" }),
                c.jsx("div", {
                  className: "flex items-center justify-center gap-2",
                  children: S4.map((duration) =>
                    c.jsx("button", {
                      type: "button",
                      onClick: () => chooseDuration(duration),
                      "aria-pressed": sessionSeconds === duration,
                      className: `h-9 px-3 rounded-full border text-xs font-medium transition-colors ${sessionSeconds === duration ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground"}`,
                      children: duration < 120 ? "1 min" : `${duration / 60} min`,
                    }, duration),
                  ),
                }),
              ],
            }),
          c.jsx("div", {
            className: "w-full flex items-center justify-center gap-2 mb-5",
            children: [
              c.jsx("button", {
                type: "button",
                onClick: () => setHapticsOn((value) => !value),
                "aria-pressed": hapticsOn,
                className: `h-9 px-4 rounded-full border text-xs transition-colors ${hapticsOn ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`,
                children: `Haptics ${hapticsOn ? "On" : "Off"}`,
              }),
              c.jsx("button", {
                type: "button",
                onClick: () => setVoiceOn((value) => !value),
                "aria-pressed": voiceOn,
                className: `h-9 px-4 rounded-full border text-xs transition-colors ${voiceOn ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`,
                children: `Voice Cues ${voiceOn ? "On" : "Off"}`,
              }),
            ],
          }),
          patternId === "craving" &&
            c.jsx("p", {
              className: "text-xs text-primary font-medium text-center mb-4 max-w-[200px]",
              children: "You don’t have to solve everything right now. Just breathe through this moment.",
            }),
          c.jsxs("div", {
            className: "relative w-48 h-48 flex items-center justify-center mb-6",
            role: "timer",
            "aria-live": "polite",
            "aria-label": complete ? "Breathing session complete" : `${phase.label}, ${countdown} seconds`,
            children: [
              c.jsx(Re.div, {
                className: "absolute inset-0 rounded-full border-2 border-primary/30",
                animate: { opacity: running ? circleOpacity : 0.18 },
                transition: { duration: reducedMotion ? 0 : 0.25 },
              }),
              c.jsx(Re.div, {
                className: "absolute inset-4 rounded-full bg-primary/8 blur-xl",
                animate: { scale: running ? circleScale : 0.64, opacity: running ? 0.65 : 0.2 },
                transition: { duration: reducedMotion ? 0 : 0.1 },
              }),
              c.jsx(Re.div, {
                className: "absolute inset-0 rounded-full bg-primary/12 border border-primary/20",
                animate: { scale: running ? circleScale : 0.64, opacity: running ? 1 : 0.45 },
                transition: { duration: reducedMotion ? 0 : 0.1 },
              }),
              c.jsx("div", {
                className: "relative z-10 text-center",
                children: complete
                  ? c.jsxs(c.Fragment, {
                      children: [
                        c.jsx("p", { className: "text-base font-medium text-foreground", children: "Complete" }),
                        c.jsx("p", { className: "text-[10px] text-muted-foreground mt-1", children: "You showed up for yourself" }),
                      ],
                    })
                  : running
                    ? c.jsxs(c.Fragment, {
                        children: [
                          c.jsx("p", { style: { fontSize: "2.25rem", lineHeight: 1 }, className: "font-medium text-foreground", children: countdown }),
                          c.jsx("p", { className: "text-sm font-medium text-foreground mt-2", children: phase.label }),
                          c.jsx("p", { className: "text-[10px] text-muted-foreground font-light mt-0.5", children: phase.sub }),
                        ],
                      })
                    : elapsed > 0
                      ? c.jsxs(c.Fragment, {
                          children: [
                            c.jsx("p", { className: "text-sm font-medium text-foreground", children: "Paused" }),
                            c.jsx("p", { className: "text-[10px] text-muted-foreground mt-1", children: "Resume when you’re ready" }),
                          ],
                        })
                      : c.jsxs(c.Fragment, {
                          children: [
                            c.jsx("p", { className: "text-sm font-medium text-foreground", children: pattern.name }),
                            c.jsx("p", { className: "text-[10px] text-muted-foreground mt-1", children: "Press play to begin" }),
                          ],
                        }),
              }),
            ],
          }),
          c.jsxs("div", {
            className: "w-full mb-5",
            children: [
              c.jsxs("div", {
                className: "flex items-center justify-between text-[10px] text-muted-foreground mb-2",
                children: [
                  c.jsx("span", { children: `${cycles} ${cycles === 1 ? "cycle" : "cycles"}` }),
                  c.jsx("span", { className: "font-medium text-foreground", children: `${minutes}:${String(seconds).padStart(2, "0")} remaining` }),
                ],
              }),
              c.jsx("div", {
                className: "h-2 w-full rounded-full bg-primary/10 overflow-hidden",
                children: c.jsx("div", {
                  className: "h-full rounded-full bg-primary transition-all",
                  style: { width: `${progress}%` },
                }),
              }),
            ],
          }),
          c.jsxs("div", {
            className: "flex items-center gap-4",
            children: [
              c.jsx("button", {
                type: "button",
                onClick: reset,
                "aria-label": "Reset breathing session",
                className: "w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-colors",
                children: c.jsx(BN, { size: 14 }),
              }),
              c.jsx("button", {
                type: "button",
                onClick: toggleRunning,
                "aria-label": running ? "Pause breathing session" : complete ? "Start another breathing session" : "Start breathing session",
                className: "w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors",
                children: running ? c.jsx(DN, { size: 20 }) : c.jsx(zN, { size: 20, className: "ml-0.5" }),
              }),
              c.jsx("div", { className: "w-10 h-10" }),
            ],
          }),
          c.jsx("p", {
            className: "text-[10px] text-muted-foreground font-light mt-5 text-center leading-relaxed max-w-[200px]",
            children: pattern.detail,
          }),
          c.jsx("p", {
            className: "text-[10px] text-muted-foreground/70 font-light mt-2 text-center leading-relaxed max-w-[200px]",
            children: "If you feel uncomfortable, pause and return to your normal breathing.",
          }),
        ],
      }),
    ],
  });
}
