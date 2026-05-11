import { redirect } from "next/navigation";
import { NotesKanbanBoard } from "@/components/notes/NotesKanbanBoard";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Note, Subject } from "@/lib/types";

type DashboardPageProps = {
  searchParams?: { subject?: string };
};

const NOTE_SELECT =
  "id,user_id,subject_id,title,summary,key_points,revision_questions,difficulty,diagram_needed,diagram_description,source,is_manual,position,created_at,updated_at,subjects(id,name,color),tags(id,label,note_id)";

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  if (!hasSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const selectedSubjectId = searchParams?.subject ?? null;

  let notesQuery = supabase
    .from("notes")
    .select(NOTE_SELECT)
    .eq("user_id", userData.user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);

  if (selectedSubjectId) {
    notesQuery = notesQuery.eq("subject_id", selectedSubjectId);
  }

  const [{ data: notes = [] }, { data: subjects = [] }] = await Promise.all([
    notesQuery,
    supabase
      .from("subjects")
      .select("id,user_id,name,color,note_count,created_at")
      .eq("user_id", userData.user.id)
      .order("name"),
  ]);

  const typedNotes = (notes ?? []).map((note) => ({
    ...note,
    subjects: Array.isArray(note.subjects) ? note.subjects[0] ?? null : note.subjects,
  })) as Note[];

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 xl:px-8">
      <div className="flex min-h-0 flex-1">
        <NotesKanbanBoard
          notes={typedNotes}
          subjects={(subjects ?? []) as Subject[]}
          selectedSubjectId={selectedSubjectId}
        />
      </div>

    </main>
  );
}
