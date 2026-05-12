import { validateBearerToken } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import {
  asObject,
  parseBoolean,
  parseDifficulty,
  parseJsonArray,
  parseOptionalString,
  parseUuidOrNull,
} from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const NOTE_SELECT =
  "id,user_id,subject_id,title,summary,key_points,revision_questions,difficulty,diagram_needed,diagram_description,source,is_manual,position,created_at,updated_at,subjects(id,name,color),tags(id,label,note_id)";

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return apiError(auth.error ?? "Unauthorized", auth.status ?? 401, "UNAUTHORIZED");

    const { id } = await context.params;
    const body = asObject(await request.json().catch(() => null));
    if (!body) return apiError("Invalid JSON body.", 400, "BAD_REQUEST");
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if ("title" in body) {
      const value = parseOptionalString(body.title, 180);
      if (!value) return apiError("title is invalid.", 400, "BAD_REQUEST");
      updates.title = value;
    }
    if ("summary" in body) {
      const value = parseOptionalString(body.summary, 5000);
      if (!value) return apiError("summary is invalid.", 400, "BAD_REQUEST");
      updates.summary = value;
    }
    if ("subject_id" in body) {
      const value = parseUuidOrNull(body.subject_id);
      if (body.subject_id !== null && !value) return apiError("subject_id is invalid.", 400, "BAD_REQUEST");
      updates.subject_id = value;
    }
    if ("difficulty" in body) {
      const value = parseDifficulty(body.difficulty);
      if (!value) return apiError("difficulty is invalid.", 400, "BAD_REQUEST");
      updates.difficulty = value;
    }
    if ("key_points" in body) {
      const value = parseJsonArray(body.key_points, 20, 280);
      if (!value) return apiError("key_points is invalid.", 400, "BAD_REQUEST");
      updates.key_points = value;
    }
    if ("revision_questions" in body) {
      const value = parseJsonArray(body.revision_questions, 20, 280);
      if (!value) return apiError("revision_questions is invalid.", 400, "BAD_REQUEST");
      updates.revision_questions = value;
    }
    if ("diagram_needed" in body) {
      const value = parseBoolean(body.diagram_needed);
      if (value === null) return apiError("diagram_needed is invalid.", 400, "BAD_REQUEST");
      updates.diagram_needed = value;
    }
    if ("diagram_description" in body) {
      const value = parseOptionalString(body.diagram_description, 5000, { allowEmpty: true });
      if (body.diagram_description !== null && value === null) {
        return apiError("diagram_description is invalid.", 400, "BAD_REQUEST");
      }
      updates.diagram_description = value;
    }

    if (Object.keys(updates).length === 1) {
      return apiError("No valid fields to update.", 400, "BAD_REQUEST");
    }

    const { data: note, error: noteError } = await auth.supabase
      .from("notes")
      .update(updates)
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select(NOTE_SELECT)
      .single();

    if (noteError) throw noteError;

    if ("tags" in body) {
      const tags = parseJsonArray(body.tags, 20, 50);
      if (!tags) return apiError("tags is invalid.", 400, "BAD_REQUEST");
      await auth.supabase.from("tags").delete().eq("note_id", id);
      if (tags.length) {
        const { error: tagError } = await auth.supabase.from("tags").insert(
          tags.map((label) => ({
            note_id: id,
            label,
          })),
        );
        if (tagError) throw tagError;
      }
    }

    const { data: updatedNote, error: fetchError } = await auth.supabase
      .from("notes")
      .select(NOTE_SELECT)
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .single();

    if (fetchError) throw fetchError;

    return apiSuccess({ note: updatedNote ?? note });
  } catch {
    return apiError("Unexpected error.", 500, "INTERNAL_ERROR");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return apiError(auth.error ?? "Unauthorized", auth.status ?? 401, "UNAUTHORIZED");

    const { id } = await context.params;

    await auth.supabase.from("tags").delete().eq("note_id", id);
    const { error } = await auth.supabase.from("notes").delete().eq("id", id).eq("user_id", auth.user.id);

    if (error) throw error;

    return apiSuccess({});
  } catch {
    return apiError("Unexpected error.", 500, "INTERNAL_ERROR");
  }
}
