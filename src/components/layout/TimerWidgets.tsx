"use client";

import { useTimer } from "@/context/TimerContext";
import { Play, Pause, RotateCcw } from "lucide-react";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TimerWidgets() {
  const { timer, stopwatch } = useTimer();

  // Show timer if it's running or has time remaining, otherwise show stopwatch
  const isTimerActive = timer.isRunning || timer.remainingMs > 0;

  if (isTimerActive) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-[#2e2e2e] bg-[#1a1a2e] px-3 py-2">
        <div className="flex flex-col">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Timer</p>
          <p className="text-lg font-semibold text-white">{formatTime(timer.remainingMs)}</p>
        </div>
        <div className="flex gap-1 ml-2">
          {!timer.isRunning ? (
            <button
              onClick={timer.start}
              className="p-1 hover:bg-white/10 rounded transition"
              title="Start timer"
            >
              <Play className="size-4 text-neutral-400 hover:text-white" />
            </button>
          ) : (
            <button
              onClick={timer.pause}
              className="p-1 hover:bg-white/10 rounded transition"
              title="Pause timer"
            >
              <Pause className="size-4 text-neutral-400 hover:text-white" />
            </button>
          )}
          <button
            onClick={timer.reset}
            className="p-1 hover:bg-white/10 rounded transition"
            title="Reset timer"
          >
            <RotateCcw className="size-4 text-neutral-400 hover:text-white" />
          </button>
        </div>
      </div>
    );
  }

  if (stopwatch.isRunning || stopwatch.elapsedMs > 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-[#2e2e2e] bg-[#1a1a2e] px-3 py-2">
        <div className="flex flex-col">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Stopwatch</p>
          <p className="text-lg font-semibold text-white">{formatTime(stopwatch.elapsedMs)}</p>
        </div>
        <div className="flex gap-1 ml-2">
          {!stopwatch.isRunning ? (
            <button
              onClick={stopwatch.start}
              className="p-1 hover:bg-white/10 rounded transition"
              title="Start stopwatch"
            >
              <Play className="size-4 text-neutral-400 hover:text-white" />
            </button>
          ) : (
            <button
              onClick={stopwatch.pause}
              className="p-1 hover:bg-white/10 rounded transition"
              title="Pause stopwatch"
            >
              <Pause className="size-4 text-neutral-400 hover:text-white" />
            </button>
          )}
          <button
            onClick={stopwatch.reset}
            className="p-1 hover:bg-white/10 rounded transition"
            title="Reset stopwatch"
          >
            <RotateCcw className="size-4 text-neutral-400 hover:text-white" />
          </button>
        </div>
      </div>
    );
  }

  // Return null if neither timer nor stopwatch is active
  return null;
}
