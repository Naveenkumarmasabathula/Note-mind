"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // During `next build` (SSG prerendering) these vars may be absent.
    // API calls will fail gracefully; page-level guards (hasSupabaseEnv)
    // redirect unauthenticated users before any data fetching occurs.
    return createBrowserClient(
      "http://127.0.0.1:54321",
      // Three-segment dummy JWT: header.payload.signature — valid structure for build-time
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJidWlsZC1wbGFjZWhvbGRlciJ9.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
  }

  return createBrowserClient(url, anonKey);
}
