// Password-protected: GET says whether the Teams reminder is configured; POST sends a test reminder now.
import { sendReminder } from "../lib/remind.mjs";

export default async (req) => {
  const admin = Netlify.env.get("ADMIN_PASSWORD");
  if (!admin || req.headers.get("x-admin-password") !== admin) return Response.json({ error: "password" }, { status: 401 });
  if (req.method === "GET") return Response.json({ configured: !!Netlify.env.get("TEAMS_WEBHOOK_URL") }, { headers: { "cache-control": "no-store" } });
  const r = await sendReminder({ test: true });
  return Response.json(r, { status: r.ok ? 200 : r.error === "not_configured" ? 501 : 502 });
};

export const config = { path: "/api/remind", method: ["GET", "POST"] };
