import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // During `next build` (SSG prerendering) these vars may be absent.
    // Page-level guards (hasSupabaseEnv) prevent data fetches from running
    // in production when env vars are missing.
    return createServerClient(
      "http://127.0.0.1:54321",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.build-placeholder",
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* no-op for build placeholder */ },
        },
      },
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot always set cookies; middleware handles refreshes.
        }
      },
    },
  });
}
