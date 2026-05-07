import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setEventStatus, getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["live", "pending", "rejected"]),
  outbreakSlug: z.string().min(1),
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

  getDb();
  const ok = setEventStatus(parsed.data.id, parsed.data.status, "admin");
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
  }

  try {
    revalidatePath(`/outbreak/${parsed.data.outbreakSlug}`);
    revalidatePath(`/outbreak/${parsed.data.outbreakSlug}/timeline`);
    revalidatePath("/");
    revalidatePath("/admin");
  } catch {
    /* ignore */
  }

  return NextResponse.json({ ok: true });
}
