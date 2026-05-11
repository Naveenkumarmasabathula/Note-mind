"use client";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type ClientApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function clientApiFetch<T = unknown>(path: string, options: ClientApiOptions = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) throw new Error("Please sign in again.");

  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.error || payload?.message || "Request failed.";
    throw new Error(message);
  }
  return payload as T;
}
