/**
 * EzWorkers Apply-via-Email — Cloudflare Worker
 * When a job has no application URL, only an employer email address,
 * this Worker sends the application on the candidate's behalf using Brevo,
 * attaching their profile summary and a link to their CV.
 *
 * Deploy as: ezworkers-apply-via-email
 * Secrets to set in Worker:
 *   BREVO_API_KEY
 *   SITE_URL              (https://ezworkers.com)
 *   SUPABASE_URL           (https://wxltwnyuhiejavzichfd.supabase.co)
 *   SUPABASE_SERVICE_KEY   (service_role key — used only to check job
 *                          ownership and generate a claim link; never
 *                          exposed to the browser)
 *
 * This Worker is called from job.html with the Supabase anon key already
 * validating the request came from a logged-in session client-side. The
 * Worker itself does not touch the applications table — the browser
 * already saved the application row via the existing applications table
 * insert before calling this Worker to send the actual email.
 *
 * In addition to the full candidate details this email has always sent
 * (kept exactly as before), it now also includes a second, secondary
 * button: if the job already belongs to a registered employer account,
 * it links straight to their dashboard; if nobody owns the job yet, it
 * generates a one-time secure link that lets the employer claim this
 * specific job and see every applicant to it in one place going forward.
 */

async function buildManageCta(env, jobId, employerEmail) {
  const SITE = env.SITE_URL || "https://ezworkers.com";
  if (!jobId || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return null;

  try {
    const jobRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/jobs?id=eq.${encodeURIComponent(jobId)}&select=posted_by&limit=1`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    );
    if (!jobRes.ok) return null;
    const rows = await jobRes.json();
    const postedBy = rows && rows[0] && rows[0].posted_by;

    if (postedBy) {
      // Already belongs to a registered employer account.
      return { link: `${SITE}/employer-dashboard.html`, text: "Manage all your applicants in one place →" };
    }

    // Unclaimed — generate a one-time secure link that signs the employer
    // in and connects this specific job to their account in one click.
    const redirectTo = `${SITE}/claim.html?job_id=${encodeURIComponent(jobId)}`;
    const genRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "magiclink", email: employerEmail, options: { redirect_to: redirectTo } }),
    });
    if (!genRes.ok) return null;
    const genData = await genRes.json();
    const hashedToken = genData.properties?.hashed_token || genData.hashed_token;
    if (!hashedToken) return null;
    const claimLink = `${env.SUPABASE_URL}/auth/v1/verify?token=${hashedToken}&type=magiclink&redirect_to=${encodeURIComponent(redirectTo)}`;
    return { link: claimLink, text: "Claim this job & manage all applicants →" };

  } catch (e) {
    return null;
  }
}

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
      jobId, employerEmail, jobTitle, company,
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

    // Secondary CTA — added on top of the existing email, never replacing
    // any of it. If this fails for any reason (missing secrets, network
    // issue, etc.) the rest of the email still sends normally without it.
    const manageCta = await buildManageCta(env, jobId, employerEmail);

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

    ${manageCta ? `<div style="text-align:center;margin-bottom:1rem;padding-top:.75rem;border-top:1px solid #f1f5f9">
      <a href="${manageCta.link}" style="display:inline-block;padding:10px 24px;background:#fff;color:#1A6FC4;border:1px solid #1A6FC4;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none">${manageCta.text}</a>
    </div>` : ""}

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
          sender: { name: "EzWorkers", email: "hello@ezworkers.com" },
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
