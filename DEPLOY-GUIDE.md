# EzWorkers — Final Deployment Guide
# Version: July 2026 | Status: Production Ready

This is the complete, tested package for ezworkers.com.
Everything in here has been confirmed working on the live site.
Follow the steps below in order. No coding knowledge required.

---

## WHAT IS IN THIS PACKAGE

54 files covering the complete EzWorkers platform:

- Full website (HTML pages, CSS, JavaScript)
- 4 Cloudflare Worker scripts (backend email and AI features)
- 4 GitHub Actions workflow files (automated jobs)
- Python automation scripts (job fetching, emails, content)
- 1 master SQL file for database setup
- robots.txt, sitemap.xml, llms.txt (SEO and AI discoverability)

---

## ACCOUNTS YOU NEED ACCESS TO

Before starting, make sure you have login access to all of these:

1. Supabase — https://supabase.com (project ID: wxltwnyuhiejavzichfd)
2. Cloudflare — https://cloudflare.com
3. GitHub — https://github.com/ABSHOUKAT/ezworkers-site
4. Brevo — https://app.brevo.com
5. Your domain registrar (GoDaddy) — nameservers must point to Cloudflare

---

## PART 1 — DATABASE SETUP
### Only do this for a completely fresh Supabase project.
### If your database is already live and working, skip this entire part.

Step 1. Go to https://supabase.com/dashboard/project/wxltwnyuhiejavzichfd/sql/new

Step 2. Open the file called MASTER-SCHEMA.sql from this package in Notepad.

Step 3. Copy everything inside it.

Step 4. Paste it into the SQL editor on Supabase.

Step 5. Click Run. You should see this message at the bottom:
         "EzWorkers master schema applied successfully"

---

## PART 2 — SUPABASE AUTH SETTINGS
### Do this once. Skip if already configured.

Step 1. Go to:
https://supabase.com/dashboard/project/wxltwnyuhiejavzichfd/auth/url-configuration

Step 2. Set Site URL to exactly:
         https://ezworkers.com/login.html

Step 3. Under Redirect URLs, add these three (one at a time, click Add after each):
         https://ezworkers.com/*
         https://ezworkers.com/login.html
         https://ezworkers.com/register.html

Step 4. Click Save.

Step 5. Go to:
https://supabase.com/dashboard/project/wxltwnyuhiejavzichfd/auth/providers

Step 6. Find Google in the list. Make sure the toggle is ON (blue).
         Client ID and Secret should already be filled in.

Step 7. Find LinkedIn (OIDC) in the list. Make sure the toggle is ON (blue).
         Client ID and Secret should already be filled in.

---

## PART 3 — BREVO EMAIL SENDER VERIFICATION
### Critical. Every email feature fails silently if this is not done.

Step 1. Go to https://app.brevo.com/senders/list

Step 2. Confirm you see this entry in the list:
         EzWorkers <hello@ezworkers.com>   with a green "Verified" badge

Step 3. If it is missing, click Add a sender and enter:
         From name: EzWorkers
         From email: hello@ezworkers.com
         Then save and verify it.

Step 4. Go to the Domains tab on the same page.
         Confirm ezworkers.com shows "Authenticated" with green ticks
         on both the Brevo code and DKIM record.

If either is not green, all magic link emails, application emails,
alert digests, and notification emails will fail with no error shown.

---

## PART 4 — CLOUDFLARE WORKERS (4 BACKEND PROGRAMS)

These are small programs that handle email sending and AI features.
They run on Cloudflare, not on the website itself.

### How to deploy each Worker:

Go to Cloudflare dashboard.
Click Workers and Pages.
Click the Worker name from the list below.
Click Edit code.
Select all the existing code (Ctrl+A), delete it.
Open the matching file from this package in Notepad.
Copy everything, paste it into the Cloudflare editor.
Click Deploy (the blue button inside the editor).

Do this for each of the 4 Workers:

WORKER 1: ezworkers-paste-agent
File to paste: scripts/paste-agent-worker.js
Secrets required (Settings > Variables and secrets > Add):
  ANTHROPIC_API_KEY   your Claude API key
  SUPABASE_URL        https://wxltwnyuhiejavzichfd.supabase.co
  SUPABASE_SERVICE_KEY  your Supabase service role key
  ADMIN_PIN           EZW2019

WORKER 2: ezworkers-linkedin-parser
File to paste: scripts/linkedin-parser-worker.js
Secrets required:
  ANTHROPIC_API_KEY   your Claude API key

WORKER 3: ezworkers-apply-via-email
File to paste: scripts/apply-via-email-worker.js
Secrets required:
  BREVO_API_KEY       your Brevo API key
  SITE_URL            https://ezworkers.com

WORKER 4: ezworkers-magic-link
File to paste: scripts/magic-link-worker.js
Secrets required:
  SUPABASE_URL        https://wxltwnyuhiejavzichfd.supabase.co
  SUPABASE_SERVICE_KEY  your Supabase service role key
  BREVO_API_KEY       your Brevo API key
  SITE_URL            https://ezworkers.com

IMPORTANT: After adding secrets to any Worker, you must open
Edit code, make any small change (add or remove a blank line),
and click Deploy again inside the editor. Just saving secrets
alone is not enough — the Worker must be redeployed to pick them up.

---

## PART 5 — GITHUB ACTIONS SECRETS

These are needed for the automated background jobs to run.

Go to:
https://github.com/ABSHOUKAT/ezworkers-site/settings/secrets/actions

Make sure all 6 of these secrets exist. Click New repository secret
to add any that are missing:

Secret name             Value
SUPABASE_URL            https://wxltwnyuhiejavzichfd.supabase.co
SUPABASE_SERVICE_KEY    your Supabase service role key
ADZUNA_APP_ID           1f0aac5b
ADZUNA_APP_KEY          f973ab70018c9fc38e9bfb7d45ffd70f
ANTHROPIC_API_KEY       your Claude API key
BREVO_API_KEY           your Brevo API key

---

## PART 6 — UPLOAD FILES TO GITHUB

This uploads the website files so Cloudflare Pages can deploy them.
No terminal or command line needed.

Step 1. Extract this ZIP package on your computer.
        You will see folders: admin, content, css, js, jobs,
        resources, scripts, sql, and individual HTML files.

Step 2. Go to:
        https://github.com/ABSHOUKAT/ezworkers-site/upload/main

Step 3. Open the extracted folder in File Explorer on your computer.

Step 4. Press Ctrl+A to select everything inside the folder.

Step 5. Drag the selected files onto the GitHub upload page in your browser.

Step 6. Wait for GitHub to show the list of files being added.

Step 7. Type any commit message, for example: Final deployment

Step 8. Click Commit changes.

GitHub will automatically replace existing files and add new ones.

Step 9. After committing, verify the upload worked by opening:
        https://github.com/ABSHOUKAT/ezworkers-site/blob/main/scripts/fetch_jobs.py

        Scroll to around line 130. You should see:
        job_title = clean(j.get("title", ""), 200)

        If you see detect_country(title, "") instead, the upload
        did not work. In that case, use the pencil (Edit) icon on
        that file page, select all, delete, paste the correct file
        from Notepad, and commit.

---

## PART 7 — DEPLOY TO CLOUDFLARE PAGES

Step 1. Go to Cloudflare dashboard.
Step 2. Click Workers and Pages.
Step 3. Click ezworkers-site.
Step 4. Click Create new deployment.
Step 5. Open the extracted folder from Part 6.
Step 6. Select all files and folders, drag them onto the upload area.
Step 7. Click Deploy.
Step 8. Wait for deployment to finish (usually under 2 minutes).

---

## PART 8 — GOOGLE SEARCH CONSOLE (URGENT)

The old ezworkers.com website left hundreds of spam pages indexed
in Google (casino pages, testosterone articles, unrelated content).
These are actively harming your domain and hiding your real pages.

### Step A — Verify ownership

Go to https://search.google.com/search-console
Click Add property, type https://ezworkers.com, click Continue.
Choose HTML tag verification.
Your site already has the tag embedded so click Verify immediately.

### Step B — Submit your sitemap

Click Sitemaps in the left menu.
In the Add a new sitemap box, type: sitemap.xml
Click Submit.

### Step C — Remove old spam pages (do this today, not later)

Click Removals in the left menu.
Click New Request.
Submit these URLs one by one, choosing "Remove all URLs with this prefix"
for the /employer/ entry:

  https://ezworkers.com/employer/
  https://ezworkers.com/cv-packages/
  https://ezworkers.com/faqs/

This tells Google to stop showing those old pages in search results.
Processing takes 24 to 72 hours per request.

### Step D — Request indexing for your real pages

Click URL Inspection in the left menu.
Paste each URL below, press Enter, then click Request Indexing.
Do this for each one (Google allows about 10 per day):

  https://ezworkers.com/
  https://ezworkers.com/about.html
  https://ezworkers.com/salary-guide.html
  https://ezworkers.com/jobs/saudi-arabia.html
  https://ezworkers.com/jobs/uae.html
  https://ezworkers.com/jobs/qatar.html
  https://ezworkers.com/jobs/procurement.html
  https://ezworkers.com/resources/iqama-guide.html
  https://ezworkers.com/resources/cv-tips.html
  https://ezworkers.com/blog.html

---

## PART 9 — FINAL TEST CHECKLIST

Go through every item below after deployment. Each one should work.

 1. Open https://ezworkers.com
    Jobs load on the home page. Search and country filter work.

 2. Open https://ezworkers.com/login.html
    You see Google, LinkedIn, Password, and Magic Link sign-in options.

 3. Click Continue with Google
    It redirects to Google and signs you in successfully.

 4. Sign out. Click Continue with LinkedIn
    It redirects to LinkedIn and signs you in successfully.

 5. Sign out. Enter your email under Magic Link, click Send
    You receive an email from hello@ezworkers.com within 1 minute.
    Clicking the link signs you in.

 6. Signed in, go to Dashboard, click CV Builder
    Paste some text from a LinkedIn profile and click Import.
    Fields populate automatically. No error message appears.

 7. Open any job, click Apply via EzWorkers
    Application submits successfully and appears in your dashboard.

 8. Find a job that shows only an email address (no website link)
    Apply via EzWorkers. Confirm the message says sent to employer.
    Check that email inbox to confirm the application arrived.

 9. Open https://ezworkers.com/admin/paste-job.html
    Enter PIN: EZW2019
    Paste any job listing text, click Extract with AI.
    A preview form appears with fields filled in.
    Click Save. The job appears on the live site.

10. Open the Manage Jobs tab in admin.
    Jobs list loads. Edit, delete, and activate buttons all work.

11. Go to GitHub, click Actions tab, click EzWorkers Job Fetch,
    click Run workflow, wait 2 minutes, check the log.
    You should see Remotive: 200+ raw jobs and Adzuna: 20+ raw jobs.

12. Open https://ezworkers.com/about.html
    Page loads with the company overview and LinkedIn follow button.

13. Open https://ezworkers.com/llms.txt
    Plain text file loads listing all key pages.

14. Toggle Arabic on the homepage, then visit any job page.
    The page shows in English with an English button visible.

---

## AUTOMATED BACKGROUND JOBS (run on their own, no action needed)

These run automatically once the GitHub files and secrets are in place:

Job                          Schedule              What it does
EzWorkers Job Fetch          Every 6 hours         Pulls jobs from Remotive, Arbeitnow, Adzuna
EzWorkers Content Agent      Mon and Thu 8am Riyadh  Publishes a new career article
EzWorkers Alert Digest       Monday 10am Riyadh    Sends weekly job alert emails to subscribers
EzWorkers Notifications      Every 30 minutes      Emails employers on new applications,
                                                   emails job seekers on status changes

To trigger any of these manually: GitHub, Actions tab, click the
workflow name, click Run workflow.

---

## IF SOMETHING BREAKS

Problem: Any email not arriving (magic link, applications, alerts)
Fix: Go to https://app.brevo.com/senders/list and confirm
     hello@ezworkers.com shows as Verified. If missing, add it.
     This is the most common cause of all email failures.

Problem: Worker returns "Invalid URL: undefined/..."
Fix: A secret is missing or not binding. Go to the Worker in
     Cloudflare, Settings, Variables and secrets. Delete and
     retype the affected secret manually (do not paste). Then
     open Edit code, add a blank line, click Deploy.

Problem: Admin paste job gives "Claude extraction failed"
Fix: The paste-agent-worker.js on Cloudflare is the old version.
     Open Edit code, replace all content with the file from this
     package, click Deploy.

Problem: Fetch agent fetches 0 jobs
Fix: Open the GitHub Actions log for the failed run. If you see
     "name 'title' is not defined", the fetch_jobs.py on GitHub
     is the old version. Use the pencil icon on GitHub to open
     scripts/fetch_jobs.py, select all, replace with the file
     from this package.

Problem: Website loads in Arabic with no way to switch
Fix: Open your browser, go to ezworkers.com, press F12, click
     Console, type: allow pasting (press Enter), then type:
     localStorage.removeItem('ez_lang'); location.reload();
     Press Enter. The site reloads in English.

---

## KEY CREDENTIALS REFERENCE

Supabase project ID:    wxltwnyuhiejavzichfd
Supabase URL:           https://wxltwnyuhiejavzichfd.supabase.co
Adzuna App ID:          1f0aac5b
Adzuna App Key:         f973ab70018c9fc38e9bfb7d45ffd70f
Admin PIN:              EZW2019
Brevo verified sender:  hello@ezworkers.com
LinkedIn company page:  https://www.linkedin.com/company/ezworkers
GitHub repo:            https://github.com/ABSHOUKAT/ezworkers-site
Live site:              https://ezworkers.com

