import { validateBearerToken } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { parseOptionalString, parseRequiredString } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return apiError(auth.error, auth.status, "UNAUTHORIZED");

    const body = (await request.json().catch(() => null)) as unknown;
    const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    if (!payload) return apiError("Invalid JSON body.", 400, "BAD_REQUEST");

    const cleanName = parseRequiredString(payload.name, 80);
    if (!cleanName) {
      return apiError("Subject name is required.", 400, "BAD_REQUEST");
    }
    const color = parseOptionalString(payload.color, 20);
    const safeColor =
      color && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : "#6366f1";

    const { data: subject, error } = await auth.supabase
      .from("subjects")
      .insert({
        user_id: auth.user.id,
        name: cleanName,
        color: safeColor,
        note_count: 0,
      })
      .select("id,user_id,name,color,note_count,created_at")
      .single();

    if (error) throw error;

    return apiSuccess({ subject }, 201);
  } catch {
    return apiError("Unexpected error.", 500, "INTERNAL_ERROR");
  }
}
