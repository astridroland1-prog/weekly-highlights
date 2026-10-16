// Password-protected: asks Claude (Anthropic API) to polish the week's entries into one engaging, consistent style.
// Needs ANTHROPIC_API_KEY; optional ANTHROPIC_MODEL.
function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const SYSTEM = `Du redigierst die interne Wochen-Mail «Weekly Highlights» des Marketings von Feldschlösschen (Schweizer Brauerei). Mehrere Teammitglieder liefern Einträge in unterschiedlichem Stil, teils mit Tippfehlern, teils auf Französisch.

Deine Aufgabe: Jeden Eintrag so überarbeiten, dass die ganze Mail wie aus einem Guss klingt.
- Sprache: Deutsch, Schweizer Rechtschreibung (immer «ss», nie «ß»). Französische Einträge ins Deutsche übersetzen.
- Ton: herzlich, motivierend, lebendig, aber professionell – wie eine Brand-Direktorin, die ihr Team begeistert. Wir-Form, Leserinnen und Leser per «ihr» ansprechen. Keine Emojis, keine Übertreibungen, keine Floskeln.
- Rechtschreibung, Grammatik und Zeichensetzung korrigieren.
- Fakten exakt beibehalten: Zahlen, Namen, Orte, Daten, Marken und Produktnamen nie verändern und nichts erfinden. Fehlt etwas, nichts ergänzen.
- Titel: kurz und prägnant (max. ca. 10 Wörter), ohne Punkt am Ende. Bestehende Ortsangaben im Titel behalten.
- Text: 1–4 kurze Sätze, aktiv formuliert. Ein Dank an Beteiligte darf bleiben.
- Ausblick-Punkte: knappe Stichworte, eine Zeile, ohne Punkt am Ende.
- Team-Einträge (neue Gesichter, Ferien, Abwesenheiten, Stellvertretungen, Jubiläen): sachlich-freundlich, Daten und Namen der Stellvertretung unbedingt behalten.
- Kein Eintrag darf wegfallen, keiner hinzukommen. Gleiche id zurückgeben.

Antworte ausschliesslich mit gültigem JSON ohne weiteren Text, in dieser Form:
{"items":[{"id":"...","title":"...","detail":"..."}]}
Für Ausblick-Punkte ist "detail" ein leerer String.`;

export default async (req) => {
  const expected = Netlify.env.get("ADMIN_PASSWORD");
  if (!expected || !same(req.headers.get("x-admin-password") || "", expected)) return Response.json({ error: "password" }, { status: 401 });
  const key = Netlify.env.get("ANTHROPIC_API_KEY");
  if (req.method === "GET") return Response.json({ configured: !!key }, { headers: { "cache-control": "no-store" } });
  if (!key) return Response.json({ error: "not_configured" }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "json" }, { status: 400 }); }
  const src = Array.isArray(body.items) ? body.items.slice(0, 60) : [];
  const items = src.map((i) => ({
    id: String(i.id || "").slice(0, 120),
    section: ["highlight", "outlook", "team"].includes(i.section) ? i.section : "highlight",
    title: String(i.title || "").slice(0, 300),
    detail: String(i.detail || "").slice(0, 4000),
  })).filter((i) => i.id && (i.title || i.detail));
  if (!items.length) return Response.json({ error: "empty" }, { status: 400 });

  const label = { highlight: "Highlight", outlook: "Ausblick", team: "Team" };
  const user = "Einträge dieser Woche (JSON):\n" + JSON.stringify(items.map((i) => ({ id: i.id, rubrik: label[i.section], title: i.title, detail: i.detail })), null, 1);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Netlify.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5",
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    return Response.json({ error: "provider", status: res.status, detail: detail.slice(0, 300) }, { status: 502 });
  }
  const data = await res.json();
  const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  let parsed;
  try {
    const m = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(m ? m[0] : text);
  } catch { return Response.json({ error: "format" }, { status: 502 }); }
  const known = new Set(items.map((i) => i.id));
  const out = (Array.isArray(parsed.items) ? parsed.items : [])
    .filter((i) => i && known.has(i.id))
    .map((i) => ({ id: i.id, title: String(i.title || "").slice(0, 300), detail: String(i.detail || "").slice(0, 4000) }));
  return Response.json({ items: out });
};

export const config = { path: "/api/rewrite", method: ["GET", "POST"] };
