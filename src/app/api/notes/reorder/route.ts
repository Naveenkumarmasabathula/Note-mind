import { NextResponse } from "next/server";
import { validateBearerToken } from "@/lib/api-auth";

type ReorderUpdate = {
  id: string;
  position: number;
  subject_id: string | null;
};

export async function PATCH(request: Request) {
  try {
    const auth = await validateBearerToken(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { updates } = (await request.json()) as { updates?: ReorderUpdate[] };

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "updates must be an array." }, { status: 400 });
    }

    // SQL to create in Supabase:
    // CREATE OR REPLACE FUNCTION reorder_notes(updates jsonb)
    // RETURNS void AS $$
    // BEGIN
    //   UPDATE notes SET
    //     position = (update->>'position')::int,
    //     subject_id = (update->>'subject_id')::uuid
    //   FROM jsonb_array_elements(updates) AS update
    //   WHERE notes.id = (update->>'id')::uuid;
    // END;
    // $$ LANGUAGE plpgsql;
    const { error } = await auth.supabase.rpc("reorder_notes", { updates });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
