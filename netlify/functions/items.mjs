// Shared weekly board: everyone with the link can list, add, edit and delete entries.
// GET /api/items?week=YYYY-Www  ·  POST /api/items  ·  PUT /api/items?id=…  (If-Match: etag)
// DELETE /api/items?id=…  moves an entry to the bin (soft delete).
// Astrid only (x-admin-password): GET ?week=…&bin=1 lists the bin · PUT ?id=…&restore=1 restores an entry.
import { getStore } from "@netlify/blobs";

const SECTIONS = ["highlight", "outlook", "team"];
const str = (v, max) => (typeof v === "string" ? v.replace(/\r/g, "").trim().slice(0, max) : "");
const isKey = (k) => typeof k === "string" && /^[0-9a-f-]{36}$/.test(k);
const store = () => getStore({ name: "wh-items", consistency: "strong" });

function fields(section, src) {
  const out = { title: str(src.title, 300) };
  if (section !== "outlook") out.detail = str(src.detail, 4000);
  if (section === "highlight") {
    out.link = str(src.link, 1000);
    out.media = (Array.isArray(src.media) ? src.media.slice(0, 12) : [])
      .filter((m) => m && isKey(m.key))
      .map((m) => ({ key: m.key, kind: m.kind === "vid" ? "vid" : "img", name: str(m.name, 120) }));
  }
  const empty = !out.title && !out.detail && !(out.media && out.media.length);
  return empty ? null : out;
}

// Current ETag of an entry (read back after a write, so the editor can detect later conflicts).
async function etagOf(s, id) {
  const m = await s.getMetadata(id);
  return (m && m.etag) || "";
}

function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const isAdmin = (req) => { const p = Netlify.env.get("ADMIN_PASSWORD"); return !!p && same(req.headers.get("x-admin-password") || "", p); };
const ID = /^\d{4}-W\d{2}\/[\w-]+$/;

export default async (req) => {
  const url = new URL(req.url);
  const s = store();

  if (req.method === "GET") {
    const week = url.searchParams.get("week") || "";
    if (!/^\d{4}-W\d{2}$/.test(week)) return Response.json({ error: "week" }, { status: 400 });
    const bin = url.searchParams.get("bin") === "1";
    if (bin && !isAdmin(req)) return Response.json({ error: "password" }, { status: 401 });
    const { blobs } = await s.list({ prefix: week + "/" });
    const items = [];
    for (const b of blobs.sort((x, y) => x.key.localeCompare(y.key))) {
      const r = await s.getWithMetadata(b.key, { type: "json" });
      if (r && r.data && !!r.data.deleted === bin) items.push({ ...r.data, etag: r.etag });
    }
    return Response.json({ week, items }, { headers: { "cache-control": "no-store" } });
  }

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id") || "";
    if (!ID.test(id)) return Response.json({ error: "id" }, { status: 400 });
    const cur = await s.getWithMetadata(id, { type: "json" });
    if (!cur || !cur.data) return Response.json({ error: "gone" }, { status: 404 });
    const item = { ...cur.data, deleted: true, deletedAt: new Date().toISOString() };
    await s.setJSON(id, item);
    return Response.json({ ok: true });
  }

  if (req.method === "PUT" && url.searchParams.get("restore") === "1") {
    if (!isAdmin(req)) return Response.json({ error: "password" }, { status: 401 });
    const id = url.searchParams.get("id") || "";
    if (!ID.test(id)) return Response.json({ error: "id" }, { status: 400 });
    const cur = await s.getWithMetadata(id, { type: "json" });
    if (!cur || !cur.data) return Response.json({ error: "gone" }, { status: 404 });
    const { deleted, deletedAt, ...rest } = cur.data;
    await s.setJSON(id, { ...rest, updatedAt: new Date().toISOString() });
    return Response.json({ ok: true });
  }

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "json" }, { status: 400 }); }

  if (req.method === "POST") {
    const week = str(body.week, 10), section = str(body.section, 12);
    if (!/^\d{4}-W\d{2}$/.test(week) || !SECTIONS.includes(section)) return Response.json({ error: "input" }, { status: 400 });
    const f = fields(section, body);
    if (!f) return Response.json({ error: "empty" }, { status: 400 });
    const now = new Date().toISOString();
    const id = `${week}/${Date.now()}-${section}-${crypto.randomUUID().slice(0, 8)}`;
    const item = { id, week, section, ...f, createdAt: now, updatedAt: now };
    await s.setJSON(id, item, { onlyIfNew: true });
    return Response.json({ ...item, etag: await etagOf(s, id) });
  }

  if (req.method === "PUT") {
    const id = url.searchParams.get("id") || "";
    if (!ID.test(id)) return Response.json({ error: "id" }, { status: 400 });
    const cur = await s.getWithMetadata(id, { type: "json" });
    if (!cur || !cur.data || cur.data.deleted) return Response.json({ error: "gone" }, { status: 404 });
    const etag = req.headers.get("if-match") || "";
    if (etag && etag !== cur.etag) return Response.json({ error: "conflict", item: { ...cur.data, etag: cur.etag } }, { status: 409 });
    const f = fields(cur.data.section, body);
    if (!f) return Response.json({ error: "empty" }, { status: 400 });
    const item = { ...cur.data, ...f, updatedAt: new Date().toISOString() };
    const res = await s.setJSON(id, item, { onlyIfMatch: cur.etag });
    if (res && res.modified === false) {
      const now = await s.getWithMetadata(id, { type: "json" });
      return Response.json({ error: "conflict", item: now && { ...now.data, etag: now.etag } }, { status: 409 });
    }
    return Response.json({ ...item, etag: (res && res.etag) || (await etagOf(s, id)) });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/items", method: ["GET", "POST", "PUT", "DELETE"] };
