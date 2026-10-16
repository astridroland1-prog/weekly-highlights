// Saves one contribution (text + references to uploaded media) under its ISO week.
import { getStore } from "@netlify/blobs";

const str = (v, max) => (typeof v === "string" ? v.replace(/\r/g, "").trim().slice(0, max) : "");
const isKey = (k) => typeof k === "string" && /^[0-9a-f-]{36}$/.test(k);

export default async (req) => {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "json" }, { status: 400 }); }
  const week = str(body.week, 10);
  if (!/^\d{4}-W\d{2}$/.test(week)) return Response.json({ error: "week" }, { status: 400 });
  const src = body.items || {};
  const list = (a, n) => (Array.isArray(a) ? a.slice(0, n) : []);
  const items = {
    highlight: list(src.highlight, 20).map((i) => ({
      title: str(i.title, 300), detail: str(i.detail, 4000), next: str(i.next, 300), link: str(i.link, 1000),
      media: list(i.media, 12).filter((m) => m && isKey(m.key)).map((m) => ({ key: m.key, kind: m.kind === "vid" ? "vid" : "img", name: str(m.name, 120) })),
    })).filter((i) => i.title || i.detail || i.media.length),
    outlook: list(src.outlook, 30).map((i) => ({ title: str(i.title, 300) })).filter((i) => i.title),
    team: list(src.team, 20).map((i) => ({ title: str(i.title, 300), detail: str(i.detail, 2000) })).filter((i) => i.title || i.detail),
  };
  if (!items.highlight.length && !items.outlook.length && !items.team.length) return Response.json({ error: "empty" }, { status: 400 });
  const key = `${week}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  await getStore({ name: "wh-entries", consistency: "strong" }).setJSON(key, { week, createdAt: new Date().toISOString(), lang: str(body.lang, 2), items });
  return Response.json({ ok: true });
};

export const config = { path: "/api/submit", method: "POST" };
