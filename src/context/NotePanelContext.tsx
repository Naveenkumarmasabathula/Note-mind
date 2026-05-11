"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NoteDetailPanel } from "@/components/notes/NoteDetailPanel";
import { createClient } from "@/lib/supabase/client";
import type { Note, NotePatch, Subject } from "@/lib/types";

const NOTE_SELECT =
  "id,user_id,subject_id,title,summary,key_points,revision_questions,difficulty,diagram_needed,diagram_description,source,is_manual,position,created_at,updated_at,subjects(id,name,color),tags(id,label,note_id)";

type NotePanelContextValue = {
  openNote: (note: Note) => void;
  openNoteById: (id: string) => Promise<void>;
  closeNote: () => void;
  isOpen: boolean;
  activeNote: Note | null;
};

const NotePanelContext = createContext<NotePanelContextValue | null>(null);

export function NotePanelProvider({
  children,
  subjects,
}: {
  children: React.ReactNode;
  subjects: Subject[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openNote = useCallback((note: Note) => {
    setActiveNote(note);
    setIsOpen(true);
  }, []);

  const openNoteById = useCallback(
    async (id: string) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.error("Please sign in again.");
        return;
      }
      const { data, error } = await supabase
        .from("notes")
        .select(NOTE_SELECT)
        .eq("id", id)
        .eq("user_id", auth.user.id)
        .single();
      if (error || !data) {
        toast.error("Unable to load note.");
        return;
      }
      const normalizedNote = {
        ...data,
        subjects: Array.isArray(data.subjects) ? data.subjects[0] ?? null : data.subjects,
      } as Note;
      setActiveNote(normalizedNote);
      setIsOpen(true);
    },
    [supabase],
  );

  const closeNote = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleExitComplete = useCallback(() => {
    if (!isOpen) setActiveNote(null);
  }, [isOpen]);

  const saveNote = useCallback(
    async (note: Note, patch: NotePatch) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error("Please sign in again.");
        return;
      }

      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...patch, tags: patch.tags ?? [] }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error?.message || payload?.error || "Unable to save note.");
        return;
      }

      setActiveNote(payload.note as Note);
      toast.success("Note updated.");
      router.refresh();
    },
    [router, supabase],
  );

  const value = useMemo(
    () => ({
      openNote,
      openNoteById,
      closeNote,
      isOpen,
      activeNote,
    }),
    [openNote, openNoteById, closeNote, isOpen, activeNote],
  );

  return (
    <NotePanelContext.Provider value={value}>
      {children}
      <NoteDetailPanel
        isOpen={isOpen}
        note={activeNote}
        onClose={closeNote}
        onExitComplete={handleExitComplete}
        onSave={saveNote}
        subjects={subjects}
      />
    </NotePanelContext.Provider>
  );
}

export function useNotePanel() {
  const context = useContext(NotePanelContext);
  if (!context) throw new Error("useNotePanel must be used within NotePanelProvider");
  return context;
}
