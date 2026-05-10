"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { AnimatePresence, motion } from "framer-motion";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";
import SpotlightCard from "@/components/SpotlightCard";
import { AddNoteForm } from "@/components/notes/AddNoteForm";
import { EditNoteDialog } from "@/components/notes/EditNoteDialog";
import { useNotePanel } from "@/context/NotePanelContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog";
import { createClient } from "@/lib/supabase/client";
import type { Difficulty, Note, NotePatch, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

const UNSORTED_ID = "unsorted";
const subjectColors = ["#0e7490", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#db2777"];

type BoardColumn = {
  id: string;
  subject: Subject | null;
  notes: Note[];
};


const difficultyClass: Record<Difficulty, string> = {
  easy: "bg-[#22c55e] text-[#0b3d1b]",
  medium: "bg-[#f59e0b] text-[#5a3a00]",
  hard: "bg-[#ef4444] text-[#4c0b0b]",
};

export function NotesKanbanBoard({
  notes,
  subjects,
  selectedSubjectId,
}: {
  notes: Note[];
  subjects: Subject[];
  selectedSubjectId?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { openNote } = useNotePanel();
  const [columns, setColumns] = useState(() => buildColumns(notes, subjects, selectedSubjectId));
  const [subjectList, setSubjectList] = useState(subjects);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [addNoteSubject, setAddNoteSubject] = useState<Subject | null>(null);

  useEffect(() => {
    setSubjectList(subjects);
    setColumns(buildColumns(notes, subjects, selectedSubjectId));
  }, [notes, subjects, selectedSubjectId]);

  const allNotesCount = columns.reduce((sum, column) => sum + column.notes.length, 0);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("You need to sign in again.");
    return token;
  }, [supabase]);

  const apiFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
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
    },
    [getToken, router, supabase],
  );

  const updateBoardNote = useCallback((noteId: string, nextNote: Note) => {
    setColumns((current) =>
      current.map((column) => ({
        ...column,
        notes: column.notes.map((noteItem) => (noteItem.id === noteId ? nextNote : noteItem)),
      })),
    );
  }, []);

  const moveOrUpdateNote = useCallback((note: Note) => {
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
  }, []);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
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
      } catch (error) {
        setColumns(previous);
        toast.error(error instanceof Error ? error.message : "Unable to reorder notes.");
      }
    },
    [apiFetch, columns],
  );

  const updateNoteTitle = useCallback(
    async (note: Note, title: string) => {
      const cleanTitle = title.trim();
      if (!cleanTitle || cleanTitle === note.title) return;
      const toastId = toast.loading("Updating title...");
      updateBoardNote(note.id, { ...note, title: cleanTitle });
      try {
        await apiFetch(`/api/notes/${note.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: cleanTitle }),
        });
        toast.success("Title updated.", { id: toastId });
      } catch (error) {
        updateBoardNote(note.id, note);
        toast.error(error instanceof Error ? error.message : "Unable to rename note.", { id: toastId });
      }
    },
    [apiFetch, updateBoardNote],
  );

  const saveNote = useCallback(
    async (note: Note, patch: NotePatch) => {
      const previous = note;
      const optimistic = { ...note, ...patch } as Note;
      moveOrUpdateNote(optimistic);
      const updatedPatch = { ...patch, tags: patch.tags ?? [] };
      try {
        const data = await apiFetch(`/api/notes/${note.id}`, {
          method: "PATCH",
          body: JSON.stringify(updatedPatch),
        });
        const updated = data.note as Note;
        moveOrUpdateNote(updated);
        setEditingNote(null);
      } catch (error) {
        moveOrUpdateNote(previous);
        toast.error(error instanceof Error ? error.message : "Unable to save note.");
      }
    },
    [apiFetch, moveOrUpdateNote],
  );

  const deleteNote = useCallback(
    async (note: Note) => {
      const previous = columns;
      const previousSubjects = subjectList;
      const toastId = toast.loading("Deleting note...");
      setColumns((current) =>
        current.map((column) => ({ ...column, notes: column.notes.filter((item) => item.id !== note.id) })),
      );
      if (note.subject_id) {
        setSubjectList((current) =>
          current.map((item) =>
            item.id === note.subject_id
              ? { ...item, note_count: Math.max(0, (item.note_count ?? 0) - 1) }
              : item,
          ),
        );
      }
      try {
        await apiFetch(`/api/notes/${note.id}`, { method: "DELETE" });
        toast.success("Note deleted.", { id: toastId });
      } catch (error) {
        setColumns(previous);
        setSubjectList(previousSubjects);
        toast.error(error instanceof Error ? error.message : "Unable to delete note.", { id: toastId });
      }
    },
    [apiFetch, columns, subjectList],
  );

  const renameSubject = useCallback(
    async (subject: Subject, name: string) => {
      const cleanName = name.trim();
      if (!cleanName || cleanName === subject.name) return;
      const previousSubjects = subjectList;
      const previousColumns = columns;
      const toastId = toast.loading("Renaming subject...");
      const renamed = { ...subject, name: cleanName };
      setSubjectList((current) => current.map((item) => (item.id === subject.id ? renamed : item)));
      setColumns((current) =>
        current.map((column) =>
          column.subject?.id === subject.id
            ? {
                ...column,
                subject: renamed,
                notes: column.notes.map((noteItem) => ({ ...noteItem, subjects: renamed })),
              }
            : column,
        ),
      );

      try {
        await apiFetch(`/api/subjects/${subject.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: cleanName }),
        });
        toast.success("Subject renamed.", { id: toastId });
      } catch (error) {
        setSubjectList(previousSubjects);
        setColumns(previousColumns);
        toast.error(error instanceof Error ? error.message : "Unable to rename subject.", { id: toastId });
      }
    },
    [apiFetch, columns, subjectList],
  );

  const confirmDeleteSubject = useCallback(async () => {
    if (!deleteSubject) return;
    const subject = deleteSubject;
    const previousSubjects = subjectList;
    const previousColumns = columns;
    const toastId = toast.loading("Deleting subject...");

    setColumns((current) => {
      const removed = current.find((column) => column.id === subject.id);
      const remaining = current.filter((column) => column.id !== subject.id);
      return remaining.map((column) =>
        column.id === UNSORTED_ID
          ? {
              ...column,
              notes: [
                ...column.notes,
                ...(removed?.notes ?? []).map((noteItem) => ({
                  ...noteItem,
                  subject_id: null,
                  subjects: null,
                })),
              ],
            }
          : column,
      );
    });
    setSubjectList((current) => current.filter((item) => item.id !== subject.id));
    setDeleteSubject(null);

    try {
      await apiFetch(`/api/subjects/${subject.id}`, { method: "DELETE" });
      toast.success("Subject deleted.", { id: toastId });
    } catch (error) {
      setSubjectList(previousSubjects);
      setColumns(previousColumns);
      toast.error(error instanceof Error ? error.message : "Unable to delete subject.", { id: toastId });
    }
  }, [apiFetch, columns, deleteSubject, subjectList]);

  const addSubject = useCallback(async () => {
    const name = newSubjectName.trim();
    if (!name) {
      setIsAddingSubject(false);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const tempSubject: Subject = {
      id: tempId,
      user_id: "temp",
      name,
      color: subjectColors[subjectList.length % subjectColors.length],
      note_count: 0,
      created_at: new Date().toISOString(),
    };

    setSubjectList((current) => [...current, tempSubject]);
    setColumns((current) => [...current, { id: tempId, subject: tempSubject, notes: [] }]);
    setNewSubjectName("");
    setIsAddingSubject(false);
    const toastId = toast.loading("Adding subject...");

    try {
      const data = await apiFetch("/api/subjects", {
        method: "POST",
        body: JSON.stringify({
          name,
          color: tempSubject.color,
        }),
      });
      const subject = data.subject as Subject;
      setSubjectList((current) => current.map((item) => (item.id === tempId ? subject : item)));
      setColumns((current) =>
        current.map((column) => (column.id === tempId ? { ...column, id: subject.id, subject } : column)),
      );
      toast.success("Subject added.", { id: toastId });
    } catch (error) {
      setSubjectList((current) => current.filter((item) => item.id !== tempId));
      setColumns((current) => current.filter((column) => column.id !== tempId));
      toast.error(error instanceof Error ? error.message : "Unable to add subject.", { id: toastId });
    }
  }, [apiFetch, newSubjectName, subjectList.length]);

  const openAddNoteForSubject = useCallback((subject: Subject | null) => {
    setAddNoteSubject(subject);
    setIsAddNoteOpen(true);
  }, []);

  const handleAddNoteOpenChange = useCallback((open: boolean) => {
    setIsAddNoteOpen(open);
    if (!open) setAddNoteSubject(null);
  }, []);

  const createManualNote = useCallback(
    async ({
      title,
      subjectName,
      summary,
      difficulty,
    }: {
      title: string;
      subjectName: string;
      summary: string;
      difficulty: Difficulty;
    }) => {
      const cleanTitle = title.trim();
      const cleanSubjectName = subjectName.trim() || "General";
      if (!cleanTitle) throw new Error("Title is required.");

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        await supabase.auth.signOut();
        router.replace("/login");
        throw new Error("You need to sign in again.");
      }

      const previousColumns = columns;
      const previousSubjects = subjectList;
      const existingSubject = subjectList.find(
        (item) => item.name.toLowerCase() === cleanSubjectName.toLowerCase(),
      );

      const tempNoteId = `temp-note-${Date.now()}`;
      const points = summary
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5);

      let tempSubject = existingSubject ?? null;
      if (!existingSubject) {
        tempSubject = {
          id: `temp-subject-${Date.now()}`,
          user_id: authData.user.id,
          name: cleanSubjectName,
          color: subjectColors[subjectList.length % subjectColors.length],
          note_count: 0,
          created_at: new Date().toISOString(),
        };
        setSubjectList((current) => [...current, tempSubject!]);
        setColumns((current) => [...current, { id: tempSubject!.id, subject: tempSubject, notes: [] }]);
      }

      const tempNote: Note = {
        id: tempNoteId,
        user_id: authData.user.id,
        subject_id: tempSubject?.id ?? null,
        title: cleanTitle,
        summary,
        key_points: points.length ? points : [summary.slice(0, 140)],
        revision_questions: [],
        difficulty,
        diagram_needed: false,
        diagram_description: null,
        source: "manual",
        is_manual: true,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subjects: tempSubject,
        tags: [],
      };

      setColumns((current) =>
        current.map((column) =>
          column.id === (tempSubject?.id ?? UNSORTED_ID)
            ? { ...column, notes: [tempNote, ...column.notes] }
            : column,
        ),
      );
      if (tempSubject?.id) {
        setSubjectList((current) =>
          current.map((item) =>
            item.id === tempSubject?.id
              ? { ...item, note_count: (item.note_count ?? 0) + 1 }
              : item,
          ),
        );
      }

      const toastId = toast.loading("Saving note...");
      try {
        let finalSubject = existingSubject;
        if (!existingSubject && tempSubject) {
          const data = await apiFetch("/api/subjects", {
            method: "POST",
            body: JSON.stringify({ name: cleanSubjectName, color: tempSubject.color }),
          });
          const created = data.subject as Subject;
          finalSubject = { ...created, note_count: (created.note_count ?? 0) + 1 };
          setSubjectList((current) =>
            current.map((item) => (item.id === tempSubject!.id ? finalSubject! : item)),
          );
          setColumns((current) =>
            current.map((column) =>
              column.id === tempSubject!.id
                ? ({ ...column, id: finalSubject!.id, subject: finalSubject } as BoardColumn)
                : column,
            ),
          );
        }

        const { data: insertedNote, error } = await supabase
          .from("notes")
          .insert({
            user_id: authData.user.id,
            subject_id: finalSubject?.id ?? null,
            title: cleanTitle,
            summary,
            key_points: points.length ? points : [summary.slice(0, 140)],
            revision_questions: [],
            difficulty,
            diagram_needed: false,
            diagram_description: null,
            source: "manual",
            is_manual: true,
            position: 0,
            updated_at: new Date().toISOString(),
          })
          .select(
            "id,user_id,subject_id,title,summary,key_points,revision_questions,difficulty,diagram_needed,diagram_description,source,is_manual,position,created_at,updated_at,subjects(id,name,color),tags(id,label,note_id)",
          )
          .single();

        if (error || !insertedNote) throw error || new Error("Unable to create note.");

        const finalNote = {
          ...insertedNote,
          subjects: Array.isArray(insertedNote.subjects) ? insertedNote.subjects[0] ?? null : insertedNote.subjects,
        } as Note;

        setColumns((current) =>
          current.map((column) => ({
            ...column,
            notes: column.notes.map((item) => (item.id === tempNoteId ? finalNote : item)),
          })),
        );
        toast.success("Note added.", { id: toastId });
      } catch (error) {
        setSubjectList(previousSubjects);
        setColumns(previousColumns);
        toast.error(error instanceof Error ? error.message : "Unable to add note.", { id: toastId });
        throw error;
      }
    },
    [apiFetch, columns, router, subjectList, supabase],
  );


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
            <MemoBoardColumn
              column={column}
              key={column.id}
              onAddNote={openAddNoteForSubject}
              onDeleteNote={deleteNote}
              onDeleteSubject={setDeleteSubject}
              onEditNote={setEditingNote}
              onOpenNote={openNote}
              onRenameSubject={renameSubject}
              onTitleSave={updateNoteTitle}
            />
          ))}

          {!selectedSubjectId ? (
            <div className="flex h-full min-w-[64px] shrink-0 flex-col items-center pt-2">
              <AnimatePresence mode="wait">
                {isAddingSubject ? (
                  <motion.div
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-[300px] rounded-lg border border-indigo-500 bg-[#12121a] p-2 shadow-2xl"
                    exit={{ opacity: 0, scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    key="add-subject-input"
                  >
                    <input
                      autoFocus
                      className="h-9 w-full rounded-md border border-[#2e2e2e] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-indigo-500"
                      onBlur={() => {
                        if (!newSubjectName.trim()) setIsAddingSubject(false);
                      }}
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
                  </motion.div>
                ) : (
                  <motion.button
                    animate={{ opacity: 1, scale: 1 }}
                    className="group flex size-12 items-center justify-center rounded-xl border border-dashed border-[#2e2e2e] bg-[#1a1a2e]/50 text-neutral-400 transition-all hover:border-indigo-500 hover:bg-indigo-500/10 hover:text-white active:scale-95"
                    exit={{ opacity: 0, scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    key="add-subject-button"
                    onClick={() => setIsAddingSubject(true)}
                    title="Add new subject"
                  >
                    <Plus className="size-6 transition-transform group-hover:rotate-90" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </DragDropContext>

      <AddNoteForm
        defaultSubjectName={addNoteSubject?.name ?? ""}
        onCreate={createManualNote}
        onOpenChange={handleAddNoteOpenChange}
        open={isAddNoteOpen}
        subjects={subjectList}
        trigger={
          <button
            className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:scale-105 hover:bg-indigo-500 active:scale-95"
            title="Add note"
            type="button"
          >
            <Plus className="size-6" />
          </button>
        }
      />

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
  onAddNote,
  onOpenNote,
}: {
  column: BoardColumn;
  onDeleteSubject: (subject: Subject) => void;
  onEditNote: (note: Note) => void;
  onRenameSubject: (subject: Subject, name: string) => Promise<void>;
  onTitleSave: (note: Note, title: string) => Promise<void>;
  onDeleteNote: (note: Note) => Promise<void>;
  onAddNote: (subject: Subject | null) => void;
  onOpenNote: (note: Note) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const shouldVirtualize = column.notes.length > 20;
  const rowVirtualizer = useVirtualizer({
    count: column.notes.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 190,
    overscan: 6,
  });
  const cardVariants = {
    hidden: { opacity: 0, y: 14 },
    show: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: index * 0.03, duration: 0.15 },
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
          <div className="flex-1 min-h-0 overflow-y-auto p-3 scroll-smooth scrollbar-thin scrollbar-thumb-[#2e2e2e] scrollbar-track-transparent" ref={listRef}>
            <div
              className={cn("space-y-3", shouldVirtualize ? "relative" : "")}
              style={shouldVirtualize ? { height: `${rowVirtualizer.getTotalSize()}px` } : undefined}
            >
              {shouldVirtualize ? (
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const note = column.notes[virtualRow.index];
                  if (!note) return null;
                  return (
                    <div
                      key={note.id}
                      className="absolute left-0 top-0 w-full"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      <Draggable draggableId={note.id} index={virtualRow.index} key={note.id}>
                        {(dragProvided, dragSnapshot) => (
                          <motion.div
                            custom={virtualRow.index}
                            ref={dragProvided.innerRef}
                            variants={cardVariants}
                            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                            style={dragProvided.draggableProps.style}
                            {...dragProvided.draggableProps}
                          >
                            <MemoKanbanNoteCard
                              dragHandleProps={dragProvided.dragHandleProps}
                              isDragging={dragSnapshot.isDragging}
                              note={note}
                              onDelete={onDeleteNote}
                              onEdit={onEditNote}
                              onTitleSave={onTitleSave}
                              onOpen={onOpenNote}
                            />
                          </motion.div>
                        )}
                      </Draggable>
                    </div>
                  );
                })
              ) : (
                <AnimatePresence initial={false}>
                  {column.notes.map((note, index) => (
                    <Draggable draggableId={note.id} index={index} key={note.id}>
                      {(dragProvided, dragSnapshot) => (
                        <motion.div
                          custom={index}
                          ref={dragProvided.innerRef}
                          variants={cardVariants}
                          exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                          style={dragProvided.draggableProps.style}
                          {...dragProvided.draggableProps}
                        >
                          <MemoKanbanNoteCard
                            dragHandleProps={dragProvided.dragHandleProps}
                            isDragging={dragSnapshot.isDragging}
                            note={note}
                            onDelete={onDeleteNote}
                            onEdit={onEditNote}
                            onTitleSave={onTitleSave}
                            onOpen={onOpenNote}
                          />
                        </motion.div>
                      )}
                    </Draggable>
                  ))}
                </AnimatePresence>
              )}
              {provided.placeholder}
              {!column.notes.length ? (
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#3a3a4a] text-sm text-neutral-500">
                  <Plus className="size-4 text-indigo-300" />
                  No notes yet
                </div>
              ) : null}
            </div>
          </div>
          <div className="border-t border-[#2e2e2e] p-3 bg-[#1a1a2e]/50 backdrop-blur-sm">
            <button
              className="flex w-full items-center justify-center gap-2 rounded-md border border-[#2e2e2e] py-2 text-sm text-neutral-300 transition-all hover:border-indigo-500 hover:bg-indigo-500/10 hover:text-white active:scale-[0.98]"
              onClick={() => onAddNote(column.subject)}
              type="button"
            >
              <Plus className="size-4" />
              Add note
            </button>
          </div>
        </motion.div>
      )}
    </Droppable>
  );
}

const MemoBoardColumn = memo(BoardColumn, (prev, next) => {
  if (prev.column.id !== next.column.id) return false;
  if (prev.column.notes.length !== next.column.notes.length) return false;
  if ((prev.column.subject?.name ?? "") !== (next.column.subject?.name ?? "")) return false;
  for (let index = 0; index < prev.column.notes.length; index += 1) {
    const prevNote = prev.column.notes[index];
    const nextNote = next.column.notes[index];
    if (!nextNote) return false;
    if (prevNote.id !== nextNote.id) return false;
    if (prevNote.updated_at !== nextNote.updated_at) return false;
    if (prevNote.title !== nextNote.title) return false;
    if (prevNote.subject_id !== nextNote.subject_id) return false;
  }
  return true;
});

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
  onOpen,
}: {
  note: Note;
  isDragging: boolean;
  dragHandleProps: React.HTMLAttributes<HTMLElement> | null;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => Promise<void>;
  onTitleSave: (note: Note, title: string) => Promise<void>;
  onOpen: (note: Note) => void;
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
        "group min-h-[160px] cursor-pointer rounded-lg border border-[#2e2e2e] bg-[#111111] p-4 transition-all duration-150 will-change-transform",
        isDragging
          ? "scale-[1.02] border-indigo-500 shadow-[0_8px_32px_rgba(99,102,241,0.3)]"
          : "hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)]",
      )}
      onClick={() => onOpen(note)}
      spotlightColor="rgba(99, 102, 241, 0.24)"
    >
      <div className="relative z-10 space-y-3">
        <div className="flex items-start gap-2">
          <button
            className="mt-0.5 cursor-grab text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-neutral-200 active:cursor-grabbing"
            title="Drag note"
            onClick={(e) => e.stopPropagation()}
            {...dragHandleProps}
          >
            <span className="text-lg">⠿</span>
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
                onClick={(event) => {
                  event.stopPropagation();
                  setIsEditingTitle(true);
                }}
              >
                {note.title}
              </button>
            )}
          </div>
          <div className="relative">
            <button
              className="rounded-md p-1 text-neutral-400 transition hover:bg-white/5 hover:text-white active:scale-[0.96]"
              ref={menuButtonRef}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
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
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onEdit(note);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-red-300 hover:bg-red-500/10"
                  onClick={(event) => {
                    event.stopPropagation();
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
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(note);
                }}
              >
                Confirm
              </button>
              <button
                className="rounded bg-white/10 px-2 py-1 text-xs text-neutral-200 transition hover:bg-white/15"
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmDelete(false);
                }}
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

const MemoKanbanNoteCard = memo(KanbanNoteCard, (prev, next) => {
  if (prev.isDragging !== next.isDragging) return false;
  if (prev.note.id !== next.note.id) return false;
  if (prev.note.title !== next.note.title) return false;
  if (prev.note.updated_at !== next.note.updated_at) return false;
  if (prev.note.summary !== next.note.summary) return false;
  if (prev.note.subject_id !== next.note.subject_id) return false;
  return true;
});

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

function buildColumns(notes: Note[], subjects: Subject[], selectedSubjectId: string | null | undefined): BoardColumn[] {
  const normalizedNotes = notes.map((note, index) => ({ ...note, position: note.position ?? index }));
  const subjectId = selectedSubjectId === "undefined" || selectedSubjectId === "null" ? null : selectedSubjectId;

  if (subjectId) {
    const subject = subjects.find((item) => item.id === subjectId) ?? null;
    if (!subject) return [];
    return [
      {
        id: subject.id,
        subject,
        notes: normalizedNotes.filter((note) => note.subject_id === subject.id).sort(sortByPosition),
      },
    ];
  }

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

