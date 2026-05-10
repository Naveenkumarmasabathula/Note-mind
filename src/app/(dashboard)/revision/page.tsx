"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, TimerReset } from "lucide-react";
import { useTimer } from "@/context/TimerContext";

const presets = [5, 10, 15, 25, 45, 60];

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
  const { stopwatch } = useTimer();

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-[#2e2e2e] bg-[#1a1a2e] p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Stopwatch</h2>
        <TimerReset className="size-5 text-indigo-300" />
      </div>
      <div className="rounded-lg border border-[#2e2e2e] bg-[#0f0f0f] px-4 py-8 text-center">
        <p className="font-mono text-4xl font-semibold tabular-nums sm:text-5xl">
          {formatStopwatch(stopwatch.elapsedMs)}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <button
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-500 active:scale-[0.99]"
          onClick={stopwatch.isRunning ? stopwatch.pause : stopwatch.start}
          type="button"
        >
          {stopwatch.isRunning ? "Pause" : "Start"}
        </button>
        <button
          className="rounded-md border border-[#2e2e2e] px-4 py-2 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white"
          onClick={stopwatch.reset}
          type="button"
        >
          Reset
        </button>
        <button
          className="rounded-md border border-[#2e2e2e] px-4 py-2 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white disabled:opacity-60"
          onClick={stopwatch.lap}
          disabled={!stopwatch.elapsedMs}
          type="button"
        >
          Lap
        </button>
      </div>
      <div className="mt-5 flex-1 space-y-2 overflow-y-auto">
        {stopwatch.laps.map((lap) => (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-3 rounded-md border border-[#2e2e2e] bg-[#111118] px-3 py-2 text-sm text-neutral-300"
            initial={{ opacity: 0, x: -20 }}
            key={lap.lapNumber}
          >
            <span>Lap {lap.lapNumber}</span>
            <span className="font-mono">{formatStopwatch(lap.lapTimeMs)}</span>
            <span className="font-mono text-right">{formatStopwatch(lap.totalTimeMs)}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function TimerPanel() {
  const { timer } = useTimer();
  const [customMinutes, setCustomMinutes] = useState(Math.round(timer.totalMs / 60000));
  const totalSeconds = Math.ceil(timer.remainingMs / 1000);
  const finished = totalSeconds === 0;
  const progress = timer.totalMs ? timer.remainingMs / timer.totalMs : 0;
  const circumference = 2 * Math.PI * 92;

  useEffect(() => {
    setCustomMinutes(Math.round(timer.totalMs / 60000));
  }, [timer.totalMs]);

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
            {formatTimer(totalSeconds)}
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {presets.map((minutes) => (
          <button
            className="rounded-full border border-[#2e2e2e] px-3 py-2 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white active:scale-[0.99]"
            key={minutes}
            onClick={() => timer.setDuration(minutes)}
            type="button"
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
          onClick={() => timer.setDuration(customMinutes)}
          type="button"
        >
          Set
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-60"
          onClick={timer.isRunning ? timer.pause : timer.start}
          disabled={!timer.remainingMs}
          type="button"
        >
          {timer.isRunning ? "Pause" : "Start"}
        </button>
        <button
          className="rounded-md border border-[#2e2e2e] px-4 py-2 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white"
          onClick={timer.reset}
          type="button"
        >
          Reset
        </button>
      </div>
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
