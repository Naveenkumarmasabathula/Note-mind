import { NextResponse } from "next/server";
import { validateBearerToken } from "@/lib/api-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type NoteUpdatePayload = {
  title?: string;
  subject_id?: string | null;
  difficulty?: "easy" | "medium" | "hard";
  summary?: string;
  key_points?: string[];
  revision_questions?: string[];
  diagram_needed?: boolean;
  diagram_description?: string | null;
  tags?: string[];
};

const noteFields = [
  "title",
  "subject_id",
  "difficulty",
  "summary",
  "key_points",
  "revision_questions",
  "diagram_needed",
  "diagram_description",
] as const;

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await context.params;
    const body = (await request.json()) as NoteUpdatePayload;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const field of noteFields) {
      if (field in body) updates[field] = body[field];
    }

    const { data: note, error: noteError } = await auth.supabase
      .from("notes")
      .update(updates)
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select("*,subjects(*),tags(*)")
      .single();

    if (noteError) throw noteError;

    if (Array.isArray(body.tags)) {
      await auth.supabase.from("tags").delete().eq("note_id", id);
      if (body.tags.length) {
        const { error: tagError } = await auth.supabase.from("tags").insert(
          body.tags.map((label) => ({
            note_id: id,
            label,
          })),
        );
        if (tagError) throw tagError;
      }
    }

    const { data: updatedNote, error: fetchError } = await auth.supabase
      .from("notes")
      .select("*,subjects(*),tags(*)")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ success: true, note: updatedNote ?? note });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await context.params;

    await auth.supabase.from("tags").delete().eq("note_id", id);
    const { error } = await auth.supabase.from("notes").delete().eq("id", id).eq("user_id", auth.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
