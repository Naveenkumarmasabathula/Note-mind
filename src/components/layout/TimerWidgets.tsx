"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Pause, Play, RotateCcw } from "lucide-react";
import { useTimer } from "@/context/TimerContext";
import { cn } from "@/lib/utils";

const TIMER_VISIBILITY_KEY = "notemind_timer_visible";
const presets = [5, 10, 15, 25];

export function TimerWidgets() {
  const { stopwatch, timer } = useTimer();
  const [showWidgets, setShowWidgets] = useState(true);
  const [stopwatchOpen, setStopwatchOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);

  useEffect(() => {
    const stored = localStorage.getItem(TIMER_VISIBILITY_KEY);
    if (stored) setShowWidgets(stored === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem(TIMER_VISIBILITY_KEY, String(showWidgets));
  }, [showWidgets]);

  const stopwatchDisplay = formatShortStopwatch(stopwatch.elapsedMs);
  const timerDisplay = formatTimer(timer.remainingMs);
  const timerStatusColor = timer.isRunning
    ? timer.remainingMs <= 60_000
      ? "bg-red-500"
      : "bg-orange-400"
    : "bg-neutral-500";

  const timerProgress = timer.totalMs ? timer.remainingMs / timer.totalMs : 0;
  const circumference = 2 * Math.PI * 52;

  const recentLaps = useMemo(() => stopwatch.laps.slice(0, 3), [stopwatch.laps]);

  if (!showWidgets) {
    return (
      <button
        className="grid size-9 place-items-center rounded-md border border-[#2e2e2e] text-neutral-300 transition hover:border-indigo-500 hover:text-white"
        onClick={() => setShowWidgets(true)}
        title="Show timer"
        type="button"
      >
        <Eye className="size-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="flex items-center gap-2 rounded-full border border-[#2e2e2e] bg-[#12121a] px-3 py-1.5 text-xs font-semibold text-neutral-200 transition hover:border-indigo-500"
        onClick={() => setStopwatchOpen((open) => !open)}
        type="button"
      >
        <span className={cn("size-2 rounded-full", stopwatch.isRunning ? "bg-emerald-400" : "bg-neutral-500")} />
        <span className="font-mono tabular-nums">{stopwatchDisplay}</span>
      </button>

      <button
        className="flex items-center gap-2 rounded-full border border-[#2e2e2e] bg-[#12121a] px-3 py-1.5 text-xs font-semibold text-neutral-200 transition hover:border-indigo-500"
        onClick={() => setTimerOpen((open) => !open)}
        type="button"
      >
        <span className={cn("size-2 rounded-full", timerStatusColor)} />
        <span className="font-mono tabular-nums">{timerDisplay}</span>
      </button>

      <button
        className="grid size-9 place-items-center rounded-md border border-[#2e2e2e] text-neutral-300 transition hover:border-indigo-500 hover:text-white"
        onClick={() => setShowWidgets(false)}
        title="Hide timer"
        type="button"
      >
        <EyeOff className="size-4" />
      </button>

      {stopwatchOpen ? (
        <div className="fixed right-6 top-20 z-40 w-72 rounded-lg border border-[#2e2e2e] bg-[#12121a] p-4 shadow-xl">
          <div className="text-center">
            <p className="font-mono text-3xl font-semibold tabular-nums">{formatLongStopwatch(stopwatch.elapsedMs)}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
              onClick={stopwatch.isRunning ? stopwatch.pause : stopwatch.start}
              type="button"
            >
              {stopwatch.isRunning ? "Pause" : "Start"}
            </button>
            <button
              className="rounded-md border border-[#2e2e2e] px-3 py-2 text-xs text-neutral-300 transition hover:border-indigo-500 hover:text-white"
              onClick={stopwatch.reset}
              type="button"
            >
              Reset
            </button>
            <button
              className="rounded-md border border-[#2e2e2e] px-3 py-2 text-xs text-neutral-300 transition hover:border-indigo-500 hover:text-white"
              disabled={!stopwatch.elapsedMs}
              onClick={stopwatch.lap}
              type="button"
            >
              Lap
            </button>
          </div>
          <div className="mt-4 max-h-24 space-y-2 overflow-y-auto text-xs text-neutral-300">
            {recentLaps.length ? (
              recentLaps.map((lap) => (
                <div className="flex items-center justify-between rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-2 py-1" key={lap.lapNumber}>
                  <span>Lap {lap.lapNumber}</span>
                  <span className="font-mono">{formatShortStopwatch(lap.lapTimeMs)}</span>
                </div>
              ))
            ) : (
              <p className="text-neutral-500">No laps yet.</p>
            )}
          </div>
          <Link className="mt-3 block text-xs text-indigo-300 hover:text-indigo-200" href="/revision">
            Open full page
          </Link>
        </div>
      ) : null}

      {timerOpen ? (
        <div className="fixed right-6 top-20 z-40 w-72 rounded-lg border border-[#2e2e2e] bg-[#12121a] p-4 shadow-xl">
          <div className="mx-auto flex items-center justify-center">
            <div className="relative size-32">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" fill="none" r="52" stroke="#2e2e2e" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  fill="none"
                  r="52"
                  stroke="#6366f1"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - timerProgress)}
                  strokeLinecap="round"
                  strokeWidth="10"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="font-mono text-xl font-semibold tabular-nums">{formatTimer(timer.remainingMs)}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {presets.map((minutes) => (
              <button
                className="rounded-full border border-[#2e2e2e] px-2 py-1 text-xs text-neutral-300 transition hover:border-indigo-500 hover:text-white"
                key={minutes}
                onClick={() => timer.setDuration(minutes)}
                type="button"
              >
                {minutes}m
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <input
              className="h-9 rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-2 text-xs text-white outline-none focus:border-indigo-500"
              min={1}
              onChange={(event) => setCustomMinutes(Number(event.target.value))}
              type="number"
              value={customMinutes}
            />
            <button
              className="rounded-md border border-[#2e2e2e] px-3 text-xs text-neutral-300 transition hover:border-indigo-500 hover:text-white"
              onClick={() => timer.setDuration(customMinutes)}
              type="button"
            >
              Set
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
              onClick={timer.isRunning ? timer.pause : timer.start}
              type="button"
            >
              {timer.isRunning ? <Pause className="size-3" /> : <Play className="size-3" />}
              {timer.isRunning ? "Pause" : "Start"}
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded-md border border-[#2e2e2e] px-3 py-2 text-xs text-neutral-300 transition hover:border-indigo-500 hover:text-white"
              onClick={timer.reset}
              type="button"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          </div>

          <Link className="mt-3 block text-xs text-indigo-300 hover:text-indigo-200" href="/revision">
            Open full page
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function formatShortStopwatch(ms: number) {
  const centiseconds = Math.floor((ms % 1000) / 10);
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}

function formatLongStopwatch(ms: number) {
  const centiseconds = Math.floor((ms % 1000) / 10);
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}

function formatTimer(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
