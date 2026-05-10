"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error(error.message || "Something went wrong.");
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f0f0f] px-4 text-[#f0f0f0]">
      <div className="w-full max-w-lg rounded-lg border border-[#2e2e2e] bg-[#111111] p-6 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-neutral-400">
          We hit an unexpected error while loading your data. Try again, or sign in once more if the session expired.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            className="rounded-md border border-[#2e2e2e] px-4 py-2 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white"
            onClick={reset}
            type="button"
          >
            Retry
          </button>
          <a
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.99]"
            href="/login"
          >
            Go to login
          </a>
        </div>
      </div>
    </main>
  );
}
