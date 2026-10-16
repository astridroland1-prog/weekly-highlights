// Stores one photo or video (max 4.4 MB, the function payload limit) and returns its key.
import { getStore } from "@netlify/blobs";

const MAX = 4.4 * 1024 * 1024;

export default async (req) => {
  const type = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!/^(image|video)\/[a-z0-9.+-]+$/.test(type)) return Response.json({ error: "type" }, { status: 415 });
  const buf = await req.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > MAX) return Response.json({ error: "size" }, { status: 413 });
  let name = "datei";
  try { name = decodeURIComponent(req.headers.get("x-filename") || "datei"); } catch {}
  const key = crypto.randomUUID();
  await getStore("wh-media").set(key, buf, { metadata: { type, name: name.slice(0, 120) } });
  return Response.json({ key });
};

export const config = { path: "/api/upload", method: "POST" };
