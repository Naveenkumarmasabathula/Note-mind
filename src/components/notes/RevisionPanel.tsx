"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/animate-ui/components/radix/progress";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";

export function RevisionPanel({ note }: { note: Note }) {
  const router = useRouter();
  const supabase = createClient();
  const [score, setScore] = useState(3);
  const [isSaving, setIsSaving] = useState(false);
  const questions = note.revision_questions ?? [];

  async function saveRevision() {
    setIsSaving(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      await supabase.auth.signOut();
      setIsSaving(false);
      router.replace("/login");
      return;
    }
    const { error } = await supabase.from("revisions").insert({
      note_id: note.id,
      user_id: data.user.id,
      score,
      status: "reviewed",
      revised_at: new Date().toISOString(),
    });

    if (error) {
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    router.refresh();
  }

  return (
    <section className="rounded-md border border-[#2e2e2e] bg-[#111111] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-white">Quick review</h3>
        <span className="text-sm text-neutral-400">{score}/5</span>
      </div>
      <div className="space-y-2">
        {questions.length ? (
          questions.map((question, index) => (
            <label className="flex gap-2 text-sm text-neutral-300" key={`${note.id}-question-${index}`}>
              <CheckCircle2 className="mt-0.5 size-4 text-indigo-300" />
              {question}
            </label>
          ))
        ) : (
          <p className="text-sm text-neutral-400">No revision questions yet. Rate your recall for this note.</p>
        )}
      </div>
      <div className="mt-4 space-y-3">
        <Progress value={score * 20} />
        <input
          aria-label="Revision score"
          className="w-full accent-indigo-500"
          max={5}
          min={1}
          onChange={(event) => setScore(Number(event.target.value))}
          type="range"
          value={score}
        />
        <button
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.99]"
          onClick={saveRevision}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save review
        </button>
      </div>
    </section>
  );
}
