"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/animate-ui/components/radix/dialog";
import { createClient } from "@/lib/supabase/client";
import type { Difficulty, Subject } from "@/lib/types";

const colors = ["#0e7490", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#db2777"];

export function AddNoteForm({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(subjects[0]?.name ?? "General");
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [isSaving, setIsSaving] = useState(false);

  const subjectNames = useMemo(() => subjects.map((item) => item.name), [subjects]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      await supabase.auth.signOut();
      setIsSaving(false);
      router.replace("/login");
      return;
    }

    const existing = subjects.find((item) => item.name.toLowerCase() === subject.trim().toLowerCase());
    let subjectId = existing?.id;

    if (!subjectId) {
      const { data: created } = await supabase
        .from("subjects")
        .insert({
          user_id: data.user.id,
          name: subject.trim() || "General",
          color: colors[Math.floor(Math.random() * colors.length)],
          note_count: 0,
        })
        .select("id")
        .single();
      subjectId = created?.id;
    }

    const points = content
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);

    await supabase.from("notes").insert({
      user_id: data.user.id,
      subject_id: subjectId,
      title,
      summary: content,
      key_points: points.length ? points : [content.slice(0, 140)],
      revision_questions: [],
      difficulty,
      diagram_needed: false,
      diagram_description: null,
      source: "manual",
      is_manual: true,
      position: 0,
      updated_at: new Date().toISOString(),
    });

    if (subjectId) {
      await supabase
        .from("subjects")
        .update({ note_count: (existing?.note_count ?? 0) + 1 })
        .eq("id", subjectId);
    }

    setTitle("");
    setContent("");
    setDifficulty("easy");
    setOpen(false);
    setIsSaving(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:scale-105 hover:bg-indigo-500 active:scale-95"
          title="Add note"
        >
          <Plus className="size-6" />
        </button>
      </DialogTrigger>
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
