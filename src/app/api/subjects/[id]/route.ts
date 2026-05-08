import { NextResponse } from "next/server";
import { validateBearerToken } from "@/lib/api-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await context.params;
    const body = (await request.json()) as { name?: string; color?: string };
    const updates: Record<string, string> = {};

    if (body.name !== undefined) {
      const cleanName = body.name.trim();
      if (!cleanName) {
        return NextResponse.json({ error: "Subject name is required." }, { status: 400 });
      }
      updates.name = cleanName;
    }
    if (body.color !== undefined) updates.color = body.color;

    const { error } = await auth.supabase
      .from("subjects")
      .update(updates)
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await context.params;

    const { error: notesError } = await auth.supabase
      .from("notes")
      .update({ subject_id: null, updated_at: new Date().toISOString() })
      .eq("subject_id", id)
      .eq("user_id", auth.user.id);

    if (notesError) throw notesError;

    const { error } = await auth.supabase.from("subjects").delete().eq("id", id).eq("user_id", auth.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
