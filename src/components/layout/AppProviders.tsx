"use client";

import { Toaster } from "sonner";
import { QuickCaptureModal } from "@/components/notes/QuickCaptureModal";
import { TimerProvider } from "@/context/TimerContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TimerProvider>
      {children}
      <QuickCaptureModal />
      <Toaster position="top-right" richColors closeButton />
    </TimerProvider>
  );
}
