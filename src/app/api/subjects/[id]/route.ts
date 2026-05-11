import { validateBearerToken } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { parseOptionalString } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return apiError(auth.error ?? "Unauthorized", auth.status ?? 401, "UNAUTHORIZED");

    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as unknown;
    const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    if (!payload) return apiError("Invalid JSON body.", 400, "BAD_REQUEST");
    const updates: Record<string, string> = {};

    if (payload.name !== undefined) {
      const cleanName = parseOptionalString(payload.name, 80);
      if (!cleanName) {
        return apiError("Subject name is required.", 400, "BAD_REQUEST");
      }
      updates.name = cleanName;
    }
    if (payload.color !== undefined) {
      const color = parseOptionalString(payload.color, 20);
      if (!color || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
        return apiError("Color must be a valid hex value.", 400, "BAD_REQUEST");
      }
      updates.color = color;
    }
    if (!Object.keys(updates).length) return apiError("No valid fields to update.", 400, "BAD_REQUEST");

    const { error } = await auth.supabase
      .from("subjects")
      .update(updates)
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (error) throw error;

    return apiSuccess({});
  } catch {
    return apiError("Unexpected error.", 500, "INTERNAL_ERROR");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return apiError(auth.error ?? "Unauthorized", auth.status ?? 401, "UNAUTHORIZED");

    const { id } = await context.params;

    const { error: notesError } = await auth.supabase
      .from("notes")
      .update({ subject_id: null, updated_at: new Date().toISOString() })
      .eq("subject_id", id)
      .eq("user_id", auth.user.id);

    if (notesError) throw notesError;

    const { error } = await auth.supabase.from("subjects").delete().eq("id", id).eq("user_id", auth.user.id);

    if (error) throw error;

    return apiSuccess({});
  } catch {
    return apiError("Unexpected error.", 500, "INTERNAL_ERROR");
  }
}
