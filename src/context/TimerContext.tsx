"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Lap = {
  lapNumber: number;
  lapTimeMs: number;
  totalTimeMs: number;
};

type StopwatchState = {
  isRunning: boolean;
  elapsedMs: number;
  laps: Lap[];
  startedAt: number | null;
  start: () => void;
  pause: () => void;
  reset: () => void;
  lap: () => void;
};

type TimerState = {
  isRunning: boolean;
  totalMs: number;
  remainingMs: number;
  startedAt: number | null;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setDuration: (minutes: number) => void;
};

type TimerContextValue = {
  stopwatch: StopwatchState;
  timer: TimerState;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopwatchStartRef = useRef<number | null>(null);
  const timerStartRef = useRef<number | null>(null);
  const lastLapRef = useRef(0);

  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [laps, setLaps] = useState<Lap[]>([]);

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTotalMs, setTimerTotalMs] = useState(25 * 60 * 1000);
  const [timerRemainingMs, setTimerRemainingMs] = useState(25 * 60 * 1000);

  const clearIntervalRef = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const handleTimerComplete = useCallback(() => {
    toast.success("Timer complete!");
    playBeep();
  }, []);

  useEffect(() => {
    if (!stopwatchRunning && !timerRunning) {
      clearIntervalRef();
      return;
    }

    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();

        if (stopwatchRunning && stopwatchStartRef.current !== null) {
          setElapsedMs(now - stopwatchStartRef.current);
        }

        if (timerRunning && timerStartRef.current !== null) {
          const remaining = Math.max(0, timerTotalMs - (now - timerStartRef.current));
          setTimerRemainingMs(remaining);
          if (remaining === 0) {
            setTimerRunning(false);
            timerStartRef.current = null;
            handleTimerComplete();
          }
        }
      }, 10);
    }

    return () => {
      if (!stopwatchRunning && !timerRunning) clearIntervalRef();
    };
  }, [clearIntervalRef, handleTimerComplete, stopwatchRunning, timerRunning, timerTotalMs]);

  const startStopwatch = useCallback(() => {
    if (stopwatchRunning) return;
    stopwatchStartRef.current = Date.now() - elapsedMs;
    setStopwatchRunning(true);
  }, [elapsedMs, stopwatchRunning]);

  const pauseStopwatch = useCallback(() => {
    if (!stopwatchRunning) return;
    setStopwatchRunning(false);
  }, [stopwatchRunning]);

  const resetStopwatch = useCallback(() => {
    setStopwatchRunning(false);
    setElapsedMs(0);
    setLaps([]);
    lastLapRef.current = 0;
    stopwatchStartRef.current = null;
  }, []);

  const lapStopwatch = useCallback(() => {
    if (!elapsedMs) return;
    const lapTimeMs = elapsedMs - lastLapRef.current;
    lastLapRef.current = elapsedMs;
    setLaps((current) => [
      { lapNumber: current.length + 1, lapTimeMs, totalTimeMs: elapsedMs },
      ...current,
    ]);
  }, [elapsedMs]);

  const startTimer = useCallback(() => {
    if (timerRunning || timerRemainingMs <= 0) return;
    timerStartRef.current = Date.now();
    setTimerRunning(true);
  }, [timerRemainingMs, timerRunning]);

  const pauseTimer = useCallback(() => {
    if (!timerRunning || timerStartRef.current === null) return;
    const remaining = Math.max(0, timerTotalMs - (Date.now() - timerStartRef.current));
    setTimerRemainingMs(remaining);
    setTimerRunning(false);
    timerStartRef.current = null;
  }, [timerRunning, timerTotalMs]);

  const resetTimer = useCallback(() => {
    setTimerRunning(false);
    setTimerRemainingMs(timerTotalMs);
    timerStartRef.current = null;
  }, [timerTotalMs]);

  const setDuration = useCallback((minutes: number) => {
    const nextTotal = Math.max(1, Math.round(minutes)) * 60 * 1000;
    setTimerTotalMs(nextTotal);
    setTimerRemainingMs(nextTotal);
    setTimerRunning(false);
    timerStartRef.current = null;
  }, []);

  const value = useMemo<TimerContextValue>(
    () => ({
      stopwatch: {
        isRunning: stopwatchRunning,
        elapsedMs,
        laps,
        startedAt: stopwatchStartRef.current,
        start: startStopwatch,
        pause: pauseStopwatch,
        reset: resetStopwatch,
        lap: lapStopwatch,
      },
      timer: {
        isRunning: timerRunning,
        totalMs: timerTotalMs,
        remainingMs: timerRemainingMs,
        startedAt: timerStartRef.current,
        start: startTimer,
        pause: pauseTimer,
        reset: resetTimer,
        setDuration,
      },
    }),
    [
      elapsedMs,
      laps,
      pauseStopwatch,
      pauseTimer,
      resetStopwatch,
      resetTimer,
      setDuration,
      startStopwatch,
      startTimer,
      stopwatchRunning,
      timerRemainingMs,
      timerRunning,
      timerTotalMs,
      lapStopwatch,
    ],
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) throw new Error("useTimer must be used within TimerProvider");
  return context;
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
