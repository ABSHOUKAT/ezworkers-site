#!/usr/bin/env python3
"""
EzWorkers Weekly Job Alert Digest
Runs every Monday at 07:00 UTC via GitHub Actions.
Fetches active job alerts from Supabase, finds matching jobs,
sends personalised digest emails via Brevo.

Required GitHub Secrets:
  SUPABASE_URL
  SUPABASE_SERVICE_KEY
  BREVO_API_KEY          (from app.brevo.com → API Keys)
  SITE_URL               (https://ezworkers.com)
"""

import os, json, requests
from datetime import datetime, timezone, timedelta

SB_URL  = os.environ['SUPABASE_URL']
SB_KEY  = os.environ['SUPABASE_SERVICE_KEY']
BREVO   = os.environ['BREVO_API_KEY']
SITE    = os.environ.get('SITE_URL', 'https://ezworkers.com')

def sb(path, params=None):
    headers = {'apikey': SB_KEY, 'Authorization': f'Bearer {SB_KEY}'}
    r = requests.get(f'{SB_URL}/rest/v1{path}', headers=headers, params=params, timeout=15)
    r.raise_for_status()
    return r.json()

def send_email(to_email, to_name, subject, html_body):
    r = requests.post(
        'https://api.brevo.com/v3/smtp/email',
        headers={'api-key': BREVO, 'Content-Type': 'application/json'},
        json={
            'sender':  {'name': 'EzWorkers', 'email': 'hello@ezworkers.com'},
            'to':      [{'email': to_email, 'name': to_name or to_email}],
            'subject': subject,
            'htmlContent': html_body,
        },
        timeout=15
    )
    return r.status_code in (200, 201, 202)

def build_email(name, jobs, keyword, country):
    job_rows = ''
    for j in jobs[:10]:
        job_rows += f'''
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9">
            <a href="{SITE}/job.html?id={j['id']}" style="font-size:15px;font-weight:600;color:#0f172a;text-decoration:none">{j.get('title','Job')}</a><br>
            <span style="font-size:13px;color:#64748b">{j.get('company','')}{'  ·  ' + j.get('country','') if j.get('country') else ''}</span><br>
            <span style="font-size:12px;color:#94a3b8;margin-top:4px;display:block">{j.get('sector','')}{'  ·  ' + j.get('job_type','') if j.get('job_type') else ''}</span>
          </td>
          <td style="padding:12px 0 12px 16px;border-bottom:1px solid #f1f5f9;white-space:nowrap;vertical-align:middle">
            <a href="{SITE}/job.html?id={j['id']}" style="display:inline-block;padding:6px 14px;background:#1A6FC4;color:#fff;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none">View job</a>
          </td>
        </tr>'''

    alert_desc = ''
    if keyword: alert_desc += f'<strong>{keyword}</strong>'
    if keyword and country: alert_desc += ' in '
    if country: alert_desc += f'<strong>{country}</strong>'
    if not alert_desc: alert_desc = 'all GCC jobs'

    return f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:2rem 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;max-width:600px;width:100%">
  <tr><td style="background:linear-gradient(135deg,#0d3d6e,#1A6FC4);padding:2rem;text-align:center">
    <div style="font-size:22px;font-weight:700;color:#fff">Ez<span style="color:#F47B2B">Workers</span></div>
    <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:.25rem">GCC JOBS · وظائف الخليج</div>
  </td></tr>
  <tr><td style="padding:2rem">
    <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 .5rem">Your weekly job digest</h2>
    <p style="font-size:14px;color:#64748b;margin:0 0 1.5rem">Hi {name or 'there'}, here are the latest jobs matching {alert_desc}:</p>
    <table width="100%" cellpadding="0" cellspacing="0">{job_rows}</table>
    <div style="text-align:center;margin-top:1.5rem">
      <a href="{SITE}/index.html" style="display:inline-block;padding:12px 28px;background:#F47B2B;color:#fff;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none">Browse all jobs</a>
    </div>
  </td></tr>
  <tr><td style="padding:1rem 2rem;border-top:1px solid #f1f5f9;text-align:center">
    <p style="font-size:12px;color:#94a3b8;margin:0">You are receiving this because you set up a job alert on EzWorkers.<br>
    <a href="{SITE}/dashboard.html" style="color:#1A6FC4">Manage your alerts</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>'''

def main():
    print(f'\n=== EzWorkers Alert Digest — {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")} ===\n')

    # Fetch all active alerts
    alerts = sb('/job_alerts', {'is_active': 'eq.true', 'select': '*', 'limit': '500'})
    print(f'Active alerts: {len(alerts)}')

    # Jobs posted in last 7 days
    since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    sent = 0
    for alert in alerts:
        user_id  = alert['user_id']
        keyword  = alert.get('keyword', '')
        country  = alert.get('country', '')
        freq     = alert.get('frequency', 'weekly')

        if freq != 'weekly':
            continue

        # Fetch user email from auth.users via service role
        try:
            r = requests.get(
                f'{SB_URL}/auth/v1/admin/users/{user_id}',
                headers={'apikey': SB_KEY, 'Authorization': f'Bearer {SB_KEY}'},
                timeout=10
            )
            if not r.ok:
                print(f'  Could not fetch user {user_id}: {r.status_code}')
                continue
            user_data = r.json()
            email = user_data.get('email', '')
            if not email:
                continue
        except Exception as e:
            print(f'  User fetch error: {e}')
            continue

        # Fetch matching profile for name
        try:
            profiles = sb('/profiles', {'id': f'eq.{user_id}', 'select': 'full_name'})
            name = profiles[0].get('full_name', '') if profiles else ''
        except:
            name = ''

        # Build job query
        params = {
            'is_active':  'eq.true',
            'posted_at':  f'gte.{since}',
            'select':     'id,title,company,country,sector,job_type,posted_at',
            'order':      'posted_at.desc',
            'limit':      '20',
        }
        if keyword: params['or'] = f'(title.ilike.*{keyword}*,description.ilike.*{keyword}*,sector.ilike.*{keyword}*)'
        if country: params['country'] = f'eq.{country}'

        try:
            jobs = sb('/jobs', params)
        except Exception as e:
            print(f'  Job query error for {email}: {e}')
            continue

        if not jobs:
            print(f'  No matching jobs for {email} — skipping')
            continue

        # Build and send email
        subject = f'Your weekly GCC job digest — {len(jobs)} new job{"s" if len(jobs)!=1 else ""}'
        if keyword: subject = f'{keyword} jobs this week — {len(jobs)} new match{"es" if len(jobs)!=1 else ""}'

        html = build_email(name, jobs, keyword, country)
        ok   = send_email(email, name, subject, html)
        status = 'SENT' if ok else 'FAILED'
        print(f'  {status} → {email} ({len(jobs)} jobs)')
        if ok: sent += 1

    print(f'\nTotal emails sent: {sent}')
    print('=== Done ===\n')

if __name__ == '__main__':
    main()
