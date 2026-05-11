import { validateBearerToken } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { asObject, parseInteger, parseRequiredString } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return apiError(auth.error ?? "Unauthorized", auth.status ?? 401, "UNAUTHORIZED");

    const body = asObject(await request.json().catch(() => null));
    if (!body) return apiError("Invalid JSON body.", 400, "BAD_REQUEST");

    const noteId = parseRequiredString(body.note_id, 80);
    const score = parseInteger(body.score, 1, 5);
    if (!noteId || score === null) {
      return apiError("note_id and score (1-5) are required.", 400, "BAD_REQUEST");
    }

    const status = parseRequiredString(body.status, 40) ?? "reviewed";

    const { error } = await auth.supabase.from("revisions").insert({
      note_id: noteId,
      user_id: auth.user.id,
      score,
      status,
      revised_at: new Date().toISOString(),
    });

    if (error) throw error;

    return apiSuccess({}, 201);
  } catch {
    return apiError("Unexpected error.", 500, "INTERNAL_ERROR");
  }
}
