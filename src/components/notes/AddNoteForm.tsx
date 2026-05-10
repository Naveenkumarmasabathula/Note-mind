"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/animate-ui/components/radix/dialog";
import type { Difficulty, Subject } from "@/lib/types";

type AddNoteFormProps = {
  subjects: Subject[];
  defaultSubjectName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onCreate: (payload: {
    title: string;
    subjectName: string;
    summary: string;
    difficulty: Difficulty;
  }) => Promise<void>;
};

export function AddNoteForm({
  subjects,
  defaultSubjectName,
  open,
  onOpenChange,
  trigger,
  onCreate,
}: AddNoteFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(defaultSubjectName ?? subjects[0]?.name ?? "General");
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [isSaving, setIsSaving] = useState(false);

  const subjectNames = useMemo(() => subjects.map((item) => item.name), [subjects]);

  useEffect(() => {
    if (!dialogOpen) return;
    const fallback = subjects[0]?.name ?? "General";
    setSubject(defaultSubjectName || fallback);
  }, [defaultSubjectName, dialogOpen, subjects]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onCreate({
        title,
        subjectName: subject,
        summary: content,
        difficulty,
      });
      setTitle("");
      setContent("");
      setDifficulty("easy");
      setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#2e2e2e] bg-[#12121a] text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add manual note</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            className="h-11 w-full rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-3 text-white outline-none focus:border-indigo-500"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
            required
            value={title}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="h-11 rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-3 text-white outline-none focus:border-indigo-500"
              list="subjects"
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject"
              required
              value={subject}
            />
            <datalist id="subjects">
              {subjectNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <select
              className="h-11 rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-3 text-white outline-none focus:border-indigo-500"
              onChange={(event) => setDifficulty(event.target.value as Difficulty)}
              value={difficulty}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <textarea
            className="min-h-56 w-full rounded-md border border-[#2e2e2e] bg-[#0f0f0f] p-3 text-white outline-none focus:border-indigo-500"
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write the note content. Manual notes skip AI summarization."
            required
            value={content}
          />
          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.99]"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save note
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
