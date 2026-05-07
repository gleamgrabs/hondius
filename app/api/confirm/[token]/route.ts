import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const db = getDb();
  const row = db
    .prepare("SELECT id, confirmed FROM subscribers WHERE confirm_token = ?")
    .get(params.token) as { id: number; confirmed: number } | undefined;

  if (!row) {
    return new NextResponse(html("Invalid or expired link", "This confirmation link is no longer valid."), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (row.confirmed === 0) {
    db.prepare(
      "UPDATE subscribers SET confirmed = 1, confirmed_at = ?, confirm_token = NULL WHERE id = ?"
    ).run(Date.now(), row.id);
  }

  return new NextResponse(
    html("Subscription confirmed", "You will receive updates when new events are reported."),
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function html(title: string, message: string) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#07090d;color:#e6e8ea;font-family:JetBrains Mono,monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;">
  <div style="max-width:480px;border:1px solid #1a2230;background:#0d1117;padding:32px;text-align:center;">
    <div style="color:#ff3b30;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:12px;">▸ Outbreak Tracker</div>
    <h1 style="margin:0 0 12px;font-size:20px;text-transform:uppercase;letter-spacing:0.05em;">${title}</h1>
    <p style="color:#8a93a0;font-size:14px;line-height:1.6;">${message}</p>
    <a href="/" style="display:inline-block;margin-top:20px;color:#ff3b30;text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">▸ Back to dashboard</a>
  </div>
</body></html>`;
}
