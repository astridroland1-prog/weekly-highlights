// Archive of sent weekly mails, one per ISO week. Read: everyone; write: password.
// GET → list · GET ?week=YYYY-Www → one mail · POST {week, subject, html, text, method} → save (replaces that week's copy)
import { getStore } from "@netlify/blobs";

function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const WEEK = /^\d{4}-W\d{2}$/;


// Optional team code (TEAM_CODE): without it the board is open to anyone with the link.
function teamOk(req) {
  const code = (Netlify.env.get("TEAM_CODE") || "").trim().toLowerCase();
  if (!code) return true;
  const given = (req.headers.get("x-team-code") || "").trim().toLowerCase();
  const admin = Netlify.env.get("ADMIN_PASSWORD");
  return given === code || (!!admin && req.headers.get("x-admin-password") === admin);
}
const teamDenied = () => Response.json({ error: "team_code" }, { status: 403 });

export default async (req) => {
  // Reading the archive is open to the team (team code if set); saving needs Astrid's password.
  if (req.method === "GET" && !teamOk(req)) return teamDenied();
  if (req.method !== "GET") {
    const expected = Netlify.env.get("ADMIN_PASSWORD");
    if (!expected || !same(req.headers.get("x-admin-password") || "", expected)) return Response.json({ error: "password" }, { status: 401 });
  }
  const s = getStore({ name: "wh-archive", consistency: "strong" });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const week = url.searchParams.get("week");
    if (week) {
      if (!WEEK.test(week)) return Response.json({ error: "week" }, { status: 400 });
      const m = await s.get(week, { type: "json" });
      if (!m) return Response.json({ error: "none" }, { status: 404 });
      const { to, ...pub } = m;   // the recipient address stays private
      return Response.json(pub, { headers: { "cache-control": "no-store" } });
    }
    const { blobs } = await s.list();
    const list = [];
    for (const b of blobs) {
      const meta = await s.getMetadata(b.key);
      if (meta) { const { to, ...pub } = meta.metadata || {}; list.push({ week: b.key, ...pub }); }
    }
    list.sort((a, b) => b.week.localeCompare(a.week));
    return Response.json({ list }, { headers: { "cache-control": "no-store" } });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return Response.json({ error: "json" }, { status: 400 }); }
    const week = typeof body.week === "string" ? body.week : "";
    if (!WEEK.test(week)) return Response.json({ error: "week" }, { status: 400 });
    const html = typeof body.html === "string" ? body.html.slice(0, 500000) : "";
    if (!html) return Response.json({ error: "empty" }, { status: 400 });
    const rec = {
      week,
      subject: typeof body.subject === "string" ? body.subject.slice(0, 200) : "",
      method: body.method === "direct" ? "direct" : "mail",
      to: typeof body.to === "string" ? body.to.slice(0, 200) : "",
      sentAt: new Date().toISOString(),
      html,
      text: typeof body.text === "string" ? body.text.slice(0, 200000) : "",
    };
    await s.setJSON(week, rec, { metadata: { subject: rec.subject, sentAt: rec.sentAt, method: rec.method, to: rec.to } });
    return Response.json({ ok: true, sentAt: rec.sentAt });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/archive", method: ["GET", "POST"] };
