import { validateBearerToken } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { asObject, parseInteger, parseUuidOrNull } from "@/lib/validation";

type ReorderUpdate = {
  id: string;
  position: number;
  subject_id: string | null;
};

export async function PATCH(request: Request) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return apiError(auth.error, auth.status, "UNAUTHORIZED");

    const body = asObject(await request.json().catch(() => null));
    if (!body) return apiError("Invalid JSON body.", 400, "BAD_REQUEST");
    const updatesRaw = body.updates;

    if (!Array.isArray(updatesRaw) || updatesRaw.length > 500) {
      return apiError("updates must be an array (max 500).", 400, "BAD_REQUEST");
    }

    const updates: ReorderUpdate[] = [];
    for (const item of updatesRaw) {
      const update = asObject(item);
      if (!update) return apiError("Invalid update payload.", 400, "BAD_REQUEST");
      const id = parseUuidOrNull(update.id);
      const position = parseInteger(update.position, 0, 100000);
      const subjectId = parseUuidOrNull(update.subject_id);
      if (!id || position === null || (update.subject_id !== null && !subjectId)) {
        return apiError("Each update must include id, position and optional subject_id.", 400, "BAD_REQUEST");
      }
      updates.push({ id, position, subject_id: subjectId });
    }

    const { error } = await auth.supabase.rpc("reorder_notes", { updates });
    if (error) throw error;

    return apiSuccess({});
  } catch {
    return apiError("Unexpected error.", 500, "INTERNAL_ERROR");
  }
}
