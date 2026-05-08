import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const [{ data: subjects = [] }, { data: notes = [] }] = await Promise.all([
    supabase.from("subjects").select("*").eq("user_id", userData.user.id).order("name"),
    supabase
      .from("notes")
      .select("id")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <DashboardShell
      email={userData.user.email}
      subjects={(subjects ?? []) as Subject[]}
      subjectsCount={(subjects ?? []).length}
      totalNotes={(notes ?? []).length}
    >
      {children}
    </DashboardShell>
  );
}
