"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, TimerReset } from "lucide-react";

const presets = [5, 10, 15, 25, 45, 60];

type Lap = {
  id: number;
  lapTime: number;
  totalTime: number;
};

export default function RevisionPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-[#0f0f0f] px-4 py-6 text-white sm:px-6 xl:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Revision timer</h1>
        <p className="mt-1 text-sm text-neutral-400">Stopwatch and countdown tools for focused study sessions.</p>
      </div>
      <div className="grid flex-1 min-h-0 gap-5 xl:grid-cols-2">
        <StopwatchPanel />
        <TimerPanel />
      </div>
    </main>
  );
}

function StopwatchPanel() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastLapRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);

  useEffect(() => () => clearCurrentInterval(intervalRef), []);

  function startPause() {
    if (running) {
      clearCurrentInterval(intervalRef);
      elapsedRef.current = elapsed;
      setRunning(false);
      return;
    }

    startRef.current = Date.now() - elapsedRef.current;
    intervalRef.current = setInterval(() => {
      const next = Date.now() - startRef.current;
      elapsedRef.current = next;
      setElapsed(next);
    }, 35);
    setRunning(true);
  }

  function reset() {
    clearCurrentInterval(intervalRef);
    startRef.current = 0;
    elapsedRef.current = 0;
    lastLapRef.current = 0;
    setElapsed(0);
    setRunning(false);
    setLaps([]);
  }

  function lap() {
    const lapTime = elapsed - lastLapRef.current;
    lastLapRef.current = elapsed;
    setLaps((current) => [{ id: current.length + 1, lapTime, totalTime: elapsed }, ...current]);
  }

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-[#2e2e2e] bg-[#1a1a2e] p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Stopwatch</h2>
        <TimerReset className="size-5 text-indigo-300" />
      </div>
      <div className="rounded-lg border border-[#2e2e2e] bg-[#0f0f0f] px-4 py-8 text-center">
        <p className="font-mono text-4xl font-semibold tabular-nums sm:text-5xl">{formatStopwatch(elapsed)}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <button
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-500 active:scale-[0.99]"
          onClick={startPause}
        >
          {running ? "Pause" : "Start"}
        </button>
        <button
          className="rounded-md border border-[#2e2e2e] px-4 py-2 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white"
          onClick={reset}
        >
          Reset
        </button>
        <button
          className="rounded-md border border-[#2e2e2e] px-4 py-2 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white disabled:opacity-60"
          onClick={lap}
          disabled={!elapsed}
        >
          Lap
        </button>
      </div>
      <div className="mt-5 flex-1 space-y-2 overflow-y-auto">
        {laps.map((lap) => (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-3 rounded-md border border-[#2e2e2e] bg-[#111118] px-3 py-2 text-sm text-neutral-300"
            initial={{ opacity: 0, x: -20 }}
            key={lap.id}
          >
            <span>Lap {lap.id}</span>
            <span className="font-mono">{formatStopwatch(lap.lapTime)}</span>
            <span className="font-mono text-right">{formatStopwatch(lap.totalTime)}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function TimerPanel() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialRef = useRef(25 * 60);
  const endRef = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [finished, setFinished] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => () => clearCurrentInterval(intervalRef), []);

  function setMinutes(minutes: number) {
    clearCurrentInterval(intervalRef);
    const seconds = Math.max(1, minutes) * 60;
    initialRef.current = seconds;
    setSecondsLeft(seconds);
    setRunning(false);
    setFinished(false);
  }

  function startPause() {
    if (running) {
      clearCurrentInterval(intervalRef);
      setRunning(false);
      return;
    }

    setFinished(false);
    endRef.current = Date.now() + secondsLeft * 1000;
    intervalRef.current = setInterval(() => {
      const next = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
      setSecondsLeft(next);
      if (next === 0) {
        clearCurrentInterval(intervalRef);
        setRunning(false);
        setFinished(true);
        setToast(true);
        playBeep();
        window.setTimeout(() => setToast(false), 2600);
      }
    }, 250);
    setRunning(true);
  }

  function reset() {
    clearCurrentInterval(intervalRef);
    setSecondsLeft(initialRef.current);
    setRunning(false);
    setFinished(false);
  }

  const circumference = 2 * Math.PI * 92;
  const progress = initialRef.current ? secondsLeft / initialRef.current : 0;

  return (
    <section
      className={
        finished
          ? "relative flex min-h-0 flex-col rounded-lg border border-red-500/60 bg-[#1a1a2e] p-5 ring-4 ring-red-500/30 animate-pulse"
          : "relative flex min-h-0 flex-col rounded-lg border border-[#2e2e2e] bg-[#1a1a2e] p-5"
      }
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Timer</h2>
        <RotateCcw className="size-5 text-indigo-300" />
      </div>
      <div className="flex items-center justify-center">
        <div className="relative mx-auto grid size-56 place-items-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 220 220">
            <circle cx="110" cy="110" fill="none" r="92" stroke="#2e2e2e" strokeWidth="12" />
            <motion.circle
              animate={{ strokeDashoffset: circumference * (1 - progress) }}
              cx="110"
              cy="110"
              fill="none"
              r="92"
              stroke="#6366f1"
              strokeDasharray={circumference}
              strokeLinecap="round"
              strokeWidth="12"
              transition={{ duration: 0.25 }}
            />
          </svg>
          <p
            className={
              finished
                ? "font-mono text-5xl font-semibold tabular-nums text-red-400 animate-pulse"
                : "font-mono text-5xl font-semibold tabular-nums"
            }
          >
            {formatTimer(secondsLeft)}
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {presets.map((minutes) => (
          <button
            className="rounded-full border border-[#2e2e2e] px-3 py-2 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white active:scale-[0.99]"
            key={minutes}
            onClick={() => setMinutes(minutes)}
          >
            {minutes} min
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <input
          className="h-10 rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-indigo-500"
          min={1}
          onChange={(event) => setCustomMinutes(Number(event.target.value))}
          type="number"
          value={customMinutes}
        />
        <button
          className="rounded-md border border-[#2e2e2e] px-4 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white active:scale-[0.99]"
          onClick={() => setMinutes(customMinutes)}
        >
          Set
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-60"
          onClick={startPause}
          disabled={!secondsLeft}
        >
          {running ? "Pause" : "Start"}
        </button>
        <button
          className="rounded-md border border-[#2e2e2e] px-4 py-2 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white"
          onClick={reset}
        >
          Reset
        </button>
      </div>
      {toast ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-5 top-5 rounded-md bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-lg"
          initial={{ opacity: 0, y: -10 }}
        >
          Time&apos;s up!
        </motion.div>
      ) : null}
    </section>
  );
}

function formatStopwatch(ms: number) {
  const centiseconds = Math.floor((ms % 1000) / 10);
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(centiseconds)}`;
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function playBeep() {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.05;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);

    oscillator.onended = () => {
      audioContext.close().catch(() => null);
    };
  } catch {
    // Audio playback can be blocked by autoplay policies.
  }
}

function clearCurrentInterval(ref: React.MutableRefObject<ReturnType<typeof setInterval> | null>) {
  if (ref.current) clearInterval(ref.current);
  ref.current = null;
}
