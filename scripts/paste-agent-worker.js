/**
 * EzWorkers Paste Agent — Cloudflare Worker
 * Receives raw pasted job text, calls Claude Haiku to extract fields,
 * then inserts into Supabase jobs table.
 *
 * Deploy as: ezworkers-paste-agent
 * Secrets to set in Worker:
 *   ANTHROPIC_API_KEY
 *   SUPABASE_URL        (https://wxltwnyuhiejavzichfd.supabase.co)
 *   SUPABASE_SERVICE_KEY  (your service_role key — NOT the anon key)
 *   ADMIN_PIN           (any PIN you choose, e.g. "EZW2026")
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

    // PIN check
    if (body.pin !== env.ADMIN_PIN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const rawText = (body.text || "").trim();
    if (!rawText || rawText.length < 20) {
      return new Response(JSON.stringify({ error: "Paste text too short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── Step 1: Call Claude Haiku to extract job fields ────────────────────
    const extractPrompt = `You are a job data extractor. The user has pasted raw job advertisement text from any source.
Extract the following fields and return ONLY valid JSON — no explanation, no markdown, no backticks.

Fields to extract:
- title (string): job title
- company (string): company name, empty string if not found
- location (string): city or location, empty string if not found
- country (string): country name. If GCC, use one of: "Saudi Arabia", "UAE", "Qatar", "Kuwait", "Bahrain", "Oman". If unknown, "Global".
- sector (string): one of: "Procurement & Supply Chain", "Construction & Infrastructure", "Engineering & Technical", "Oil & Gas / Energy", "Finance & Banking", "IT & Technology", "HR & Admin", "Healthcare", "General"
- job_type (string): one of: "Full-time", "Part-time", "Contract", "Remote", "Freelance"
- salary (string): salary information if present, empty string if not
- description (string): full job description, max 3000 characters
- apply_url (string): application URL or email if present, empty string if not

Raw text:
${rawText.substring(0, 4000)}`;

    let extracted;
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
          max_tokens: 1000,
          messages: [{ role: "user", content: extractPrompt }],
        }),
      });

      const claudeData = await claudeRes.json();
      const rawJson = claudeData.content?.[0]?.text || "{}";
      extracted = JSON.parse(rawJson);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Claude extraction failed", detail: String(e) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!extracted.title) {
      return new Response(JSON.stringify({ error: "Could not extract job title from pasted text" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── Step 2: Generate URL hash for deduplication ────────────────────────
    const hashSource = extracted.apply_url || extracted.title + extracted.company + rawText.substring(0, 100);
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashSource));
    const urlHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
      .substring(0, 32);

    // ── Step 3: Insert into Supabase ───────────────────────────────────────
    const job = {
      title:       (extracted.title || "").substring(0, 200),
      company:     (extracted.company || "").substring(0, 200),
      location:    (extracted.location || "").substring(0, 200),
      country:     extracted.country || "Global",
      sector:      extracted.sector || "General",
      job_type:    extracted.job_type || "Full-time",
      salary:      (extracted.salary || "").substring(0, 200),
      description: (extracted.description || "").substring(0, 5000),
      apply_url:   (extracted.apply_url || "").substring(0, 500),
      source:      "manual_paste",
      url_hash:    urlHash,
      posted_at:   new Date().toISOString(),
      is_active:   true,
    };

    try {
      const sbRes = await fetch(`${env.SUPABASE_URL}/rest/v1/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": env.SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          "Prefer": "resolution=ignore-duplicates",
        },
        body: JSON.stringify(job),
      });

      if (!sbRes.ok) {
        const errText = await sbRes.text();
        return new Response(JSON.stringify({ error: "Supabase insert failed", detail: errText }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: "Supabase connection failed", detail: String(e) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      job: { title: job.title, company: job.company, country: job.country, sector: job.sector }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};
