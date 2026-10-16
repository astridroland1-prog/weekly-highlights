// Password-protected: checks the password (GET) and deletes an entry of the shared board (DELETE ?id=).
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
  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!/^\d{4}-W\d{2}\/[\w-]+$/.test(id)) return Response.json({ error: "id" }, { status: 400 });
    await getStore({ name: "wh-items", consistency: "strong" }).delete(id);
  }
  return Response.json({ ok: true });
};

export const config = { path: "/api/admin", method: ["GET", "DELETE"] };
