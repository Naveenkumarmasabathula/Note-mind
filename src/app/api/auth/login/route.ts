import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseRequiredString } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as unknown;
    const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    if (!payload) return apiError("Invalid JSON body.", 400, "BAD_REQUEST");

    const email = parseRequiredString(payload.email, 320);
    const password = parseRequiredString(payload.password, 128);
    if (!email || !password) {
      return apiError("Email and password are required.", 400, "BAD_REQUEST");
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limiter = checkRateLimit({ key: `login:${ip}:${email.toLowerCase()}`, limit: 10, windowMs: 60_000 });
    if (!limiter.allowed) {
      return apiError("Too many login attempts. Please retry shortly.", 429, "RATE_LIMITED");
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return apiError("Invalid email or password.", 401, "UNAUTHORIZED");
    }

    return apiSuccess({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: { email: data.user.email },
    });
  } catch {
    return apiError("Unexpected error.", 500, "INTERNAL_ERROR");
  }
}
