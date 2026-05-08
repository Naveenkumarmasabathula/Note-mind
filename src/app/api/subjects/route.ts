import { NextResponse } from "next/server";
import { validateBearerToken } from "@/lib/api-auth";

export async function POST(request: Request) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { name, color } = (await request.json()) as { name?: string; color?: string };
    const cleanName = name?.trim();

    if (!cleanName) {
      return NextResponse.json({ error: "Subject name is required." }, { status: 400 });
    }

    const { data: subject, error } = await auth.supabase
      .from("subjects")
      .insert({
        user_id: auth.user.id,
        name: cleanName,
        color: color || "#6366f1",
        note_count: 0,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, subject });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
