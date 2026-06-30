/**
 * EzWorkers Apply-via-Email — Cloudflare Worker
 * When a job has no application URL, only an employer email address,
 * this Worker sends the application on the candidate's behalf using Brevo,
 * attaching their profile summary and a link to their CV.
 *
 * Deploy as: ezworkers-apply-via-email
 * Secrets to set in Worker:
 *   BREVO_API_KEY
 *   SITE_URL (https://ezworkers.com)
 *
 * This Worker is called from job.html with the Supabase anon key already
 * validating the request came from a logged-in session client-side. The
 * Worker itself does not touch Supabase — the browser already saved the
 * application row via the existing applications table insert before
 * calling this Worker to send the actual email.
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

    const {
      employerEmail, jobTitle, company,
      candidateName, candidateEmail, candidateHeadline,
      candidateCountry, candidateNationality, candidateVisaStatus,
      candidateExperience, candidateCvUrl, coverNote
    } = body;

    if (!employerEmail || !employerEmail.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid employer email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (!candidateEmail) {
      return new Response(JSON.stringify({ error: "Missing candidate email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const SITE = env.SITE_URL || "https://ezworkers.com";

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:2rem 0">
<tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;max-width:580px;width:100%">
  <tr><td style="background:linear-gradient(135deg,#0d3d6e,#1A6FC4);padding:1.5rem 2rem">
    <div style="font-size:20px;font-weight:700;color:#fff">Ez<span style="color:#F47B2B">Workers</span></div>
    <div style="font-size:12px;color:rgba(255,255,255,.65);margin-top:.15rem">New application via EzWorkers</div>
  </td></tr>
  <tr><td style="padding:2rem">
    <h2 style="font-size:17px;font-weight:700;color:#0f172a;margin:0 0 .25rem">New application — ${jobTitle || "your job"}</h2>
    <p style="font-size:13px;color:#64748b;margin:0 0 1.25rem">${company ? "Posted by " + company : ""} on EzWorkers</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:1.25rem">
      <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:140px">Candidate</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#0f172a">${candidateName || "Not provided"}</td></tr>
      ${candidateHeadline ? `<tr><td style="padding:6px 0;font-size:13px;color:#64748b">Headline</td><td style="padding:6px 0;font-size:13px;color:#1e293b">${candidateHeadline}</td></tr>` : ""}
      ${candidateCountry ? `<tr><td style="padding:6px 0;font-size:13px;color:#64748b">Location</td><td style="padding:6px 0;font-size:13px;color:#1e293b">${candidateCountry}</td></tr>` : ""}
      ${candidateNationality ? `<tr><td style="padding:6px 0;font-size:13px;color:#64748b">Nationality</td><td style="padding:6px 0;font-size:13px;color:#1e293b">${candidateNationality}</td></tr>` : ""}
      ${candidateVisaStatus ? `<tr><td style="padding:6px 0;font-size:13px;color:#64748b">Visa status</td><td style="padding:6px 0;font-size:13px;color:#1e293b">${candidateVisaStatus}</td></tr>` : ""}
      ${candidateExperience ? `<tr><td style="padding:6px 0;font-size:13px;color:#64748b">Experience</td><td style="padding:6px 0;font-size:13px;color:#1e293b">${candidateExperience}+ years</td></tr>` : ""}
      <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Email</td><td style="padding:6px 0;font-size:13px;color:#1e293b">${candidateEmail}</td></tr>
    </table>

    ${coverNote ? `<div style="background:#f8fafc;border-left:3px solid #1A6FC4;padding:.85rem 1rem;border-radius:0 8px 8px 0;margin-bottom:1.25rem;font-size:13px;color:#374151;line-height:1.6">${coverNote}</div>` : ""}

    ${candidateCvUrl ? `<div style="text-align:center;margin-bottom:1rem"><a href="${candidateCvUrl}" style="display:inline-block;padding:10px 24px;background:#1A6FC4;color:#fff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none">Download CV</a></div>` : `<p style="font-size:13px;color:#94a3b8;text-align:center">No CV uploaded by candidate</p>`}

    <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:1.25rem">
      Reply directly to this email to contact the candidate at ${candidateEmail}
    </p>
  </td></tr>
  <tr><td style="padding:1rem 2rem;border-top:1px solid #f1f5f9;text-align:center">
    <p style="font-size:12px;color:#94a3b8;margin:0">Sent automatically by <a href="${SITE}" style="color:#1A6FC4">EzWorkers</a> on behalf of the candidate</p>
  </td></tr>
</table></td></tr></table></body></html>`;

    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: { name: "EzWorkers", email: "applications@ezworkers.com" },
          to: [{ email: employerEmail, name: company || "Hiring Manager" }],
          replyTo: { email: candidateEmail, name: candidateName || candidateEmail },
          subject: `New application for ${jobTitle || "your job"} — via EzWorkers`,
          htmlContent: html,
        }),
      });

      if (!r.ok) {
        const errText = await r.text();
        return new Response(JSON.stringify({ error: "Email send failed", detail: errText }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: "Network error", detail: String(e) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
