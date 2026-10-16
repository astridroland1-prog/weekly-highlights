// Posts the weekly reminder to a Microsoft Teams channel through a Teams "Workflows" webhook (TEAMS_WEBHOOK_URL).
import { getStore } from "@netlify/blobs";

const SITE = "https://feldschloesschen-weekly-highlights.netlify.app";

export function isoWeek(date = new Date()) {
  const t = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return { week: w, key: `${y}-W${String(w).padStart(2, "0")}` };
}

async function countEntries(key) {
  const s = getStore({ name: "wh-items", consistency: "strong" });
  const { blobs } = await s.list({ prefix: key + "/" });
  const c = { highlight: 0, outlook: 0, team: 0 };
  for (const b of blobs) {
    const d = await s.get(b.key, { type: "json" });
    if (d && !d.deleted && c[d.section] !== undefined) c[d.section]++;
  }
  return c;
}

export async function sendReminder({ test = false } = {}) {
  const hook = Netlify.env.get("TEAMS_WEBHOOK_URL");
  if (!hook) return { ok: false, error: "not_configured" };
  const { week, key } = isoWeek();
  const c = await countEntries(key);
  const status = `Bisher eingetragen: ${c.highlight} Highlights · ${c.outlook} Ausblick-Punkte · ${c.team} Team-News`;
  const card = {
    type: "AdaptiveCard", version: "1.4", $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    body: [
      { type: "TextBlock", size: "Large", weight: "Bolder", text: (test ? "[Test] " : "") + `Weekly Highlights KW ${week} – eure Beiträge`, wrap: true },
      { type: "TextBlock", wrap: true, text: "Bitte tragt bis morgen früh eure Highlights, den Ausblick auf nächste Woche und Team-News (Ferien, Abwesenheiten, neue Gesichter) ein. Ergänzt bestehende Einträge, statt doppelte zu erstellen. Merci & Proscht!" },
      { type: "TextBlock", wrap: true, isSubtle: true, text: status },
    ],
    actions: [
      { type: "Action.OpenUrl", title: "Zum Formular", url: SITE + "/" },
      { type: "Action.OpenUrl", title: "Archiv", url: SITE + "/archiv" },
    ],
  };
  const res = await fetch(hook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "message", attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: card }] }),
  });
  if (!res.ok) return { ok: false, error: "teams", status: res.status, detail: (await res.text()).slice(0, 300) };
  return { ok: true, week, counts: c };
}
