import { redirect } from "next/navigation";
import { AddNoteForm } from "@/components/notes/AddNoteForm";
import { NotesKanbanBoard } from "@/components/notes/NotesKanbanBoard";
import { createClient } from "@/lib/supabase/server";
import type { Note, Subject } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const notesQuery = supabase
    .from("notes")
    .select("*,subjects(*),tags(*)")
    .eq("user_id", userData.user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  const [{ data: notes = [] }, { data: subjects = [] }] = await Promise.all([
    notesQuery,
    supabase.from("subjects").select("*").eq("user_id", userData.user.id).order("name"),
  ]);

  const typedNotes = (notes ?? []) as Note[];

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 xl:px-8">
      <div className="flex min-h-0 flex-1">
        <NotesKanbanBoard notes={typedNotes} subjects={(subjects ?? []) as Subject[]} />
      </div>

      <AddNoteForm subjects={(subjects ?? []) as Subject[]} />
    </main>
  );
}
