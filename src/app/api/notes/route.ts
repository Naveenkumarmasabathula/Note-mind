import { validateBearerToken } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import {
  asObject,
  parseBoolean,
  parseDifficulty,
  parseJsonArray,
  parseOptionalString,
  parseRequiredString,
} from "@/lib/validation";

const NOTE_SELECT =
  "id,user_id,subject_id,title,summary,key_points,revision_questions,difficulty,diagram_needed,diagram_description,source,is_manual,position,created_at,updated_at,subjects(id,name,color),tags(id,label,note_id)";

const SUBJECT_COLORS: Record<string, string> = {
  Programming: "#6366f1",
  Mathematics: "#f59e0b",
  Physics: "#3b82f6",
  Chemistry: "#10b981",
  Biology: "#22c55e",
  History: "#f97316",
  Economics: "#8b5cf6",
  General: "#6b7280",
};

export async function POST(request: Request) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return apiError(auth.error ?? "Unauthorized", auth.status ?? 401, "UNAUTHORIZED");

    const body = asObject(await request.json().catch(() => null));
    if (!body) return apiError("Invalid JSON body.", 400, "BAD_REQUEST");

    const title = parseRequiredString(body.title, 180);
    const summary = parseRequiredString(body.summary, 5000);
    const subjectName = parseOptionalString(body.subject, 80);
    const difficulty = parseDifficulty(body.difficulty) ?? "easy";
    const keyPoints = parseJsonArray(body.key_points ?? [], 20, 280);
    const revisionQuestions = parseJsonArray(body.revision_questions ?? [], 20, 280);
    const diagramNeeded = parseBoolean(body.diagram_needed) ?? false;
    const diagramDescription =
      parseOptionalString(body.diagram_description, 5000, { allowEmpty: true }) ?? null;
    const tags = parseJsonArray(body.tags ?? [], 20, 50);
    const source = parseOptionalString(body.source, 32) ?? "chatgpt";
    const isManual = parseBoolean(body.is_manual) ?? false;

    if (!title || !summary) {
      return apiError("title and summary are required.", 400, "BAD_REQUEST");
    }
    if (!keyPoints || !revisionQuestions || !tags) {
      return apiError("Invalid key_points, revision_questions, or tags format.", 400, "BAD_REQUEST");
    }

    let subjectId: string | null = null;
    if (subjectName) {
      const { data: existingSubject, error: existingSubjectError } = await auth.supabase
        .from("subjects")
        .select("id")
        .eq("user_id", auth.user.id)
        .eq("name", subjectName)
        .maybeSingle();
      if (existingSubjectError) throw existingSubjectError;

      if (existingSubject?.id) {
        subjectId = existingSubject.id;
      } else {
        const { data: newSubject, error: subjectError } = await auth.supabase
          .from("subjects")
          .insert({
            user_id: auth.user.id,
            name: subjectName,
            color: SUBJECT_COLORS[subjectName] ?? "#6366f1",
            note_count: 0,
          })
          .select("id")
          .single();
        if (subjectError) throw subjectError;
        if (!newSubject?.id) throw new Error("Unable to create subject.");
        subjectId = newSubject.id;
      }
    }

    const { data: note, error: noteError } = await auth.supabase
      .from("notes")
      .insert({
        user_id: auth.user.id,
        subject_id: subjectId,
        title,
        summary,
        key_points: keyPoints,
        revision_questions: revisionQuestions,
        difficulty,
        diagram_needed: diagramNeeded,
        diagram_description: diagramDescription,
        source,
        is_manual: isManual,
      })
      .select(NOTE_SELECT)
      .single();

    if (noteError || !note) throw noteError ?? new Error("Unable to create note.");

    if (tags.length) {
      const { error: tagsError } = await auth.supabase
        .from("tags")
        .insert(tags.map((label) => ({ note_id: note.id, label })));
      if (tagsError) throw tagsError;
    }

    const { data: fullNote, error: fullNoteError } = await auth.supabase
      .from("notes")
      .select(NOTE_SELECT)
      .eq("id", note.id)
      .eq("user_id", auth.user.id)
      .single();

    if (fullNoteError || !fullNote) throw fullNoteError ?? new Error("Unable to load created note.");

    return apiSuccess({
      note: {
        ...fullNote,
        subjects: Array.isArray(fullNote.subjects) ? fullNote.subjects[0] ?? null : fullNote.subjects,
      },
    }, 201);
  } catch {
    return apiError("Unexpected error.", 500, "INTERNAL_ERROR");
  }
}
