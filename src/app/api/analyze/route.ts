import { NextResponse } from "next/server";
import { summarizeConversation } from "@/lib/groq";
import { validateBearerToken } from "@/lib/api-auth";
import type { Difficulty } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await request.json()) as {
      text?: string;
      subject?: string;
      difficulty?: Difficulty;
    };

    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const result = await summarizeConversation([{ role: "user", text }]);
    const subjectName = body.subject?.trim() || result.subject || "General";
    const difficulty = body.difficulty ?? result.difficulty;

    let subjectId: string | null = null;
    const { data: existingSubject } = await auth.supabase
      .from("subjects")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("name", subjectName)
      .single();

    if (existingSubject?.id) {
      subjectId = existingSubject.id;
    } else {
      const { data: createdSubject, error: subjectError } = await auth.supabase
        .from("subjects")
        .insert({
          user_id: auth.user.id,
          name: subjectName,
          color: "#6366f1",
          note_count: 0,
        })
        .select("id")
        .single();

      if (subjectError) throw subjectError;
      subjectId = createdSubject?.id ?? null;
    }

    const { data: note, error: noteError } = await auth.supabase
      .from("notes")
      .insert({
        user_id: auth.user.id,
        subject_id: subjectId,
        title: result.title,
        summary: result.summary,
        key_points: result.key_points ?? [],
        revision_questions: result.revision_questions ?? [],
        difficulty,
        diagram_needed: result.diagram_needed ?? false,
        diagram_description: result.diagram_description ?? null,
        source: "chatgpt",
        is_manual: false,
        position: 0,
      })
      .select("id")
      .single();

    if (noteError) throw noteError;

    if (Array.isArray(result.tags) && result.tags.length) {
      await auth.supabase.from("tags").insert(
        result.tags.map((label) => ({
          note_id: note.id,
          label,
        })),
      );
    }

    if (subjectId) {
      await auth.supabase.rpc("increment_note_count", { subject_id_input: subjectId });
    }

    return NextResponse.json({ success: true, note });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
