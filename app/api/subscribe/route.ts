import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { sendEmail, confirmEmailHtml } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  const db = getDb();
  const now = Date.now();

  const existing = db
    .prepare("SELECT id, confirmed FROM subscribers WHERE email = ?")
    .get(email) as { id: number; confirmed: number } | undefined;

  if (existing && existing.confirmed === 1) {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  const confirmToken = crypto.randomBytes(24).toString("base64url");
  const unsubToken = existing
    ? (db
        .prepare("SELECT unsubscribe_token FROM subscribers WHERE id = ?")
        .get(existing.id) as { unsubscribe_token: string }).unsubscribe_token
    : crypto.randomBytes(24).toString("base64url");

  if (existing) {
    db.prepare(
      "UPDATE subscribers SET confirm_token = ?, created_at = ? WHERE id = ?"
    ).run(confirmToken, now, existing.id);
  } else {
    db.prepare(
      `INSERT INTO subscribers (email, confirm_token, unsubscribe_token, confirmed, created_at)
       VALUES (?, ?, ?, 0, ?)`
    ).run(email, confirmToken, unsubToken, now);
  }

  const result = await sendEmail({
    to: email,
    subject: "Confirm your Outbreak Tracker subscription",
    html: confirmEmailHtml(confirmToken),
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "Email send failed", detail: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
