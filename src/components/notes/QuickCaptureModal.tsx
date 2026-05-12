"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog";
import { clientApiFetch } from "@/lib/client-api";
import { createClient } from "@/lib/supabase/client";
import type { Difficulty, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

const difficultyOptions: Difficulty[] = ["easy", "medium", "hard"];

export function QuickCaptureModal() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isShortcut) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const fetchSubjects = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase
      .from("subjects")
      .select("id,user_id,name,color,note_count,created_at")
      .eq("user_id", auth.user.id)
      .order("name");
    setSubjects((data ?? []) as Subject[]);
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    fetchSubjects().catch(() => null);
  }, [fetchSubjects, open]);

  useEffect(() => {
    if (!open) return;
    if (!subjectId && subjects.length) setSubjectId(subjects[0].id);
  }, [open, subjectId, subjects]);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectId) ?? null,
    [subjectId, subjects],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setText("");
  }, []);

  const createManualNote = useCallback(async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    const toastId = toast.loading("Saving note...");
    try {
      const summary = text.trim();
      const points = summary
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5);

      await clientApiFetch("/api/notes", {
        method: "POST",
        body: {
          title: summary.slice(0, 180),
          summary,
          subject: selectedSubject?.name ?? "General",
          key_points: points.length ? points : [summary.slice(0, 140)],
          revision_questions: [],
          difficulty,
          diagram_needed: false,
          diagram_description: null,
          source: "manual",
          is_manual: true,
          tags: [],
        },
      });

      toast.success("Note captured.", { id: toastId });
      handleClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save note.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }, [difficulty, handleClose, router, selectedSubject, text]);

  const analyzeWithAI = useCallback(async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    const toastId = toast.loading("Analyzing with AI...");
    try {
      await clientApiFetch("/api/analyze", {
        method: "POST",
        body: {
          text,
          subject: selectedSubject?.name,
          difficulty,
        },
      });

      toast.success("Note analyzed.", { id: toastId });
      handleClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to analyze note.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }, [difficulty, handleClose, router, selectedSubject, text]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-[#2e2e2e] bg-[#111111] text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quick capture</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <input
            autoFocus
            className="h-12 w-full rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-4 text-base text-white outline-none focus:border-indigo-500"
            onChange={(event) => setText(event.target.value)}
            placeholder="Capture a thought..."
            value={text}
          />

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Subject</p>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <button
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    subjectId === subject.id
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-[#2e2e2e] text-neutral-300 hover:border-indigo-500",
                  )}
                  key={subject.id}
                  onClick={() => setSubjectId(subject.id)}
                  type="button"
                >
                  {subject.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Difficulty</p>
            <div className="flex flex-wrap gap-2">
              {difficultyOptions.map((option) => (
                <button
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs capitalize transition",
                    difficulty === option
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-[#2e2e2e] text-neutral-300 hover:border-indigo-500",
                  )}
                  key={option}
                  onClick={() => setDifficulty(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              disabled={isSaving}
              onClick={createManualNote}
              type="button"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save as note
            </button>
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-[#2e2e2e] px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:border-indigo-500 hover:text-white disabled:opacity-60"
              disabled={isSaving}
              onClick={analyzeWithAI}
              type="button"
            >
              <Sparkles className="size-4" />
              Analyze with AI
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
