# EzWorkers — Complete Deployment Guide

This is the final, fully tested bundle for ezworkers.com. Everything in here
has been confirmed working. Follow these steps in order, top to bottom.

You do not need to know how to code. Just copy, paste, and click exactly
what is written.

---

## What you need before you start

- Access to your Supabase project (wxltwnyuhiejavzichfd)
- Access to your Cloudflare account
- Access to your GitHub repo (ABSHOUKAT/ezworkers-site)
- Access to your Brevo account

---

## PART 1 — Database (only needed once, for a brand new setup)

If your Supabase database is already live and working, **skip this part
entirely**. Only do this if you are setting EzWorkers up from zero on a
fresh Supabase project.

1. Go to your Supabase project → SQL Editor → New query
2. Open `sql/MASTER-SCHEMA.sql` from this bundle
3. Copy everything, paste into the SQL Editor, click Run
4. You should see "EzWorkers master schema applied successfully"

---

## PART 2 — Cloudflare Workers (4 small backend programs)

These are tiny programs that run in the background to handle emails and
AI features. You need all 4 deployed.

For each one below: go to Cloudflare dashboard → Workers & Pages →
Create → Start with Hello World → give it the exact name shown →
delete the sample code → paste in the file content → click Deploy.

### Worker 1 — ezworkers-paste-agent
File: `scripts/paste-agent-worker.js`
Secrets to add (Settings → Variables and secrets → Add):
- `ANTHROPIC_API_KEY` — your Claude API key
- `SUPABASE_URL` — `https://wxltwnyuhiejavzichfd.supabase.co`
- `SUPABASE_SERVICE_KEY` — your Supabase service_role key
- `ADMIN_PIN` — any PIN you choose, e.g. `EZW2026`

### Worker 2 — ezworkers-linkedin-parser
File: `scripts/linkedin-parser-worker.js`
Secrets:
- `ANTHROPIC_API_KEY` — same key as above

### Worker 3 — ezworkers-apply-via-email
File: `scripts/apply-via-email-worker.js`
Secrets:
- `BREVO_API_KEY` — your Brevo API key
- `SITE_URL` — `https://ezworkers.com`

### Worker 4 — ezworkers-magic-link
File: `scripts/magic-link-worker.js`
Secrets:
- `SUPABASE_URL` — `https://wxltwnyuhiejavzichfd.supabase.co`
- `SUPABASE_SERVICE_KEY` — your Supabase service_role key
- `BREVO_API_KEY` — your Brevo API key
- `SITE_URL` — `https://ezworkers.com`

**Important when adding secrets:** after adding secrets to a Worker, you
must open "Edit code", make any small change (even just adding a blank
line), and click Deploy again inside that code editor. This forces the
secrets to actually take effect. Just saving secrets alone is not
always enough.

---

## PART 3 — Critical Brevo setup (do not skip this)

Email sending will silently fail if this is not done. This was the cause
of several bugs during development.

1. Go to `https://app.brevo.com/senders/list`
2. Confirm `hello@ezworkers.com` appears in the list with a **green
   "Verified" badge**
3. If it is missing, click "Add a sender", enter:
   - From name: `EzWorkers`
   - From email: `hello@ezworkers.com`
4. Also confirm under the Domains tab that `ezworkers.com` shows
   "Authenticated" with both the Brevo code and DKIM record showing
   green checkmarks

If either of these is not green, every email feature on the site will
silently fail with no visible error to you or the user.

---

## PART 4 — Supabase Auth setup

1. Go to `https://supabase.com/dashboard/project/wxltwnyuhiejavzichfd/auth/url-configuration`
2. Set **Site URL** to: `https://ezworkers.com/login.html`
3. Under **Redirect URLs**, add all of these:
   - `https://ezworkers.com/*`
   - `https://ezworkers.com/login.html`
   - `https://ezworkers.com/register.html`
4. Click Save

5. Go to `https://supabase.com/dashboard/project/wxltwnyuhiejavzichfd/auth/providers`
6. Confirm **Google** is toggled ON with Client ID and Secret filled in
7. Confirm **LinkedIn (OIDC)** is toggled ON with Client ID and Secret filled in

---

## PART 5 — Upload all files to GitHub

Since command-line git has caused problems before, use GitHub's website
upload feature instead. No terminal needed.

1. Extract this ZIP on your computer
2. Go to `https://github.com/ABSHOUKAT/ezworkers-site/upload/main`
3. Open the extracted folder in File Explorer
4. Select everything inside it (Ctrl+A)
5. Drag the entire selection onto the GitHub upload page in your browser
6. Scroll down, type a commit message like "Final deployment"
7. Click "Commit changes"

GitHub will automatically replace any existing files with the same name
and add anything new. This single action uploads everything in one go.

---

## PART 6 — Deploy to Cloudflare Pages

1. Go to Cloudflare dashboard → Workers & Pages → `ezworkers-site`
2. Click "Create new deployment"
3. Open the same extracted folder from Part 5
4. Drag all files and folders onto the upload area
5. Click Deploy
6. Wait for it to finish (usually under a minute)

---

## PART 7 — GitHub Actions Secrets (for the automated background jobs)

These power the automatic job fetching, content articles, and email
digests. Go to:
`https://github.com/ABSHOUKAT/ezworkers-site/settings/secrets/actions`

Confirm these secrets all exist (add any missing ones):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`
- `ANTHROPIC_API_KEY`
- `BREVO_API_KEY`

---

## PART 8 — Final test checklist

Go through every item below in order. Each one should work without error.

1. Open `https://ezworkers.com` — jobs load on the home page
2. Open `https://ezworkers.com/login.html` — page loads with Google,
   LinkedIn, Password, and Magic Link options
3. Click "Continue with Google" — signs you in successfully
4. Sign out, click "Continue with LinkedIn" — signs you in successfully
5. Sign out, use Magic Link with your real email — check your inbox,
   click the link, confirm it signs you in
6. Go to Dashboard → CV Builder → paste some LinkedIn profile text →
   click Import — confirms success, no error message
7. Find any job, click Apply via EzWorkers — confirms submission
8. Find a job with only an email contact (no website link), apply to
   it — confirms "sent to employer", check that inbox for the
   application email
9. Open `https://ezworkers.com/about.html` — loads correctly
10. Open `https://ezworkers.com/llms.txt` — loads as plain text
11. Toggle Arabic on the home page, then visit any job page —
    confirms it stays readable in English with a button to switch back
12. Go to GitHub → Actions tab → manually run "EzWorkers Job Fetch" —
    confirms new jobs appear in Supabase afterward

If all 12 pass, EzWorkers is fully live and working.

---

## What each automated background job does

These run on their own schedule, no action needed from you:

| Job | Schedule | What it does |
|---|---|---|
| EzWorkers Job Fetch | Every 6 hours | Pulls new jobs from Adzuna, Remotive, Arbeitnow |
| EzWorkers Content Agent | Monday & Thursday 8am Riyadh | Writes and publishes a new career article |
| EzWorkers Alert Digest | Monday 10am Riyadh | Sends weekly job match emails to subscribed users |
| EzWorkers Notifications | Every 30 minutes | Sends new application emails to employers, status update emails to job seekers |

You can manually trigger any of these early from GitHub → Actions tab →
select the workflow → "Run workflow" button.

---

## If something breaks later

The single most common cause of any email feature failing is the Brevo
sender verification described in Part 3. If any email stops arriving,
check that first before anything else.

The second most common cause is a Cloudflare Worker secret not actually
taking effect — always redeploy the Worker through "Edit code" after
adding or changing any secret, as described in Part 2.
