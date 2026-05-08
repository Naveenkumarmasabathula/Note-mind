import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type AuthenticatedRequest = {
  supabase: SupabaseClient;
  user: User;
  error?: never;
  status?: never;
};

export type FailedAuth = {
  error: string;
  status: number;
  supabase?: never;
  user?: never;
};

export async function validateBearerToken(request: Request): Promise<AuthenticatedRequest | FailedAuth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { error: "Supabase is not configured.", status: 500 };
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return { error: "No token provided", status: 401 };
  }

  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: `Unauthorized${error?.message ? `: ${error.message}` : ""}`, status: 401 };
  }

  return { supabase, user };
}
