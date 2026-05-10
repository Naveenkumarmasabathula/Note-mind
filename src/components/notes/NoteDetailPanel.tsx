"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import mermaid from "mermaid";
import { CheckCircle2, GitBranch, Tags, X } from "lucide-react";
import type { Note, NotePatch, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EditNoteDialog } from "@/components/notes/EditNoteDialog";

type NoteDetailPanelProps = {
  note: Note | null;
  isOpen: boolean;
  subjects: Subject[];
  onClose: () => void;
  onExitComplete: () => void;
  onSave: (note: Note, patch: NotePatch) => Promise<void>;
};


const difficultyClass: Record<string, string> = {
  easy: "bg-[#22c55e] text-[#0b3d1b]",
  medium: "bg-[#f59e0b] text-[#5a3a00]",
  hard: "bg-[#ef4444] text-[#4c0b0b]",
};

export function NoteDetailPanel({ note, isOpen, subjects, onClose, onExitComplete, onSave }: NoteDetailPanelProps) {
  const [diagram, setDiagram] = useState("");
  const [checkedPoints, setCheckedPoints] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isOpen || !note) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, note, onClose]);

  useEffect(() => {
    if (!note) return;
    const initial: Record<string, boolean> = {};
    (note.key_points ?? []).forEach((point) => {
      initial[point] = false;
    });
    setCheckedPoints(initial);
  }, [note]);

  useEffect(() => {
    if (!note?.diagram_needed || !note.diagram_description) {
      setDiagram("");
      return;
    }
    mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });
    mermaid
      .render(`panel-diagram-${note.id}`, note.diagram_description)
      .then(({ svg }) => setDiagram(svg))
      .catch(() => setDiagram(""));
  }, [note]);

  const keyPoints = useMemo(() => note?.key_points ?? [], [note]);

  return (
    <>
      <AnimatePresence onExitComplete={onExitComplete}>
        {isOpen && note ? (
          <>
            <motion.button
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              type="button"
            />
            <motion.aside
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[400px] flex-col border-l border-[#2e2e2e] bg-[#0f0f0f] text-white shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#2e2e2e] px-5 py-4">
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-lg font-semibold">{note.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                    <span
                      className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-neutral-200"
                      style={{ backgroundColor: note.subjects?.color ?? "#2e2e2e" }}
                    >
                      {note.subjects?.name ?? "Unsorted"}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", difficultyClass[note.difficulty])}>
                      {note.difficulty}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-md border border-[#2e2e2e] px-2.5 py-1 text-xs text-neutral-300 transition hover:border-indigo-500 hover:text-white"
                    onClick={() => setIsEditing(true)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="grid size-8 place-items-center rounded-md border border-[#2e2e2e] text-neutral-400 transition hover:border-indigo-500 hover:text-white"
                    onClick={onClose}
                    type="button"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <section className="space-y-4">
                  <p className="text-sm leading-6 text-neutral-300">{note.summary}</p>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-white/90">Key points</h3>
                    <div className="space-y-2">
                      {keyPoints.map((point) => (
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border border-[#2e2e2e] bg-[#12121a] px-3 py-2.5 text-sm transition-all hover:border-[#3e3e3e]",
                            checkedPoints[point] ? "border-indigo-500/30 bg-indigo-500/5 text-white" : "text-neutral-400",
                          )}
                          key={point}
                        >
                          <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-[#3e3e3e] bg-transparent transition-colors group-hover:border-indigo-500">
                            {checkedPoints[point] && (
                              <div className="size-2.5 rounded-sm bg-indigo-500" />
                            )}
                          </div>
                          <input
                            checked={checkedPoints[point] ?? false}
                            className="hidden"
                            onChange={() =>
                              setCheckedPoints((current) => ({ ...current, [point]: !current[point] }))
                            }
                            type="checkbox"
                          />
                          <span className={cn(checkedPoints[point] && "line-through opacity-60")}>{point}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {note.diagram_needed && note.diagram_description ? (
                    <div>
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                        <GitBranch className="size-4 text-indigo-300" />
                        Diagram
                      </h3>
                      <div
                        className="overflow-x-auto rounded-md border border-[#2e2e2e] bg-[#0f0f0f] p-3 text-neutral-200"
                        dangerouslySetInnerHTML={{ __html: diagram || "<p>Unable to render diagram.</p>" }}
                      />
                    </div>
                  ) : null}

                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                      <CheckCircle2 className="size-4 text-indigo-300" />
                      Revision questions
                    </h3>
                    <ul className="space-y-2 text-sm text-neutral-300">
                      {(note.revision_questions ?? []).map((question, index) => (
                        <li className="rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-3 py-2" key={`${note.id}-question-${index}`}>
                          {question}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {note.tags?.length ? (
                    <div>
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                        <Tags className="size-4 text-indigo-300" />
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {note.tags.map((tag) => (
                          <span className="rounded-full bg-[#2e2e2e] px-2 py-0.5 text-xs text-neutral-300" key={tag.id}>
                            #{tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      {note && isEditing ? (
        <EditNoteDialog
          note={note}
          onCancel={() => setIsEditing(false)}
          onSave={async (currentNote, patch) => {
            await onSave(currentNote, patch);
            setIsEditing(false);
          }}
          subjects={subjects}
        />
      ) : null}
    </>
  );
}
