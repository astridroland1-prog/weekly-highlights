// Password-protected: lists a week's contributions (GET ?week=) or deletes one (DELETE ?key=).
import { getStore } from "@netlify/blobs";

function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export default async (req) => {
  const expected = Netlify.env.get("ADMIN_PASSWORD");
  if (!expected) return Response.json({ error: "not_configured" }, { status: 500 });
  if (!same(req.headers.get("x-admin-password") || "", expected)) return Response.json({ error: "password" }, { status: 401 });
  const url = new URL(req.url);
  const store = getStore({ name: "wh-entries", consistency: "strong" });
  if (req.method === "DELETE") {
    const key = url.searchParams.get("key") || "";
    if (!/^\d{4}-W\d{2}\/[\w-]+$/.test(key)) return Response.json({ error: "key" }, { status: 400 });
    await store.delete(key);
    return Response.json({ ok: true });
  }
  const week = url.searchParams.get("week") || "";
  if (!/^\d{4}-W\d{2}$/.test(week)) return Response.json({ error: "week" }, { status: 400 });
  const { blobs } = await store.list({ prefix: week + "/" });
  const entries = [];
  for (const b of blobs.sort((x, y) => x.key.localeCompare(y.key))) {
    const e = await store.get(b.key, { type: "json" });
    if (e) entries.push({ key: b.key, ...e });
  }
  return Response.json({ week, entries });
};

export const config = { path: "/api/admin", method: ["GET", "DELETE"] };
