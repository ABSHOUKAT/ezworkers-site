#!/usr/bin/env python3
"""
EzWorkers Notification Agent
Runs every 30 minutes via GitHub Actions.
Sends two types of emails via Brevo:
1. To employers: new application received on their job
2. To job seekers: their application status changed

Required GitHub Secrets:
  SUPABASE_URL
  SUPABASE_SERVICE_KEY
  BREVO_API_KEY
  SITE_URL (https://ezworkers.com)
"""

import os, json, requests
from datetime import datetime, timezone, timedelta

SB_URL  = os.environ['SUPABASE_URL']
SB_KEY  = os.environ['SUPABASE_SERVICE_KEY']
BREVO   = os.environ['BREVO_API_KEY']
SITE    = os.environ.get('SITE_URL', 'https://ezworkers.com')

def sb_get(path, params=None):
    r = requests.get(f'{SB_URL}/rest/v1{path}',
        headers={'apikey': SB_KEY, 'Authorization': f'Bearer {SB_KEY}'},
        params=params, timeout=15)
    r.raise_for_status()
    return r.json()

def sb_patch(path, data):
    r = requests.patch(f'{SB_URL}/rest/v1{path}',
        headers={'apikey': SB_KEY, 'Authorization': f'Bearer {SB_KEY}', 'Content-Type': 'application/json'},
        json=data, timeout=15)
    return r.ok

def get_user_email(user_id):
    try:
        r = requests.get(f'{SB_URL}/auth/v1/admin/users/{user_id}',
            headers={'apikey': SB_KEY, 'Authorization': f'Bearer {SB_KEY}'}, timeout=10)
        if r.ok:
            return r.json().get('email', '')
    except:
        pass
    return ''

def send_email(to_email, to_name, subject, html):
    if not to_email:
        return False
    r = requests.post('https://api.brevo.com/v3/smtp/email',
        headers={'api-key': BREVO, 'Content-Type': 'application/json'},
        json={
            'sender':  {'name': 'EzWorkers', 'email': 'hello@ezworkers.com'},
            'to':      [{'email': to_email, 'name': to_name or to_email}],
            'subject': subject,
            'htmlContent': html,
        }, timeout=15)
    return r.status_code in (200, 201, 202)

def email_wrap(content):
    return f'''<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:2rem 0">
<tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;max-width:580px;width:100%">
  <tr><td style="background:linear-gradient(135deg,#0d3d6e,#1A6FC4);padding:1.5rem 2rem">
    <div style="font-size:20px;font-weight:700;color:#fff">Ez<span style="color:#F47B2B">Workers</span></div>
    <div style="font-size:12px;color:rgba(255,255,255,.65);margin-top:.15rem">GCC JOBS · وظائف الخليج</div>
  </td></tr>
  <tr><td style="padding:2rem">{content}</td></tr>
  <tr><td style="padding:1rem 2rem;border-top:1px solid #f1f5f9;text-align:center;font-size:12px;color:#94a3b8">
    <a href="{SITE}" style="color:#1A6FC4">EzWorkers</a> — GCC Job Search Engine
  </td></tr>
</table></td></tr></table></body></html>'''

# ── 1. New application notifications to employers ────────────────────────────
def notify_new_applications():
    print('\nChecking new applications to notify employers...')
    # Get applications where employer has not been notified yet
    apps = sb_get('/applications',
        {'employer_notified': 'eq.false',
         'select': '*,jobs(id,title,company,apply_url),profiles(full_name,headline,country,nationality,visa_status,experience_years,cv_url)',
         'order': 'applied_at.desc',
         'limit': '50'})

    if not apps:
        print('  No new applications to notify')
        return

    # Group by job to avoid spamming employer with one email per application
    by_job = {}
    for a in apps:
        j = a.get('jobs') or {}
        job_id = j.get('id', '')
        if job_id not in by_job:
            by_job[job_id] = {'job': j, 'apps': []}
        by_job[job_id]['apps'].append(a)

    for job_id, group in by_job.items():
        job  = group['job']
        appl = group['apps']
        job_title = job.get('title', 'your job posting')

        # Find employer — look up who posted the job
        job_rows = sb_get('/jobs', {'id': f'eq.{job_id}', 'select': 'id,title,company', 'limit': '1'})
        if not job_rows:
            continue

        # Get employer profile — find profiles where company_name matches
        # For employer_post jobs, we find the employer by checking who created it
        # We use the applicant's profile user_id chain to find the job poster
        # Simpler: send to the apply_url email if it contains @
        apply_url = job.get('apply_url', '')
        employer_email = apply_url if '@' in apply_url and '.' in apply_url else ''

        if employer_email:
            n = len(appl)
            rows = ''.join([f'''
            <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9">
              <div style="font-size:14px;font-weight:600;color:#0f172a">{a.get("profiles",{}).get("full_name","Applicant")}</div>
              <div style="font-size:13px;color:#64748b">{a.get("profiles",{}).get("headline","") or ""} {("· " + a.get("profiles",{}).get("country","")) if a.get("profiles",{}).get("country") else ""}</div>
              {f'<a href="{a.get("profiles",{}).get("cv_url","")}" style="font-size:12px;color:#1A6FC4">Download CV →</a>' if a.get("profiles",{}).get("cv_url") else ""}
            </td></tr>''' for a in appl])

            html = email_wrap(f'''
              <h2 style="font-size:17px;font-weight:700;color:#0f172a;margin:0 0 .5rem">
                {n} new application{"s" if n>1 else ""} for "{job_title}"
              </h2>
              <p style="font-size:14px;color:#64748b;margin:0 0 1.25rem">
                {"Candidates have" if n>1 else "A candidate has"} applied to your job on EzWorkers.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">{rows}</table>
              <div style="text-align:center;margin-top:1.5rem">
                <a href="{SITE}/employer-dashboard.html" style="display:inline-block;padding:12px 28px;background:#1A6FC4;color:#fff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none">
                  View all applicants →
                </a>
              </div>''')

            ok = send_email(employer_email, 'Hiring Manager',
                f'{n} new application{"s" if n>1 else ""} — {job_title} | EzWorkers', html)
            print(f'  Employer notify ({employer_email}): {"SENT" if ok else "FAILED"} — {n} applicant(s) for "{job_title}"')

        # Mark all as notified
        for a in appl:
            sb_patch(f'/applications?id=eq.{a["id"]}', {'employer_notified': True})

# ── 2. Status change notifications to job seekers ────────────────────────────
def notify_status_changes():
    print('\nChecking status changes to notify job seekers...')
    apps = sb_get('/applications',
        {'seeker_notified': 'eq.false',
         'status': 'neq.applied',  # only notify on status changes, not initial application
         'select': '*,jobs(title,company)',
         'order': 'status_updated_at.desc',
         'limit': '50'})

    if not apps:
        print('  No status changes to notify')
        return

    status_messages = {
        'reviewed':    ('Your application has been reviewed', 'The employer has reviewed your application for'),
        'shortlisted': ('You have been shortlisted!', 'Great news — you have been shortlisted for'),
        'interviewed': ('Interview stage reached', 'The employer wants to interview you for'),
        'offered':     ('Job offer received!', 'Congratulations — you have received an offer for'),
        'rejected':    ('Application update', 'Thank you for applying for'),
    }

    status_colours = {
        'reviewed':    '#854D0E',
        'shortlisted': '#15803D',
        'interviewed': '#7E22CE',
        'offered':     '#C2410C',
        'rejected':    '#DC2626',
    }

    for a in apps:
        user_id   = a.get('applicant_id', '')
        job       = a.get('jobs') or {}
        status    = a.get('status', '')
        job_title = job.get('title', 'the job')
        company   = job.get('company', '')
        note      = a.get('employer_note', '')

        email = get_user_email(user_id)
        if not email:
            sb_patch(f'/applications?id=eq.{a["id"]}', {'seeker_notified': True})
            continue

        subject_prefix, body_prefix = status_messages.get(status, ('Application update', 'Update on your application for'))
        colour = status_colours.get(status, '#1A6FC4')

        extra = ''
        if status == 'shortlisted':
            extra = '<p style="font-size:14px;color:#374151;margin:.75rem 0">Check your dashboard to track your application and prepare for next steps.</p>'
        elif status == 'offered':
            extra = '<p style="font-size:14px;color:#374151;margin:.75rem 0">Log in to your dashboard to view details and respond to the offer.</p>'
        elif status == 'rejected':
            extra = '<p style="font-size:14px;color:#374151;margin:.75rem 0">Do not be discouraged — keep applying. There are thousands of GCC jobs waiting for you.</p>'
        if note:
            extra += f'<div style="background:#f8fafc;border-left:3px solid {colour};padding:.75rem 1rem;border-radius:0 8px 8px 0;margin:.75rem 0;font-size:13px;color:#374151">Message from employer: {note}</div>'

        html = email_wrap(f'''
          <div style="display:inline-block;padding:3px 12px;border-radius:20px;background:{colour}22;color:{colour};font-size:12px;font-weight:600;margin-bottom:1rem">{status.upper()}</div>
          <h2 style="font-size:17px;font-weight:700;color:#0f172a;margin:0 0 .5rem">{subject_prefix}</h2>
          <p style="font-size:14px;color:#64748b;margin:0 0 1rem">
            {body_prefix} <strong style="color:#0f172a">{job_title}</strong>{(" at " + company) if company else ""}.
          </p>
          {extra}
          <div style="text-align:center;margin-top:1.5rem">
            <a href="{SITE}/dashboard.html" style="display:inline-block;padding:12px 28px;background:#1A6FC4;color:#fff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none">
              View my applications →
            </a>
          </div>
          <p style="font-size:13px;color:#64748b;margin-top:1.25rem;text-align:center">
            <a href="{SITE}/index.html" style="color:#1A6FC4">Browse more GCC jobs →</a>
          </p>''')

        ok = send_email(email, '', f'{subject_prefix} — EzWorkers', html)
        print(f'  Seeker notify ({email}): {"SENT" if ok else "FAILED"} — status={status} for "{job_title}"')
        sb_patch(f'/applications?id=eq.{a["id"]}', {'seeker_notified': True})

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f'\n=== EzWorkers Notification Agent — {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")} ===')
    notify_new_applications()
    notify_status_changes()
    print('\n=== Done ===\n')

if __name__ == '__main__':
    main()
