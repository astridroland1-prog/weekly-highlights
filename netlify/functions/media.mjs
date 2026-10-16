// Serves an uploaded photo or video by its key, so the compiled e-mail can show it inline.
import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const key = context.params.key || "";
  if (!/^[0-9a-f-]{36}$/.test(key)) return new Response("Not found", { status: 404 });
  const entry = await getStore("wh-media").getWithMetadata(key, { type: "arrayBuffer" });
  if (!entry) return new Response("Not found", { status: 404 });
  return new Response(entry.data, {
    headers: {
      "content-type": entry.metadata?.type || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config = { path: "/api/media/:key", method: "GET" };
