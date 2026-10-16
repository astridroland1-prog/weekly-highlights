// Password-protected: sends the compiled weekly mail through Resend (https://resend.com).
// Needs RESEND_API_KEY; optional MAIL_TO (default astrid.roland@fgg.ch) and MAIL_FROM.
// Photos are embedded in the mail as inline attachments (cid:), so Outlook shows them without "download pictures".
import { getStore } from "@netlify/blobs";

const MAX_INLINE = 30 * 1024 * 1024;   // keep the whole mail well below the provider limit

async function embedImages(html) {
  const re = /(<img\b[^>]*\bsrc=")(?:https?:\/\/[^"\/]+)?\/api\/media\/([0-9a-f-]{36})(")/gi;
  const keys = [...new Set([...html.matchAll(re)].map((m) => m[2]))];
  if (!keys.length) return { html, attachments: [] };
  const store = getStore("wh-media");
  const attachments = [], ok = new Set();
  let total = 0;
  for (const key of keys) {
    const e = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (!e || !e.data) continue;
    if (total + e.data.byteLength > MAX_INLINE) break;
    total += e.data.byteLength;
    const type = e.metadata?.type || "image/jpeg";
    const ext = (type.split("/")[1] || "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "");
    attachments.push({ filename: `foto-${key.slice(0, 8)}.${ext}`, content: Buffer.from(e.data).toString("base64"), content_id: "wh-" + key, content_type: type });
    ok.add(key);
  }
  return { html: html.replace(re, (all, a, key, c) => (ok.has(key) ? a + "cid:wh-" + key + c : all)), attachments };
}
function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export default async (req) => {
  const expected = Netlify.env.get("ADMIN_PASSWORD");
  if (!expected || !same(req.headers.get("x-admin-password") || "", expected)) return Response.json({ error: "password" }, { status: 401 });
  const key = Netlify.env.get("RESEND_API_KEY");
  const to = Netlify.env.get("MAIL_TO") || "astrid.roland@fgg.ch";
  if (req.method === "GET") return Response.json({ configured: !!key, to }, { headers: { "cache-control": "no-store" } });
  if (!key) return Response.json({ error: "not_configured", to }, { status: 501 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "json" }, { status: 400 }); }
  const subject = typeof body.subject === "string" ? body.subject.slice(0, 200) : "Weekly Highlights";
  const html = typeof body.html === "string" ? body.html.slice(0, 500000) : "";
  const text = typeof body.text === "string" ? body.text.slice(0, 200000) : "";
  if (!html) return Response.json({ error: "empty" }, { status: 400 });
  let mail = { html, attachments: [] };
  try { mail = await embedImages(html); } catch { /* keep linked images */ }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: Netlify.env.get("MAIL_FROM") || "Weekly Highlights <onboarding@resend.dev>",
      to: [to], subject, html: mail.html, text,
      ...(mail.attachments.length ? { attachments: mail.attachments } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    return Response.json({ error: "provider", status: res.status, detail: detail.slice(0, 300) }, { status: 502 });
  }
  return Response.json({ ok: true, to, photos: mail.attachments.length });
};

export const config = { path: "/api/send", method: ["GET", "POST"] };
