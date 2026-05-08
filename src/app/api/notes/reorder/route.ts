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

    const results = await Promise.all(
      updates.map((update) =>
        auth.supabase
          .from("notes")
          .update({
            position: update.position,
            subject_id: update.subject_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", update.id)
          .eq("user_id", auth.user.id),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
