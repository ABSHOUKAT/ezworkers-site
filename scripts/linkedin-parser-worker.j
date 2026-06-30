/**
 * EzWorkers LinkedIn Profile Parser — Cloudflare Worker
 * Receives raw pasted LinkedIn profile text from a logged-in job seeker,
 * calls Claude Haiku to extract structured CV data,
 * returns JSON for the dashboard to save into cv_sections + profiles.
 *
 * Deploy as: ezworkers-linkedin-parser
 * Secrets to set in Worker:
 *   ANTHROPIC_API_KEY
 *
 * Unlike the admin paste-job worker, this one does NOT write to Supabase directly.
 * It only extracts and returns JSON — the browser (already authenticated with the
 * user's own Supabase session) does the actual save. This keeps the Worker stateless
 * and avoids needing the user's auth token inside the Worker.
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://ezworkers.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const rawText = (body.text || "").trim();
    if (!rawText || rawText.length < 50) {
      return new Response(JSON.stringify({ error: "Pasted text too short. Paste your full LinkedIn profile text." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const prompt = `You are a CV data extractor. The user pasted raw text copied from their LinkedIn profile (or a LinkedIn PDF export). Extract structured CV data from it.

Return ONLY a raw JSON object. Start with { and end with }. No markdown, no backticks, no explanation.

Extract these fields:
- full_name (string): the person's full name
- headline (string): their professional headline/title
- summary (string): About section text, summarized to 3-5 sentences if longer
- experience (array): each item has {title, company, location, start_date, end_date, description}. start_date/end_date as short strings like "Jan 2020". end_date empty string if current role. description should be a concise bullet-style summary, max 400 characters.
- education (array): each item has {degree, field, institution, year}
- skills (array of strings): list of skills mentioned, max 15
- certifications (array): each item has {name, issuer, year}
- languages (array): each item has {language, level} where level is one of Native/Fluent/Professional/Conversational/Basic

If a section is not present in the text, return an empty array or empty string for it. Do not invent data that is not in the text.

LinkedIn profile text:
${rawText.substring(0, 6000)}`;

    try {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 2500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const claudeData = await claudeRes.json();
      let rawJson = claudeData.content?.[0]?.text || "{}";

      // Strip accidental markdown
      rawJson = rawJson.trim();
      if (rawJson.startsWith("```")) {
        const parts = rawJson.split("```");
        for (const part of parts) {
          const p = part.trim();
          if (p.startsWith("json")) { rawJson = p.substring(4).trim(); break; }
          if (p.startsWith("{")) { rawJson = p; break; }
        }
      }
      const start = rawJson.indexOf("{");
      const end = rawJson.lastIndexOf("}");
      if (start !== -1 && end !== -1) rawJson = rawJson.substring(start, end + 1);

      const extracted = JSON.parse(rawJson);

      return new Response(JSON.stringify({ success: true, data: extracted }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: "Could not parse LinkedIn text", detail: String(e) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
