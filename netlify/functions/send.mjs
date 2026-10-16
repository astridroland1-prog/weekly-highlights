// Password-protected: sends the compiled weekly mail through Resend (https://resend.com).
// Needs RESEND_API_KEY; optional MAIL_TO (default astrid.roland@fgg.ch) and MAIL_FROM.
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
  if (req.method === "GET") return Response.json({ configured: !!key, to });
  if (!key) return Response.json({ error: "not_configured", to }, { status: 501 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "json" }, { status: 400 }); }
  const subject = typeof body.subject === "string" ? body.subject.slice(0, 200) : "Weekly Highlights";
  const html = typeof body.html === "string" ? body.html.slice(0, 500000) : "";
  const text = typeof body.text === "string" ? body.text.slice(0, 200000) : "";
  if (!html) return Response.json({ error: "empty" }, { status: 400 });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: Netlify.env.get("MAIL_FROM") || "Weekly Highlights <onboarding@resend.dev>",
      to: [to], subject, html, text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    return Response.json({ error: "provider", status: res.status, detail: detail.slice(0, 300) }, { status: 502 });
  }
  return Response.json({ ok: true, to });
};

export const config = { path: "/api/send", method: ["GET", "POST"] };
