import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setEventStatus, getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["live", "pending", "rejected"]),
  outbreakSlug: z.string().min(1).optional().default("hondius-2026"),
  type: z.enum(["event", "case"]).optional().default("event"),
});

export async function POST(req: Request) {
  const expected = process.env.ADMIN_TOKEN ?? process.env.BROADCAST_ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_TOKEN not configured on server" },
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { id, status, outbreakSlug, type } = parsed.data;
  getDb();

  let ok = false;
  if (type === "event") {
    ok = setEventStatus(id, status, "admin");
  } else {
    // type === "case" — обновляем publish_status в live_cases
    const db = getDb();
    const result = db
      .prepare(
        "UPDATE live_cases SET publish_status = ?, updated_at = ? WHERE id = ?"
      )
      .run(status, Date.now(), id);
    ok = result.changes > 0;
  }

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: `${type} not found` },
      { status: 404 }
    );
  }

  try {
    revalidatePath(`/outbreak/${outbreakSlug}`);
    revalidatePath(`/outbreak/${outbreakSlug}/timeline`);
    revalidatePath(`/outbreak/${outbreakSlug}/cases`);
    revalidatePath("/");
    revalidatePath("/admin");
  } catch {
    /* ignore */
  }

  return NextResponse.json({ ok: true, type, id, status });
}
