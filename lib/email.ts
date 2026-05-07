/**
 * Resend wrapper using REST API directly (no SDK).
 * Set RESEND_API_KEY and EMAIL_FROM in env.
 */

const API_URL = "https://api.resend.com/emails";

export interface SendOpts {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(opts: SendOpts): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Outbreak Tracker <noreply@example.com>";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — email skipped:", opts.subject, "→", opts.to);
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text ?? stripHtml(opts.html),
        reply_to: opts.replyTo,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `${res.status}: ${errText}` };
    }

    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hondius-watch.com";

export function confirmEmailHtml(token: string): string {
  const link = `${SITE_URL}/api/confirm/${token}`;
  return `
<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 32px;">
  <div style="border-bottom: 1px solid #e5e5e5; padding-bottom: 16px; margin-bottom: 24px;">
    <strong style="font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase; color: #ff3b30;">▸ Outbreak Tracker</strong>
  </div>
  <h1 style="font-size: 22px; margin: 0 0 12px;">Confirm your subscription</h1>
  <p>You requested updates from the MV Hondius hantavirus outbreak tracker. Click below to confirm your email address.</p>
  <p style="margin: 24px 0;">
    <a href="${link}" style="background: #1a1a1a; color: #fff; padding: 12px 20px; text-decoration: none; font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase; font-size: 13px;">Confirm subscription →</a>
  </p>
  <p style="color: #6b6b6b; font-size: 13px;">If you did not request this, ignore this email — your address will not be added to the list.</p>
  <p style="color: #9a9a9a; font-size: 12px; margin-top: 32px; border-top: 1px solid #e5e5e5; padding-top: 16px;">Link: <a href="${link}" style="color: #6b6b6b;">${link}</a></p>
</body></html>`;
}

export function broadcastEmailHtml(opts: {
  outbreakTitle: string;
  outbreakUrl: string;
  events: Array<{ date: string; title: string; description: string }>;
  unsubscribeToken: string;
}): string {
  const unsubLink = `${SITE_URL}/api/unsubscribe/${opts.unsubscribeToken}`;
  const eventsHtml = opts.events
    .map(
      (e) => `
      <li style="margin-bottom: 16px;">
        <div style="font-family: monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #6b6b6b;">${e.date}</div>
        <div style="font-weight: 600; margin: 2px 0;">${e.title}</div>
        <div style="color: #6b6b6b; font-size: 14px;">${e.description}</div>
      </li>`
    )
    .join("");
  return `
<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.55; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 32px;">
  <div style="border-bottom: 1px solid #e5e5e5; padding-bottom: 16px; margin-bottom: 24px;">
    <strong style="font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase; color: #ff3b30;">▸ Outbreak Tracker</strong>
  </div>
  <h1 style="font-size: 22px; margin: 0 0 8px;">${opts.outbreakTitle}</h1>
  <p style="color: #6b6b6b; margin: 0 0 24px;">New events since your last update.</p>
  <ul style="list-style: none; padding: 0; margin: 0;">
    ${eventsHtml}
  </ul>
  <p style="margin-top: 24px;">
    <a href="${opts.outbreakUrl}" style="color: #ff3b30; text-decoration: underline;">View full dashboard →</a>
  </p>
  <p style="color: #9a9a9a; font-size: 12px; margin-top: 40px; border-top: 1px solid #e5e5e5; padding-top: 16px;">
    You are receiving this email because you subscribed to outbreak updates. <a href="${unsubLink}" style="color: #6b6b6b;">Unsubscribe</a>.
  </p>
</body></html>`;
}
