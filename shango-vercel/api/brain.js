// Shango brain — Vercel Function (free Hobby plan). Lives at /api/brain next to the page.
// Holds your Groq API key so visitors never see it, forwards chat to Groq's free tier,
// and tells the page which tool to run (weather, Wikipedia, calculator, time, timers, notes).
// The tools themselves run in the visitor's browser, so this Worker stores and fetches nothing else.
//
// Settings in Vercel (Project → Settings → Environment Variables):
//   GROQ_API_KEY      your key from console.groq.com
//   ALLOWED_ORIGINS  optional: extra sites allowed to call this brain (your own site is always allowed)
//   MODEL            (Text, optional) defaults to llama-3.3-70b-versatile; any Groq model that supports tool use works

const PERSONA =
  "You are SHANGO, an AI assistant named after Ṣàngó, the Yoruba orisha of thunder and lightning and legendary fourth Alaafin of the Oyo Empire. " +
  "Speak like a warm, regal king with thunderous wit: confident, generous, a little dramatic, never cruel or crude. You are a public demo on a website. " +
  "Keep replies short: one to three sentences, under 60 words, because they are spoken aloud. Plain text only, no markdown, lists or emoji. " +
  "Use research_topic whenever the user asks you to research, investigate, compare or deep-dive a subject, then give a two-sentence spoken summary. " +
  "Never invent facts or numbers a tool can provide. You forget everything when the page closes. Never claim an action you did not perform. Politely decline anything harmful.";

const RESEARCH_SYSTEM =
  "You build research walls for a voice assistant. Return JSON only, shaped exactly like {\"headline\":\"\",\"spoken\":\"\",\"blocks\":[]}. " +
  "headline: 2-5 words. spoken: two short sentences said aloud by a regal assistant. blocks: 6 to 8 items, each one of " +
  "{\"type\":\"text\",\"title\":\"\",\"body\":\"\"} (body under 45 words), {\"type\":\"stat\",\"value\":\"\",\"label\":\"\",\"note\":\"\"} (value under 10 characters), " +
  "{\"type\":\"chart\",\"title\":\"\",\"unit\":\"\",\"bars\":[{\"label\":\"\",\"value\":0}]} (3 to 6 numeric bars). Include at least two stats and one chart. " +
  "Every number must come from the sources or be well established; if unsure of a number, leave that block out.";

const fn = (name, description, properties = {}, required = []) => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});
const TOOLS = [
  fn("get_weather", "Current weather for a city: temperature, feels-like, humidity, wind and conditions.",
    { city: { type: "string", description: "City name, e.g. Toronto" } }, ["city"]),
  fn("wikipedia_summary", "A short factual summary of a person, place, thing or event from Wikipedia.",
    { topic: { type: "string", description: "The page title to look up" } }, ["topic"]),
  fn("calculate", "Evaluate an arithmetic expression with + - * / ^ % and parentheses.",
    { expression: { type: "string" } }, ["expression"]),
  fn("get_time", "Current local time and date, optionally in an IANA time zone such as Asia/Tokyo.",
    { timezone: { type: "string", description: "IANA time zone; omit for the visitor's own" } }),
  fn("set_timer", "Start a countdown timer that Jarvis announces when it finishes.",
    { minutes: { type: "number" }, label: { type: "string" } }, ["minutes"]),
  fn("save_note", "Save a short note for this session only.", { text: { type: "string" } }, ["text"]),
  fn("list_notes", "Read back every note saved in this session."),
  fn("research_topic", "Research a subject and raise a wall of panels on screen: briefs, key numbers, charts and images.",
    { topic: { type: "string" } }, ["topic"]),
];
const TOOL_NAMES = new Set(TOOLS.map((t) => t.function.name));

// ~15 requests per visitor per minute (each Worker instance counts separately; enough to stop casual abuse)
const LIMIT = 15, WINDOW_MS = 60_000, hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

// Keep only well-formed user / assistant / tool messages, capped in size.
function clean(raw) {
  const out = [];
  for (const m of Array.isArray(raw) ? raw.slice(-24) : []) {
    if (!m || typeof m !== "object") continue;
    if (m.role === "user" && typeof m.content === "string") out.push({ role: "user", content: m.content.slice(0, 1000) });
    else if (m.role === "assistant") {
      const msg = { role: "assistant", content: typeof m.content === "string" ? m.content.slice(0, 1500) : "" };
      if (Array.isArray(m.tool_calls)) {
        msg.tool_calls = m.tool_calls
          .filter((c) => c && c.function && TOOL_NAMES.has(c.function.name))
          .slice(0, 4)
          .map((c) => ({ id: String(c.id).slice(0, 64), type: "function",
            function: { name: c.function.name, arguments: String(c.function.arguments || "{}").slice(0, 500) } }));
        if (!msg.tool_calls.length) delete msg.tool_calls;
      }
      out.push(msg);
    } else if (m.role === "tool" && typeof m.content === "string" && m.tool_call_id) {
      out.push({ role: "tool", tool_call_id: String(m.tool_call_id).slice(0, 64), content: m.content.slice(0, 2000) });
    }
  }
  while (out.length && out[0].role !== "user") out.shift(); // never start mid tool-exchange
  return out;
}

export const config = { runtime: "edge" };

export default async function handler(request) {
  const env = process.env;
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const self = "https://" + (request.headers.get("host") || "");
    const originOk = !origin || origin === self || allowed.includes(origin);   // same site by default
    const cors = {
      "Access-Control-Allow-Origin": originOk ? origin || "*" : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ error: "Send a POST request." }, 405, cors);
    if (!originOk) return json({ error: "This site isn't allowed to use Shango." }, 403, cors);
    if (!env.GROQ_API_KEY) return json({ error: "The Worker is missing GROQ_API_KEY." }, 500, cors);
    if (rateLimited(request.headers.get("CF-Connecting-IP") || "unknown"))
      return json({ error: "Too many messages. Wait a minute and try again." }, 429, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400, cors); }
    if (body.mode === "research") {
      const topic = String(body.topic || "").slice(0, 80);
      const sources = (Array.isArray(body.sources) ? body.sources : []).slice(0, 4)
        .map((x, i) => `[${i + 1}] ${String(x.title || "").slice(0, 100)}: ${String(x.extract || "").slice(0, 900)}`).join("\n\n");
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.MODEL || "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: RESEARCH_SYSTEM },
            { role: "user", content: `Topic: ${topic}\n\n${sources ? "SOURCES:\n" + sources : "No live sources; use well-established knowledge only."}` }],
          response_format: { type: "json_object" }, max_tokens: 1400, temperature: 0.4,
        }),
      });
      if (!r.ok) return json({ error: `Groq returned ${r.status}.` }, r.status === 429 ? 429 : 502, cors);
      try { return json(JSON.parse((await r.json())?.choices?.[0]?.message?.content || "{}"), 200, cors); }
      catch { return json({ error: "Research came back malformed." }, 502, cors); }
    }

    const messages = clean(body.messages);
    const last = messages[messages.length - 1];
    if (!last || (last.role !== "user" && last.role !== "tool")) return json({ error: "No message to answer." }, 400, cors);

    const groq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.MODEL || "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: PERSONA }, ...messages],
        tools: TOOLS,
        tool_choice: "auto",
        max_tokens: 220,
        temperature: 0.7,
      }),
    });
    if (groq.status === 429) return json({ error: "Shango is at his free-tier limit. Try again shortly." }, 429, cors);
    if (!groq.ok) return json({ error: `Groq returned ${groq.status}.` }, 502, cors);

    const msg = (await groq.json())?.choices?.[0]?.message || {};
    const calls = (msg.tool_calls || []).filter((c) => c?.function && TOOL_NAMES.has(c.function.name));
    if (calls.length) return json({ tool_calls: calls, content: msg.content || "" }, 200, cors);
    return json({ reply: (msg.content || "").trim() }, 200, cors);
}
