"use client";

import { useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { GripVertical, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog";
import type { Difficulty, Note, NotePatch, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";


type ListItem = {
  id: string;
  value: string;
};

const fieldClass =
  "min-h-10 w-full rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-3 text-sm text-white outline-none transition focus:border-indigo-500";

export function EditNoteDialog({
  note,
  subjects,
  onSave,
  onCancel,
}: {
  note: Note;
  subjects: Subject[];
  onSave: (note: Note, patch: NotePatch) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [subjectId, setSubjectId] = useState(note.subject_id ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(note.difficulty);
  const [summary, setSummary] = useState(note.summary);
  const [keyPoints, setKeyPoints] = useState<ListItem[]>(createListItems(note.key_points ?? []));
  const [questions, setQuestions] = useState<ListItem[]>(createListItems(note.revision_questions ?? []));
  const [tags, setTags] = useState((note.tags ?? []).map((tag) => tag.label));
  const [tagInput, setTagInput] = useState("");
  const [diagram, setDiagram] = useState(note.diagram_description ?? "");
  const [isSaving, setIsSaving] = useState(false);

  function handleListDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const reorder = (items: ListItem[]) => {
      const updated = [...items];
      const [moved] = updated.splice(source.index, 1);
      updated.splice(destination.index, 0, moved);
      return updated;
    };

    if (source.droppableId === "key-points") {
      setKeyPoints(reorder(keyPoints));
    }

    if (source.droppableId === "revision-questions") {
      setQuestions(reorder(questions));
    }
  }

  async function submit() {
    setIsSaving(true);
    await onSave(note, {
      title,
      subject_id: subjectId || null,
      difficulty,
      summary,
      key_points: keyPoints.map((item) => item.value).filter(Boolean),
      revision_questions: questions.map((item) => item.value).filter(Boolean),
      tags,
      diagram_description: note.diagram_needed ? diagram : null,
    });
    setIsSaving(false);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#2e2e2e] bg-[#12121a] text-white sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <input className={fieldClass} onChange={(event) => setTitle(event.target.value)} value={title} />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className={fieldClass} onChange={(event) => setSubjectId(event.target.value)} value={subjectId}>
              <option value="">Unsorted</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              onChange={(event) => setDifficulty(event.target.value as Difficulty)}
              value={difficulty}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <textarea
            className={cn(fieldClass, "min-h-32 py-3")}
            onChange={(event) => setSummary(event.target.value)}
            value={summary}
          />

          <DragDropContext onDragEnd={handleListDragEnd}>
            <EditableList label="Key points" items={keyPoints} onChange={setKeyPoints} droppableId="key-points" />
            <EditableList
              label="Revision questions"
              items={questions}
              onChange={setQuestions}
              droppableId="revision-questions"
            />
          </DragDropContext>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-300">Tags</label>
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-2 py-2">
              {tags.map((tag) => (
                <button
                  className="flex items-center gap-1 rounded-full bg-[#2e2e2e] px-2 py-1 text-xs text-[#9ca3af]"
                  key={tag}
                  onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                  type="button"
                >
                  {tag}
                  <X className="size-3" />
                </button>
              ))}
              <input
                className="min-w-[120px] flex-1 bg-transparent px-2 py-1 text-sm text-white outline-none"
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const clean = tagInput.trim();
                    if (clean && !tags.includes(clean)) setTags((current) => [...current, clean]);
                    setTagInput("");
                  }
                }}
                placeholder="Type tag and press Enter"
                value={tagInput}
              />
            </div>
          </div>

          {note.diagram_needed ? (
            <textarea
              className={cn(fieldClass, "min-h-28 py-3")}
              onChange={(event) => setDiagram(event.target.value)}
              placeholder="Mermaid diagram"
              value={diagram}
            />
          ) : null}
        </div>

        <DialogFooter>
          <button
            className="rounded-md border border-[#2e2e2e] px-4 py-2 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-60"
            disabled={isSaving}
            onClick={submit}
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditableList({
  label,
  items,
  onChange,
  droppableId,
}: {
  label: string;
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  droppableId: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-neutral-300">{label}</label>
      <Droppable droppableId={droppableId}>
        {(provided) => (
          <div className="space-y-2" ref={provided.innerRef} {...provided.droppableProps}>
            {items.map((item, index) => (
              <Draggable draggableId={item.id} index={index} key={item.id}>
                {(dragProvided) => (
                  <div
                    className="flex items-center gap-2"
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                  >
                    <button
                      className="grid size-10 shrink-0 place-items-center rounded-md border border-[#2e2e2e] text-neutral-400 transition hover:text-neutral-200"
                      title="Drag"
                      type="button"
                      {...dragProvided.dragHandleProps}
                    >
                      <GripVertical className="size-4" />
                    </button>
                    <input
                      className={fieldClass}
                      onChange={(event) =>
                        onChange(
                          items.map((value) =>
                            value.id === item.id ? { ...value, value: event.target.value } : value,
                          ),
                        )
                      }
                      value={item.value}
                    />
                    <button
                      className="grid size-10 shrink-0 place-items-center rounded-md border border-[#2e2e2e] text-neutral-400 transition hover:text-red-300"
                      onClick={() => onChange(items.filter((value) => value.id !== item.id))}
                      type="button"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <button
        className="mt-2 flex items-center gap-1 text-sm text-indigo-300"
        onClick={() => onChange([...items, createListItem("")])}
        type="button"
      >
        <Plus className="size-4" />
        Add
      </button>
    </div>
  );
}

function createListItem(value: string): ListItem {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return { id: crypto.randomUUID(), value };
  }
  return { id: `${Date.now()}-${Math.random()}`, value };
}

function createListItems(values: string[]): ListItem[] {
  return values.map((value) => createListItem(value));
}
