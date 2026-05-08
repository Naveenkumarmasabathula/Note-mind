"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";
import ShinyText from "@/components/ShinyText";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setIsPending(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.08),transparent_55%),#0f0f0f] px-4">
      <section className="w-full max-w-[400px] rounded-lg border border-[#2e2e2e] bg-[#111111]/95 p-8 shadow-xl shadow-black/40 backdrop-blur">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-md bg-[#0f0f0f] text-white">
            <BrainCircuit className="size-5" />
          </div>
          <div>
            <ShinyText
              text="NoteMind"
              className="text-2xl font-semibold"
              color="#f0f0f0"
              shineColor="#6366f1"
            />
            <p className="text-sm text-neutral-400">
              {mode === "login" ? "Welcome back to your study dashboard." : "Create your study workspace."}
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-neutral-200">
            Email
            <input
              className="mt-2 h-11 w-full rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-3 text-white outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-neutral-200">
            Password
            <input
              className="mt-2 h-11 w-full rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-3 text-white outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          {message ? <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-200">{message}</p> : null}

          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-400">
          {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
          <Link className="font-medium text-indigo-300 hover:text-indigo-200" href={mode === "login" ? "/signup" : "/login"}>
            {mode === "login" ? "Sign up" : "Log in"}
          </Link>
        </p>
      </section>
    </main>
  );
}
