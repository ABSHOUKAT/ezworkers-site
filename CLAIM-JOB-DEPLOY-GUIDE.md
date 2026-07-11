# EzWorkers: Employer Job-Claiming — Deployment Guide

## WHAT THIS ADDS

When a candidate applies to a job that has an email apply address but no
registered employer account behind it yet (for example, a job you pasted
in through the admin tool), that employer now receives an email inviting
them to click one link, sign in automatically, and land directly in a
full Applicant Pipeline for that job — CVs, cover notes, hiring stages,
all of it. No account setup steps, no password, one click.

As agreed, candidate details (name, CV, cover note) are never placed
directly in the notification email itself anymore, for any job, claimed
or not — they only ever become visible after the employer signs in.

## WHAT WAS TESTED BEFORE THIS WAS BUILT

The database change here allows something new: an unauthenticated-until-now
employer's browser can write to the `jobs` table for the first time ever
on this platform. Because this is a genuinely new kind of access, it was
tested against a real Postgres instance running the exact production
schema, not just written and assumed safe:

- A brand-new employer legitimately claiming an unowned job: succeeds
- Trying to claim a job that's already claimed: blocked, zero rows affected
- Trying to claim a job while sneaking in a title/salary change in the
  same request: the entire request is rejected by Postgres itself before
  any part of it can apply — proven, not assumed
- Trying to claim someone else's already-owned job: blocked
- Trying to assign ownership to a different user's ID than your own:
  rejected by the database

## DEPLOY IN THIS ORDER

**Step 1 — Run the SQL.** Supabase SQL Editor, paste in
`sql/CLAIM-JOB-FIX.sql`, click Run. You should see "Employer job-claiming
fix applied successfully".

**Step 2 — Upload the changed/new files to GitHub:**
- `claim.html` (new file)
- `scripts/notify.py` (updated)

Extract this ZIP, go to
`https://github.com/ABSHOUKAT/ezworkers-site/upload/main`, select
everything in the extracted folder, drag it in, commit.

**Step 3 — Update the GitHub Actions secret list.** No new secrets are
needed — this reuses `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `BREVO_API_KEY`,
and `SITE_URL`, all of which already exist for the notification workflow.

**Step 4 — Redeploy Cloudflare Pages** as usual: Create new deployment,
drag in all files, Deploy.

## TEST CHECKLIST

**TEST 1 — Claim flow, end to end**
Post (or find) a job through the admin paste tool with an email apply
address you can actually check. Apply to it as a candidate. Wait for the
notification job to run (every 30 minutes), or trigger "EzWorkers
Notification Agent" manually from GitHub Actions. Check the inbox for
that apply email — you should receive an email that does NOT contain the
candidate's name, saying only that an application arrived, with a button
"Claim this job & view applicants". Click it.

**TEST 2 — Confirm the claim actually worked**
Clicking that button should briefly show "Setting up your account..." and
then "Job claimed successfully", landing you in the Applicant Pipeline
with that candidate's real name and CV visible.

**TEST 3 — Confirm it can't be claimed twice**
Manually revisit the exact same claim link a second time (or have someone
else try it). It should NOT be able to reclaim or reassign the job — the
link itself is also single-use per Supabase's own magic link expiry, so
this should fail gracefully with a message to sign in normally instead.

**TEST 4 — Confirm already-claimed jobs behave as before**
Apply to a job that already has an owner (one posted through "Post a job"
by a real employer). That employer's notification email should link
straight to their existing dashboard, with no candidate details in the
email and no "claim" language, since they already own it.

## HONEST LIMITATION TO KNOW ABOUT

If the same email address the job posting uses already has an EzWorkers
account as a job seeker (not an employer), the claim flow will sign them
in as that existing account, but `employer-dashboard.html` currently
redirects any non-employer profile back to the regular job seeker
dashboard rather than granting employer access. This is a real edge case
(a personal email used both to apply for jobs and to receive hiring
emails) and would need a small follow-up if it comes up in practice — it
does not affect the common case of a dedicated company inbox like
hr@company.com.
