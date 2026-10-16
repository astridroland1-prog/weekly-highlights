// Public status check: says which optional services are configured, never their values.
export default async () =>
  Response.json(
    {
      ok: true,
      admin: !!Netlify.env.get("ADMIN_PASSWORD"),
      ai: !!Netlify.env.get("ANTHROPIC_API_KEY"),
      mail: !!Netlify.env.get("RESEND_API_KEY"),
      checkedAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } }
  );

export const config = { path: "/api/health", method: "GET" };
