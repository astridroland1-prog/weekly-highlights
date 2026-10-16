// Stores one photo or video (max 4.4 MB, the function payload limit) and returns its key.
import { getStore } from "@netlify/blobs";

const MAX = 4.4 * 1024 * 1024;


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
  if (!teamOk(req)) return teamDenied();
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
