import { summarizeConversation } from "@/lib/groq";
import { validateBearerToken } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { checkRateLimit, requestKey } from "@/lib/rate-limit";
import { asObject, parseDifficulty, parseOptionalString, parseRequiredString } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return apiError(auth.error, auth.status, "UNAUTHORIZED");

    const body = asObject(await request.json().catch(() => null));
    if (!body) return apiError("Invalid JSON body.", 400, "BAD_REQUEST");

    const limiter = checkRateLimit({
      key: requestKey(request, auth.user.id, "analyze"),
      limit: 20,
      windowMs: 60_000,
    });
    if (!limiter.allowed) {
      return apiError("Rate limit exceeded. Please retry shortly.", 429, "RATE_LIMITED");
    }

    const text = parseRequiredString(body.text, 16000);
    if (!text) {
      return apiError("Text is required.", 400, "BAD_REQUEST");
    }
    const requestedSubject = parseOptionalString(body.subject, 80);
    const requestedDifficulty = body.difficulty ? parseDifficulty(body.difficulty) : null;

    const result = await summarizeConversation([{ role: "user", text }]);
    const subjectName = requestedSubject || result.subject || "General";
    const difficulty = requestedDifficulty ?? result.difficulty;

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

    return apiSuccess({ note }, 201);
  } catch {
    return apiError("Unexpected error.", 500, "INTERNAL_ERROR");
  }
}
