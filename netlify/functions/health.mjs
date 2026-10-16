// Public status check: says which optional services are configured, never their values.
export default async () =>
  Response.json(
    {
      ok: true,
      admin: !!Netlify.env.get("ADMIN_PASSWORD"),
      ai: !!Netlify.env.get("ANTHROPIC_API_KEY"),
      mail: !!Netlify.env.get("RESEND_API_KEY"),
      teamCode: !!Netlify.env.get("TEAM_CODE"),
      teams: !!Netlify.env.get("TEAMS_WEBHOOK_URL"),
      checkedAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } }
  );

export const config = { path: "/api/health", method: "GET" };
