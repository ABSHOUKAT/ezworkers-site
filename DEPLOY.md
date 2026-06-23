# EzWorkers Phase 1 — Deployment Instructions

Follow these steps IN ORDER. Do not skip any step.

---

## STEP 1 — Run the SQL schema in Supabase

1. Go to https://supabase.com → sign in → open the ezworkers project
2. Click "SQL Editor" in the left sidebar
3. Click "New query"
4. Open the file: sql/schema.sql
5. Copy the entire contents and paste into the SQL Editor
6. Click "Run" (or press Ctrl+Enter)
7. You should see: "Success. No rows returned."
8. Click "Table Editor" in the sidebar — you should now see a "jobs" table

---

## STEP 2 — Get your Supabase SERVICE ROLE key

The GitHub Actions agent needs the service_role key (not the anon key) to insert data.

1. In Supabase → Project Settings (gear icon) → API
2. Scroll down to "Project API keys"
3. Copy the value under "service_role" — it starts with "eyJ..."
4. Save this key — you will need it in Step 3

---

## STEP 3 — Add GitHub Secrets

1. Go to https://github.com/ABSHOUKAT/ezworkers-site
2. Click Settings → Secrets and variables → Actions → New repository secret
3. Add these 4 secrets ONE BY ONE:

   Name: SUPABASE_URL
   Value: https://wxltwnyuhiejavzichfd.supabase.co

   Name: SUPABASE_SERVICE_KEY
   Value: [paste the service_role key from Step 2]

   Name: ADZUNA_APP_ID
   Value: 1f0aac5b

   Name: ADZUNA_APP_KEY
   Value: f973ab70018c9fc38e9bfb7d45ffd70f

---

## STEP 4 — Push files to GitHub

Open a terminal (or Git Bash on Windows) and run these commands exactly:

```
cd /path/to/ezworkers-site-folder
git init
git remote add origin https://github.com/ABSHOUKAT/ezworkers-site.git
git add .
git commit -m "Phase 1: job fetch agent and paste tool"
git push -u origin main
```

If git push asks for credentials:
- Username: ABSHOUKAT
- Password: use a GitHub Personal Access Token (not your password)
  Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → tick "repo" → copy the token → use as password

---

## STEP 5 — Trigger the first job fetch manually

1. Go to https://github.com/ABSHOUKAT/ezworkers-site
2. Click the "Actions" tab
3. Click "EzWorkers Job Fetch" in the left list
4. Click "Run workflow" → Run workflow
5. Watch the logs — it should run for 2-4 minutes
6. When complete, go to Supabase → Table Editor → jobs
7. You should see hundreds of rows

---

## STEP 6 — Deploy the Paste Agent Cloudflare Worker

1. Go to https://dash.cloudflare.com → Workers & Pages → Create application → Create Worker
2. Name it: ezworkers-paste-agent
3. Click Deploy (ignore the default code)
4. Click "Edit code" and replace ALL code with the contents of: scripts/paste-agent-worker.js
5. Click "Deploy"

Now add the Worker Secrets:
6. Click "Settings" tab → Variables → scroll to "Secrets" → "Add variable" (as Secret, not plain variable)

   Name: ANTHROPIC_API_KEY
   Value: [your Anthropic API key from console.anthropic.com]

   Name: SUPABASE_URL
   Value: https://wxltwnyuhiejavzichfd.supabase.co

   Name: SUPABASE_SERVICE_KEY
   Value: [same service_role key from Step 2]

   Name: ADMIN_PIN
   Value: [choose any PIN, e.g. EZW2026 — you will type this to log into the admin tool]

7. Click Deploy again after adding secrets

8. Note your Worker URL — it looks like:
   https://ezworkers-paste-agent.YOUR-ACCOUNT.workers.dev

---

## STEP 7 — Update the Admin Paste Tool

1. Open: admin/paste-job.html
2. Find this line near the bottom:
   const WORKER_URL = "https://ezworkers-paste-agent.YOUR-SUBDOMAIN.workers.dev";
3. Replace YOUR-SUBDOMAIN with your actual Cloudflare subdomain
4. Save the file

You can now open admin/paste-job.html in any browser (drag and drop the file into Chrome).
Enter your PIN and start pasting jobs.

---

## STEP 8 — Verify everything is working

Check 1: Supabase jobs table has rows
  Supabase → Table Editor → jobs → count rows

Check 2: Paste agent works
  Open admin/paste-job.html
  Enter PIN
  Paste any job text (copy from LinkedIn, Bayt, anywhere)
  Click "Extract and publish job"
  Should say "Job published successfully"
  Check Supabase jobs table — new row with source = "manual_paste"

Check 3: GitHub Actions cron is active
  GitHub → Actions tab → "EzWorkers Job Fetch"
  Should show scheduled runs every 6 hours automatically

---

## What comes next (Phase 2)

Once you confirm Step 8 is working, tell me and I will build:
- The public EzWorkers website (home page, job listing, single job page)
- English + Arabic RTL toggle
- Search and filter (country, sector, job type)
- Full Cloudflare Pages deployment
