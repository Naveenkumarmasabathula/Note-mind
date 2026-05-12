import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: subjects = [] }, notesResult] = await Promise.all([
    supabase
      .from("subjects")
      .select("id,user_id,name,color,note_count,created_at")
      .eq("user_id", user.id)      
      .order("name"),
    supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  return (
    <DashboardShell
      email={user.email}
      subjects={(subjects ?? []) as Subject[]}
      subjectsCount={(subjects ?? []).length}
      totalNotes={notesResult.count ?? 0}
    >
      {children}
    </DashboardShell>
  );
}
