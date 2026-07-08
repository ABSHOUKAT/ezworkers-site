# EzWorkers — Deployment Guide
# Last verified: July 2026 | All functions confirmed live

---

## BEFORE YOU START — what you need access to

You need login details for these 5 accounts.
If you do not have access to any of them, stop and get the login before continuing.

1. Supabase     https://supabase.com
2. Cloudflare   https://cloudflare.com
3. GitHub       https://github.com/ABSHOUKAT/ezworkers-site
4. Brevo        https://app.brevo.com
5. GoDaddy      https://godaddy.com (only needed if DNS ever breaks)

---

## IMPORTANT — what NOT to do

Do not use the terminal or command line for any step in this guide.
Everything is done through websites only.

---

## STEP 1 — DATABASE (only needed for a brand new setup)

Skip this step if the site is already live and jobs are showing.
Only do this if you are setting up on a completely new Supabase account.

What to do:
1. Go to https://supabase.com and sign in
2. Click your project (wxltwnyuhiejavzichfd)
3. Click "SQL Editor" in the left menu
4. Click "New query" in the top left
5. Open the file called MASTER-SCHEMA.sql from this package in Notepad
6. Press Ctrl+A to select everything in Notepad, then Ctrl+C to copy
7. Click inside the SQL editor on Supabase, press Ctrl+A, then Ctrl+V to paste
8. Click the green "Run" button
9. At the bottom you should see: "EzWorkers master schema applied successfully"
   If you see that, Step 1 is done. If you see an error, stop and ask for help.

---

## STEP 2 — SUPABASE AUTH SETTINGS (only needed for a brand new setup)

Skip this if the site is already live and sign-in is working.

What to do:
1. Go to https://supabase.com/dashboard/project/wxltwnyuhiejavzichfd/auth/url-configuration
2. Find the box that says "Site URL"
3. Delete whatever is in it and type exactly this:
   https://ezworkers.com/login.html
4. Find the section called "Redirect URLs"
5. Add each of these three lines one at a time (click Add after each one):
   https://ezworkers.com/*
   https://ezworkers.com/login.html
   https://ezworkers.com/register.html
6. Click Save

Then:
1. Go to https://supabase.com/dashboard/project/wxltwnyuhiejavzichfd/auth/providers
2. Find "Google" — make sure the toggle next to it is turned ON (it will be blue)
3. Find "LinkedIn (OIDC)" — make sure the toggle next to it is turned ON
4. If either toggle was off, turn it on and click Save

---

## STEP 3 — BREVO EMAIL SENDER (critical — do not skip)

If this is not set up correctly, NO emails will be sent by the site at all.
No magic link emails, no job alert emails, no application emails. Nothing.

What to do:
1. Go to https://app.brevo.com/senders/list
2. Look for this entry in the list:
   EzWorkers   hello@ezworkers.com   Verified
   The word "Verified" must be there with a green colour.
3. If that entry is missing, click "Add a sender" and enter:
   From name:  EzWorkers
   From email: hello@ezworkers.com
   Then save it and complete any verification steps Brevo asks for.

---

## STEP 4 — CLOUDFLARE WORKERS (4 backend programs)

These 4 programs handle email sending and AI features.
Each one lives in Cloudflare and needs to be set up once.

HOW TO UPDATE A WORKER (you will do this for each one below):
1. Go to https://cloudflare.com and sign in
2. Click "Workers and Pages" in the left menu
3. Click the name of the Worker you want to update
4. Click "Edit code" (top right area)
5. Press Ctrl+A to select all the code in the editor
6. Press Delete to clear it
7. Open the matching file from this package in Notepad
8. Press Ctrl+A then Ctrl+C to copy everything
9. Click inside the Cloudflare editor and press Ctrl+V to paste
10. Click the blue "Deploy" button inside the editor
11. Wait for it to say "Deployed"

HOW TO ADD SECRETS TO A WORKER:
1. Click the Worker name in Cloudflare
2. Click "Settings" tab
3. Click "Variables and secrets"
4. Click "+ Add" for each secret below
5. Type the Name exactly as shown, paste the Value, click Save
6. After adding all secrets, go back to Edit code, add one blank line, click Deploy again
   (This last step is required — secrets do not activate until the Worker is redeployed)

---

WORKER 1: ezworkers-paste-agent
File to paste: scripts/paste-agent-worker.js

Secrets to add:
Name                  Value
ANTHROPIC_API_KEY     your Claude API key from anthropic.com
SUPABASE_URL          https://wxltwnyuhiejavzichfd.supabase.co
SUPABASE_SERVICE_KEY  your Supabase service role key
ADMIN_PIN             EZW2019

---

WORKER 2: ezworkers-linkedin-parser
File to paste: scripts/linkedin-parser-worker.js

Secrets to add:
Name                  Value
ANTHROPIC_API_KEY     your Claude API key from anthropic.com

---

WORKER 3: ezworkers-apply-via-email
File to paste: scripts/apply-via-email-worker.js

Secrets to add:
Name                  Value
BREVO_API_KEY         your Brevo API key
SITE_URL              https://ezworkers.com

---

WORKER 4: ezworkers-magic-link
File to paste: scripts/magic-link-worker.js

Secrets to add:
Name                  Value
SUPABASE_URL          https://wxltwnyuhiejavzichfd.supabase.co
SUPABASE_SERVICE_KEY  your Supabase service role key
BREVO_API_KEY         your Brevo API key
SITE_URL              https://ezworkers.com

---

WHERE TO FIND YOUR KEYS:

Supabase service role key:
1. Go to https://supabase.com/dashboard/project/wxltwnyuhiejavzichfd/settings/api
2. Click the tab "Legacy anon, service_role API keys"
3. Find the row that says "service_role" with a red "secret" badge
4. Click "Reveal" to show the key
5. Copy the full key (it starts with eyJ...)

Anthropic API key:
1. Go to https://console.anthropic.com/settings/keys
2. Copy any active key

Brevo API key:
1. Go to https://app.brevo.com/settings/keys/api
2. Copy your API key

---

## STEP 5 — GITHUB SECRETS (needed for automated background jobs)

What to do:
1. Go to https://github.com/ABSHOUKAT/ezworkers-site/settings/secrets/actions
2. For each secret in the list below, click "New repository secret",
   type the Name exactly as shown, paste the Value, click "Add secret"

Name                  Value
SUPABASE_URL          https://wxltwnyuhiejavzichfd.supabase.co
SUPABASE_SERVICE_KEY  your Supabase service role key (see Step 4 above for how to find it)
ADZUNA_APP_ID         1f0aac5b
ADZUNA_APP_KEY        f973ab70018c9fc38e9bfb7d45ffd70f
ANTHROPIC_API_KEY     your Claude API key
BREVO_API_KEY         your Brevo API key

---

## STEP 6 — UPLOAD FILES TO GITHUB

This puts all the website files on GitHub so Cloudflare can deploy them.

What to do:
1. Extract this ZIP package on your computer.
   You will see folders like: admin, content, css, js, jobs, resources, scripts, sql
   and individual files like index.html, about.html, etc.

2. Go to this URL in your browser:
   https://github.com/ABSHOUKAT/ezworkers-site/upload/main

3. Open File Explorer on your computer and go into the extracted folder.

4. Press Ctrl+A to select everything inside the folder.

5. Drag the selected files and folders into the GitHub page in your browser.
   Wait for the files to finish uploading — you will see a list appear on the page.

6. Scroll down to the bottom of the GitHub page.
   Type any message in the box, for example: final deployment
   Click the green "Commit changes" button.

7. Wait for GitHub to finish. You will see a confirmation message.

HOW TO CHECK IT WORKED:
Go to this URL:
https://github.com/ABSHOUKAT/ezworkers-site/blob/main/scripts/fetch_jobs.py

Scroll down to around line 130.
You should see this text:
   job_title = clean(j.get("title", ""), 200)

If you see that, Step 6 is done correctly.
If you see something different or the page gives an error, the upload did not work.
In that case:
1. Go to that same URL
2. Click the pencil icon (Edit) in the top right
3. Press Ctrl+A to select all, then Delete to clear
4. Open fetch_jobs.py from this package in Notepad
5. Press Ctrl+A, Ctrl+C to copy, then Ctrl+V to paste into GitHub
6. Click Commit changes at the bottom

---

## STEP 7 — DEPLOY TO CLOUDFLARE PAGES

What to do:
1. Go to https://cloudflare.com and sign in
2. Click "Workers and Pages" in the left menu
3. Click "ezworkers-site"
4. Click "Create new deployment" (top right)
5. Open the extracted folder from Step 6 in File Explorer
6. Select everything inside the folder (Ctrl+A)
7. Drag everything onto the Cloudflare upload area
8. Click "Deploy"
9. Wait for the green "Success" message (usually takes about 1 minute)

---

## STEP 8 — TEST EVERYTHING

Go through each item below after deployment.
Each one should work without any error message.

TEST 1: Jobs load on the homepage
Go to https://ezworkers.com
You should see job listings appearing on the page.
If the page is blank or shows an error, the Cloudflare Pages deployment did not work.

TEST 2: Google sign-in works
Go to https://ezworkers.com/login.html
Click "Continue with Google"
It should open Google's sign-in page, let you sign in, then bring you back to your dashboard.

TEST 3: LinkedIn sign-in works
Same page, click "Continue with LinkedIn"
Same result — signs you in and brings you to the dashboard.

TEST 4: Magic link works
Same page, click the "Magic link" tab
Type your email address, click "Send magic link"
Check your inbox for an email from hello@ezworkers.com
Click the link in the email — it should sign you in automatically.
If the email does not arrive within 2 minutes, check your spam folder.
If it is not in spam either, the Brevo sender in Step 3 is not set up correctly.

TEST 5: CV builder and LinkedIn import work
Sign in, go to Dashboard, click "CV Builder"
Paste some text from your LinkedIn profile into the import box
Click "Import from pasted text"
Your experience, skills, and education should appear in the CV sections below.
No error message should appear.

TEST 6: Admin paste job works
Go to https://ezworkers.com/admin/paste-job.html
Type the PIN:  EZW2019
Press Enter
Paste this text into the text area:
   Procurement Manager at ACME Group, Riyadh Saudi Arabia. SAR 25000 per month.
   5 years procurement experience required. Apply to hr@acme.com
Click "Extract with AI"
A form should appear with the job details filled in automatically.
Click "Save to EzWorkers"
You should see: "Job saved and live on EzWorkers"
No error should appear.

TEST 7: Admin job management works
Click the "Manage Jobs" tab in the admin panel
A list of jobs should appear
Click "Edit" on any job — an edit form should open
Change the title, click "Save changes" — it should save without error
Click "Deactivate" on any job — it should toggle to Inactive
The job should disappear from the main site immediately.

TEST 8: Apply via email works
Find any job on the site that shows an email address instead of a website link
Click "Apply via EzWorkers"
Fill in your cover note, click Submit
You should see "Application sent to employer"
Check the employer's inbox — the application email should arrive.

TEST 9: Fetch agent works
Go to https://github.com/ABSHOUKAT/ezworkers-site/actions
Click "EzWorkers Job Fetch"
Click "Run workflow" then "Run workflow" again (the green button)
Wait 2 minutes
Click the finished run to open it
Click "fetch-jobs" to expand it
You should see lines like:
   Remotive: 200+ raw jobs
   Arbeitnow: 500+ raw jobs
   Adzuna: 20+ raw jobs
   Upserted X jobs
If you see "0 raw jobs" on all sources, the fetch agent is broken.

TEST 10: Content agent works
Go to https://github.com/ABSHOUKAT/ezworkers-site/actions
Click "EzWorkers Content Agent"
Click "Run workflow" then "Run workflow" (green button)
Wait 3 minutes
The run should finish with a green tick.
Go to https://ezworkers.com/blog.html — a new article should have appeared.

---

## AUTOMATED JOBS — what runs on its own (no action needed)

These run automatically. You do not need to do anything.

Job name                    When it runs                What it does
EzWorkers Job Fetch         Every 6 hours               Pulls new jobs from Remotive, Arbeitnow, Adzuna
EzWorkers Content Agent     Monday + Thursday 8am KSA   Writes and publishes a new career article
EzWorkers Alert Digest      Monday 10am KSA             Sends weekly job alert emails to subscribers
EzWorkers Notifications     Every 30 minutes            Emails employers about new applications

To run any of these early: GitHub, Actions tab, click the job name, click "Run workflow".

---

## KEY INFORMATION TO KEEP SAFE

Site URL:               https://ezworkers.com
Admin panel:            https://ezworkers.com/admin/paste-job.html
Admin PIN:              EZW2019
Supabase project:       wxltwnyuhiejavzichfd
Supabase URL:           https://wxltwnyuhiejavzichfd.supabase.co
Adzuna App ID:          1f0aac5b
Adzuna App Key:         f973ab70018c9fc38e9bfb7d45ffd70f
Verified email sender:  hello@ezworkers.com
LinkedIn company page:  https://www.linkedin.com/company/ezworkers
GitHub repo:            https://github.com/ABSHOUKAT/ezworkers-site

---

## IF SOMETHING GOES WRONG

PROBLEM: Site loads but no jobs appear
CAUSE: Cloudflare Pages deployment did not pick up the latest files
FIX: Go to Cloudflare, Workers and Pages, ezworkers-site, Create new deployment,
     upload all files again, Deploy.

PROBLEM: Magic link email never arrives
CAUSE 1: hello@ezworkers.com is not verified in Brevo
FIX: Go to https://app.brevo.com/senders/list and check it is listed as Verified.
     If missing, add it.
CAUSE 2: Supabase legacy API keys are disabled
FIX: Go to https://supabase.com/dashboard/project/wxltwnyuhiejavzichfd/settings/api
     Click "Legacy anon, service_role API keys" tab
     Click "Re-enable JWT-based API keys"

PROBLEM: Admin paste job gives "Claude extraction failed"
CAUSE: The paste-agent-worker.js on Cloudflare is an old version
FIX: Go to Cloudflare, open ezworkers-paste-agent Worker, click Edit code,
     select all, delete, paste the file from this package, click Deploy.

PROBLEM: Admin paste job gives "Supabase error: Legacy API keys are disabled"
CAUSE: Someone disabled the legacy API keys in Supabase
FIX: Go to https://supabase.com/dashboard/project/wxltwnyuhiejavzichfd/settings/api
     Click "Legacy anon, service_role API keys" tab
     Click "Re-enable JWT-based API keys"
     This must stay enabled. Do not disable it.

PROBLEM: Fetch agent shows "0 raw jobs" for all sources
CAUSE: The old version of fetch_jobs.py is on GitHub
FIX: Go to https://github.com/ABSHOUKAT/ezworkers-site/blob/main/scripts/fetch_jobs.py
     Click the pencil icon to edit
     Select all, delete, paste the file from this package, commit.
     Then run the workflow again.

PROBLEM: A Worker gives "Invalid URL: undefined/..."
CAUSE: A secret is missing or did not activate after being saved
FIX: Go to the Worker in Cloudflare, click Settings, Variables and secrets.
     Delete and retype the missing secret manually (do not paste — type it).
     Then open Edit code, add one blank line anywhere, click Deploy.

PROBLEM: Website loads in Arabic with no way to switch back
FIX: On the website, press F12 to open developer tools.
     Click the Console tab.
     Type:  allow pasting   and press Enter.
     Then type:  localStorage.removeItem('ez_lang'); location.reload();
     Press Enter. The site reloads in English.

---

## GOOGLE SEARCH CONSOLE — what still needs to be done

The following was already done:
- Ownership verified
- Sitemap submitted
- Old spam pages submitted for removal
- Key pages submitted for indexing

What you should check in 1 week:
1. Go to https://search.google.com/search-console
2. Click "Coverage" in the left menu
   You want to see your real pages (index, about, salary-guide, jobs, resources)
   listed as "Valid" and indexed.
   If they show as "Discovered but not indexed", click each one and click
   "Request Indexing" again.
3. Click "Removals" in the left menu
   The old spam pages (/employer/, /cv-packages/, /faqs/) should show as
   "Temporarily removed". If any of them are back, submit them again.
4. Click "Enhancements" in the left menu
   Look for "Job Postings" — this appears once Google starts reading your job pages.
   Any errors shown there need fixing (come back here for help if that happens).

Nothing else is required in Google Search Console right now.
The main work is done — just check back in 1 week as described above.

