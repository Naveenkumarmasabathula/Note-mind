import { createClient } from "@supabase/supabase-js";
import { apiError, apiSuccess } from "@/lib/api-response";
import { parseRequiredString } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as unknown;
    const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    if (!payload) return apiError("Invalid JSON body.", 400, "BAD_REQUEST");
    const refreshToken = parseRequiredString(payload.refresh_token, 4096);

    if (!refreshToken) {
      return apiError("No refresh token provided.", 400, "BAD_REQUEST");
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return apiError("Supabase is not configured.", 500, "INTERNAL_ERROR");
    }

    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      return apiError("Session expired, please login again.", 401, "UNAUTHORIZED");
    }

    return apiSuccess({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch {
    return apiError("Unexpected error.", 500, "INTERNAL_ERROR");
  }
}
