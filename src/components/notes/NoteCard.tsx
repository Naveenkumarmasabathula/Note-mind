"use client";

import { Calendar, Sparkles } from "lucide-react";
import AnimatedContent from "@/components/AnimatedContent";
import SpotlightCard from "@/components/SpotlightCard";
import { NoteModal } from "@/components/notes/NoteModal";
import type { Difficulty, Note } from "@/lib/types";
import { cn } from "@/lib/utils";

const difficultyClass: Record<Difficulty, string> = {
  easy: "bg-[#22c55e] text-[#0b3d1b]",
  medium: "bg-[#f59e0b] text-[#5a3a00]",
  hard: "bg-[#ef4444] text-[#4c0b0b]",
};

export function NoteCard({ note, index }: { note: Note; index: number }) {
  return (
    <AnimatedContent delay={index * 0.05} distance={28} duration={0.55}>
      <NoteModal note={note}>
        <button className="block h-full w-full text-left">
          <SpotlightCard
            className="h-full min-h-[160px] rounded-lg border-[#2e2e2e] bg-[#111111] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            spotlightColor="rgba(99, 102, 241, 0.18)"
          >
            <div className="relative z-10 flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="line-clamp-2 text-lg font-semibold leading-6 text-white">{note.title}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                    <Calendar className="size-3.5" />
                    {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>
                {note.source !== "manual" ? <Sparkles className="size-4 shrink-0 text-indigo-300" /> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className="rounded-full bg-[#2e2e2e] px-2.5 py-1 text-xs font-medium text-neutral-200"
                  style={{ backgroundColor: note.subjects?.color ?? "#2e2e2e" }}
                >
                  {note.subjects?.name ?? "General"}
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", difficultyClass[note.difficulty])}>
                  {note.difficulty}
                </span>
              </div>

              <p className="line-clamp-4 flex-1 text-sm leading-6 text-neutral-300">{note.summary}</p>

              <div className="flex flex-wrap gap-1.5">
                {(note.tags ?? []).slice(0, 4).map((tag) => (
                  <span className="rounded-full bg-[#2e2e2e] px-2 py-0.5 text-xs text-[#9ca3af]" key={tag.id}>
                    #{tag.label}
                  </span>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </button>
      </NoteModal>
    </AnimatedContent>
  );
}
