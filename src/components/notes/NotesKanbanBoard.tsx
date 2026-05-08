"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import SpotlightCard from "@/components/SpotlightCard";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog";
import { createClient } from "@/lib/supabase/client";
import type { Difficulty, Note, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

const UNSORTED_ID = "unsorted";
const subjectColors = ["#0e7490", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#db2777"];

type BoardColumn = {
  id: string;
  subject: Subject | null;
  notes: Note[];
};

type NotePatch = Partial<
  Pick<
    Note,
    "title" | "subject_id" | "difficulty" | "summary" | "key_points" | "revision_questions" | "diagram_description"
  >
> & {
  tags?: string[];
};

type ListItem = {
  id: string;
  value: string;
};

const difficultyClass: Record<Difficulty, string> = {
  easy: "bg-[#22c55e] text-[#0b3d1b]",
  medium: "bg-[#f59e0b] text-[#5a3a00]",
  hard: "bg-[#ef4444] text-[#4c0b0b]",
};

export function NotesKanbanBoard({ notes, subjects }: { notes: Note[]; subjects: Subject[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [columns, setColumns] = useState(() => buildColumns(notes, subjects));
  const [subjectList, setSubjectList] = useState(subjects);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  useEffect(() => {
    setSubjectList(subjects);
    setColumns(buildColumns(notes, subjects));
  }, [notes, subjects]);

  const allNotesCount = columns.reduce((sum, column) => sum + column.notes.length, 0);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("You need to sign in again.");
    return token;
  }

  async function apiFetch(path: string, options: RequestInit = {}) {
    const token = await getToken();
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      await supabase.auth.signOut();
      router.replace("/login");
      throw new Error("Unauthorized");
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || "Request failed.");
    }
    return data;
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const previous = columns;
    const nextColumns = columns.map((column) => ({ ...column, notes: [...column.notes] }));
    const sourceColumn = nextColumns.find((column) => column.id === source.droppableId);
    const destinationColumn = nextColumns.find((column) => column.id === destination.droppableId);
    if (!sourceColumn || !destinationColumn) return;

    const [moved] = sourceColumn.notes.splice(source.index, 1);
    const targetSubjectId = destinationColumn.subject?.id ?? null;
    const movedNote = { ...moved, subject_id: targetSubjectId, subjects: destinationColumn.subject };
    destinationColumn.notes.splice(destination.index, 0, movedNote);

    const withPositions = nextColumns.map((column) => ({
      ...column,
      notes: column.notes.map((note, index) => ({ ...note, position: index })),
    }));
    setColumns(withPositions);

    const affectedIds = new Set([sourceColumn.id, destinationColumn.id]);
    const updates = withPositions
      .filter((column) => affectedIds.has(column.id))
      .flatMap((column) =>
        column.notes.map((note, index) => ({
          id: note.id,
          position: index,
          subject_id: column.subject?.id ?? null,
        })),
      );

    try {
      await apiFetch("/api/notes/reorder", {
        method: "PATCH",
        body: JSON.stringify({ updates }),
      });
    } catch {
      setColumns(previous);
    }
  }

  async function updateNoteTitle(note: Note, title: string) {
    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle === note.title) return;
    updateBoardNote(note.id, { ...note, title: cleanTitle });
    await apiFetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: cleanTitle }),
    });
  }

  async function saveNote(note: Note, patch: NotePatch) {
    const data = await apiFetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    const updated = data.note as Note;
    moveOrUpdateNote(updated);
    setEditingNote(null);
  }

  async function deleteNote(note: Note) {
    await apiFetch(`/api/notes/${note.id}`, { method: "DELETE" });
    setColumns((current) =>
      current.map((column) => ({ ...column, notes: column.notes.filter((item) => item.id !== note.id) })),
    );
  }

  async function renameSubject(subject: Subject, name: string) {
    const cleanName = name.trim();
    if (!cleanName || cleanName === subject.name) return;
    await apiFetch(`/api/subjects/${subject.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: cleanName }),
    });
    const renamed = { ...subject, name: cleanName };
    setSubjectList((current) => current.map((item) => (item.id === subject.id ? renamed : item)));
    setColumns((current) =>
      current.map((column) =>
        column.subject?.id === subject.id
          ? {
              ...column,
              subject: renamed,
              notes: column.notes.map((note) => ({ ...note, subjects: renamed })),
            }
          : column,
      ),
    );
  }

  async function confirmDeleteSubject() {
    if (!deleteSubject) return;
    const subject = deleteSubject;
    await apiFetch(`/api/subjects/${subject.id}`, { method: "DELETE" });

    setColumns((current) => {
      const removed = current.find((column) => column.id === subject.id);
      const remaining = current.filter((column) => column.id !== subject.id);
      return remaining.map((column) =>
        column.id === UNSORTED_ID
          ? {
              ...column,
              notes: [
                ...column.notes,
                ...(removed?.notes ?? []).map((note) => ({ ...note, subject_id: null, subjects: null })),
              ],
            }
          : column,
      );
    });
    setSubjectList((current) => current.filter((item) => item.id !== subject.id));
    setDeleteSubject(null);
  }

  async function addSubject() {
    const name = newSubjectName.trim();
    if (!name) {
      setIsAddingSubject(false);
      return;
    }

    const data = await apiFetch("/api/subjects", {
      method: "POST",
      body: JSON.stringify({
        name,
        color: subjectColors[subjectList.length % subjectColors.length],
      }),
    });
    const subject = data.subject as Subject;
    setSubjectList((current) => [...current, subject]);
    setColumns((current) => [...current, { id: subject.id, subject, notes: [] }]);
    setNewSubjectName("");
    setIsAddingSubject(false);
  }

  function updateBoardNote(noteId: string, nextNote: Note) {
    setColumns((current) =>
      current.map((column) => ({
        ...column,
        notes: column.notes.map((note) => (note.id === noteId ? nextNote : note)),
      })),
    );
  }

  function moveOrUpdateNote(note: Note) {
    setColumns((current) => {
      const withoutNote = current.map((column) => ({
        ...column,
        notes: column.notes.filter((item) => item.id !== note.id),
      }));
      const destinationId = note.subject_id ?? UNSORTED_ID;
      return withoutNote.map((column) =>
        column.id === destinationId ? { ...column, notes: [...column.notes, note] } : column,
      );
    });
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Notes board</h1>
          <p className="text-sm text-neutral-400">{allNotesCount} notes organized by subject</p>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-1 min-h-0 gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <BoardColumn
              column={column}
              key={column.id}
              onDeleteSubject={setDeleteSubject}
              onEditNote={setEditingNote}
              onRenameSubject={renameSubject}
              onTitleSave={updateNoteTitle}
              onDeleteNote={deleteNote}
            />
          ))}

          <div className="min-w-[300px] max-w-[340px] shrink-0 overflow-hidden rounded-lg border border-dashed border-[#2e2e2e] bg-[#12121a]">
            <div className="flex min-h-14 items-center justify-center border-b border-[#2e2e2e] px-3">
              {isAddingSubject ? (
                <input
                  autoFocus
                  className="h-9 w-full rounded-md border border-indigo-500 bg-[#0f0f0f] px-3 text-sm text-white outline-none"
                  onBlur={addSubject}
                  onChange={(event) => setNewSubjectName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addSubject();
                    if (event.key === "Escape") {
                      setIsAddingSubject(false);
                      setNewSubjectName("");
                    }
                  }}
                  placeholder="Subject name"
                  value={newSubjectName}
                />
              ) : (
                <button
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#2e2e2e] text-sm font-semibold text-neutral-300 transition hover:border-indigo-500 hover:text-white active:scale-[0.99]"
                  onClick={() => setIsAddingSubject(true)}
                >
                  <Plus className="size-4" />
                  Add subject
                </button>
              )}
            </div>
          </div>
        </div>
      </DragDropContext>

      <DeleteSubjectDialog
        onConfirm={confirmDeleteSubject}
        onOpenChange={(open) => !open && setDeleteSubject(null)}
        subject={deleteSubject}
      />
      {editingNote ? (
        <EditNoteDialog
          note={editingNote}
          onCancel={() => setEditingNote(null)}
          onSave={saveNote}
          subjects={subjectList}
        />
      ) : null}
    </section>
  );
}

function BoardColumn({
  column,
  onDeleteSubject,
  onEditNote,
  onRenameSubject,
  onTitleSave,
  onDeleteNote,
}: {
  column: BoardColumn;
  onDeleteSubject: (subject: Subject) => void;
  onEditNote: (note: Note) => void;
  onRenameSubject: (subject: Subject, name: string) => Promise<void>;
  onTitleSave: (note: Note, title: string) => Promise<void>;
  onDeleteNote: (note: Note) => Promise<void>;
}) {
  const cardVariants = {
    hidden: { opacity: 0, y: 14 },
    show: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: index * 0.05 },
    }),
  };

  return (
    <Droppable droppableId={column.id}>
      {(provided, snapshot) => (
        <motion.div
          animate="show"
          className={cn(
            "flex h-full min-w-[300px] max-w-[340px] shrink-0 flex-col rounded-lg border bg-[#1a1a2e]",
            snapshot.isDraggingOver
              ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_0_1px_rgba(99,102,241,0.6)]"
              : "border-[#2e2e2e]",
          )}
          initial="hidden"
          ref={provided.innerRef}
          variants={{ hidden: {}, show: {} }}
          {...provided.droppableProps}
        >
          <ColumnHeader column={column} onDeleteSubject={onDeleteSubject} onRenameSubject={onRenameSubject} />
          <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-3">
            <AnimatePresence initial={false}>
              {column.notes.map((note, index) => (
                <Draggable draggableId={note.id} index={index} key={note.id}>
                  {(dragProvided, dragSnapshot) => (
                    <motion.div
                      custom={index}
                      ref={dragProvided.innerRef}
                      variants={cardVariants}
                      exit={{ opacity: 0, scale: 0.96 }}
                      {...dragProvided.draggableProps}
                    >
                      <KanbanNoteCard
                        dragHandleProps={dragProvided.dragHandleProps}
                        isDragging={dragSnapshot.isDragging}
                        note={note}
                        onDelete={onDeleteNote}
                        onEdit={onEditNote}
                        onTitleSave={onTitleSave}
                      />
                    </motion.div>
                  )}
                </Draggable>
              ))}
            </AnimatePresence>
            {provided.placeholder}
            {!column.notes.length ? (
              <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#3a3a4a] text-sm text-neutral-500">
                <Plus className="size-4 text-indigo-300" />
                No notes yet
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </Droppable>
  );
}

function ColumnHeader({
  column,
  onDeleteSubject,
  onRenameSubject,
}: {
  column: BoardColumn;
  onDeleteSubject: (subject: Subject) => void;
  onRenameSubject: (subject: Subject, name: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(column.subject?.name ?? "Unsorted");
  const inputRef = useRef<HTMLInputElement>(null);

  const title = column.subject?.name ?? "Unsorted";

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  async function save() {
    if (!column.subject) {
      setIsEditing(false);
      return;
    }
    const cleanName = name.trim();
    if (!cleanName) {
      setName(title);
      setIsEditing(false);
      return;
    }
    await onRenameSubject(column.subject, cleanName);
    setIsEditing(false);
  }

  return (
    <div className="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-2 border-b border-[#2e2e2e] bg-[#1a1a2e] px-3">
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            ref={inputRef}
            className="h-8 w-full rounded-md border border-indigo-500 bg-[#0f0f0f] px-2 text-sm font-semibold text-white outline-none"
            onBlur={save}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
              if (event.key === "Escape") {
                setName(title);
                setIsEditing(false);
              }
            }}
            value={name}
          />
        ) : (
          <button
            className="max-w-full truncate text-left text-sm font-semibold text-white"
            disabled={!column.subject}
            onClick={() => column.subject && setIsEditing(true)}
          >
            {title}
          </button>
        )}
      </div>
      <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white">{column.notes.length}</span>
      {column.subject ? (
        <button
          className="rounded-md p-1.5 text-neutral-400 transition hover:bg-red-500/10 hover:text-red-300 active:scale-[0.96]"
          onClick={() => onDeleteSubject(column.subject!)}
          title="Delete subject"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function KanbanNoteCard({
  note,
  isDragging,
  dragHandleProps,
  onEdit,
  onDelete,
  onTitleSave,
}: {
  note: Note;
  isDragging: boolean;
  dragHandleProps: React.HTMLAttributes<HTMLElement> | null;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => Promise<void>;
  onTitleSave: (note: Note, title: string) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(note.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus();
  }, [isEditingTitle]);

  useEffect(() => {
    if (!menuOpen) return;

    const updatePosition = () => {
      if (!menuButtonRef.current) return;
      const rect = menuButtonRef.current.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 144;
      const menuHeight = menuRef.current?.offsetHeight ?? 96;
      const gutter = 10;
      const left = Math.min(window.innerWidth - menuWidth - gutter, Math.max(gutter, rect.right - menuWidth));
      const top = Math.min(window.innerHeight - menuHeight - gutter, rect.bottom + 8);
      setMenuPosition({ top, left });
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function saveTitle() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setTitle(note.title);
      setIsEditingTitle(false);
      return;
    }
    await onTitleSave(note, title);
    setIsEditingTitle(false);
  }

  return (
    <SpotlightCard
      className={cn(
        "min-h-[160px] rounded-lg border-[#2e2e2e] bg-[#111111] p-4 transition",
        isDragging ? "scale-[1.02] shadow-[0_8px_32px_rgba(99,102,241,0.3)]" : "hover:shadow-lg",
      )}
      spotlightColor="rgba(99, 102, 241, 0.24)"
    >
      <div className="relative z-10 space-y-3">
        <div className="flex items-start gap-2">
          <button
            className="mt-0.5 cursor-grab text-neutral-500 transition hover:text-neutral-200 active:cursor-grabbing"
            title="Drag note"
            {...dragHandleProps}
          >
            <GripVertical className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                className="w-full rounded-md border border-indigo-500 bg-[#0f0f0f] px-1 text-sm font-semibold leading-5 text-white outline-none"
                onBlur={saveTitle}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveTitle();
                  if (event.key === "Escape") {
                    setTitle(note.title);
                    setIsEditingTitle(false);
                  }
                }}
                value={title}
              />
            ) : (
              <button
                className="line-clamp-2 text-left text-sm font-semibold leading-5 text-white"
                onClick={() => setIsEditingTitle(true)}
              >
                {note.title}
              </button>
            )}
          </div>
          <div className="relative">
            <button
              className="rounded-md p-1 text-neutral-400 transition hover:bg-white/5 hover:text-white active:scale-[0.96]"
              ref={menuButtonRef}
              onClick={() => setMenuOpen((open) => !open)}
              title="Note actions"
            >
              <MoreVertical className="size-4" />
            </button>
          </div>
        </div>

        {menuOpen && menuPosition
          ? createPortal(
              <div
                className="fixed z-50 w-36 rounded-md border border-[#2e2e2e] bg-[#171724] p-1 text-sm text-neutral-200 shadow-lg"
                ref={menuRef}
                style={{ top: menuPosition.top, left: menuPosition.left }}
              >
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(note);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-red-300 hover:bg-red-500/10"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </button>
              </div>,
              document.body,
            )
          : null}

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-neutral-200">
            {note.subjects?.name ?? "Unsorted"}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", difficultyClass[note.difficulty])}>
            {note.difficulty}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs",
              note.source === "manual"
                ? "border-[#0f6e56]/50 bg-[#0f6e56]/15 text-[#9de6d0]"
                : "border-[#6366f1]/50 bg-[#6366f1]/15 text-[#c7d2fe]",
            )}
          >
            {note.source === "manual" ? "manual" : "chatgpt"}
          </span>
        </div>

        <p className="line-clamp-2 text-sm leading-5 text-neutral-400">{note.summary}</p>

        {note.tags?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {note.tags.slice(0, 4).map((tag) => (
              <span className="rounded-full bg-[#2e2e2e] px-2 py-0.5 text-xs text-[#9ca3af]" key={tag.id}>
                #{tag.label}
              </span>
            ))}
          </div>
        ) : null}

        {confirmDelete ? (
          <div className="rounded-md border border-red-500/25 bg-red-500/10 p-2 text-sm text-red-100">
            <p>Delete this note?</p>
            <div className="mt-2 flex gap-2">
              <button
                className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white transition hover:bg-red-400"
                onClick={() => onDelete(note)}
              >
                Confirm
              </button>
              <button
                className="rounded bg-white/10 px-2 py-1 text-xs text-neutral-200 transition hover:bg-white/15"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </SpotlightCard>
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

function EditNoteDialog({
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

function DeleteSubjectDialog({
  subject,
  onConfirm,
  onOpenChange,
}: {
  subject: Subject | null;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(subject)} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#2e2e2e] bg-[#12121a] text-white">
        <DialogHeader>
          <DialogTitle>Delete subject?</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-6 text-neutral-300">
          Delete subject &apos;{subject?.name}&apos;? All notes in this subject will become Unsorted.
        </p>
        <DialogFooter>
          <button
            className="rounded-md border border-[#2e2e2e] px-4 py-2 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 active:scale-[0.99]"
            onClick={onConfirm}
          >
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildColumns(notes: Note[], subjects: Subject[]): BoardColumn[] {
  const normalizedNotes = notes.map((note, index) => ({ ...note, position: note.position ?? index }));
  const unsorted: BoardColumn = {
    id: UNSORTED_ID,
    subject: null,
    notes: normalizedNotes.filter((note) => !note.subject_id).sort(sortByPosition),
  };

  return [
    unsorted,
    ...subjects.map((subject) => ({
      id: subject.id,
      subject,
      notes: normalizedNotes.filter((note) => note.subject_id === subject.id).sort(sortByPosition),
    })),
  ];
}

function sortByPosition(a: Note, b: Note) {
  return (a.position ?? 0) - (b.position ?? 0);
}

const fieldClass =
  "min-h-10 w-full rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-3 text-sm text-white outline-none transition focus:border-indigo-500";
