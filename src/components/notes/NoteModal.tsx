"use client";

import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";
import { CalendarDays, Check, GitBranch, Tags } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/animate-ui/components/radix/dialog";
import { RevisionPanel } from "@/components/notes/RevisionPanel";
import type { Note } from "@/lib/types";

export function NoteModal({ note, children }: { note: Note; children: React.ReactNode }) {
  const [diagram, setDiagram] = useState("");
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    if (!note.diagram_needed || !note.diagram_description) return;
    mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });
    mermaid
      .render(`diagram-${id}`, note.diagram_description)
      .then(({ svg }) => setDiagram(svg))
      .catch(() => setDiagram(""));
  }, [id, note.diagram_description, note.diagram_needed]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#2e2e2e] bg-[#12121a] text-[#f0f0f0] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-2xl text-white">{note.title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
            <span>{note.subjects?.name ?? "General"}</span>
            <span>•</span>
            <span>{new Date(note.created_at).toLocaleDateString()}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-sm leading-6 text-neutral-300">{note.summary}</p>

          <section>
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
              <Check className="size-4 text-indigo-300" />
              Key points
            </h3>
            <ul className="space-y-2">
              {(note.key_points ?? []).map((point, index) => (
                <li
                  className="rounded-md border border-[#2e2e2e] bg-[#111111] px-3 py-2 text-sm text-neutral-300"
                  key={`${note.id}-point-${index}`}
                >
                  {point}
                </li>
              ))}
            </ul>
          </section>

          {note.diagram_needed && note.diagram_description ? (
            <section>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
                <GitBranch className="size-4 text-indigo-300" />
                Diagram
              </h3>
              <div
                className="overflow-x-auto rounded-md border border-[#2e2e2e] bg-[#0f0f0f] p-4 text-neutral-200"
                dangerouslySetInnerHTML={{ __html: diagram || "<p>Unable to render diagram.</p>" }}
              />
            </section>
          ) : null}

          <section className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
            <CalendarDays className="size-4" />
            Updated {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : "recently"}
            {note.tags?.length ? (
              <>
                <Tags className="ml-2 size-4" />
                {note.tags.map((tag) => (
                  <span className="rounded-full bg-[#2e2e2e] px-2 py-0.5 text-xs text-[#9ca3af]" key={tag.id}>
                    {tag.label}
                  </span>
                ))}
              </>
            ) : null}
          </section>

          <RevisionPanel note={note} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
