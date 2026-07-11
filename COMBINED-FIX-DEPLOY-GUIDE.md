# EzWorkers: Combined Fix — Deployment Guide
# Covers: (1) Crawler/SEO visibility + hiding "Source" from the public
#         (2) Email address exposure in Apply links

This package contains BOTH fixes together, already tested as one unit.
You do not need to deploy them separately.

---

## WHAT WAS WRONG

**Issue 1 — SEO / AI visibility**
Job pages, article pages, and the blog list loaded their real content with
JavaScript after the page opened. Google eventually renders JavaScript, but
AI tools like Perplexity, ChatGPT, and Claude often fetch the raw HTML
directly and never see that content at all — meaning shared job links
looked empty to those tools. Separately, the site's own "Source" label
(e.g. "admin_paste", "adzuna") was visible to every visitor on the public
job page, which should only ever be visible to you in the admin panel.

**Issue 2 — Email exposure**
Jobs where the employer's apply method was a plain email address (rather
than a website link) were, in three separate places in the code, rendered
as a direct `mailto:employer@email.com` link. Anyone viewing the page's
source code, or any crawler reading the page, could see the employer's
real email address. This defeats the entire purpose of routing
applications through EzWorkers.

---

## WHAT WAS FIXED

1. A new file, `_worker.js`, server-renders job pages, article pages, and
   the blog list with real content before the page ever reaches a visitor
   or a crawler — so AI tools and search engines now see full job titles,
   descriptions, and structured data directly in the raw page.
2. The "Source" label was removed from the public job page. It still
   appears in the admin Manage Jobs tab, where it belongs.
3. Every code path that could produce a `mailto:` link has been removed.
   Jobs with an email-only apply method now only ever show "Apply via
   EzWorkers" (for signed-in job seekers) or "Sign in to apply" (for
   visitors) — never a direct link to the employer's inbox.
4. Any email address appearing inside a job's description text (for
   example "send your CV to hr@company.com") is now automatically masked
   to "[apply via EzWorkers]" everywhere it would otherwise be shown:
   the visible page, the page crawlers receive, the page's meta
   description, and its structured data (JobPosting schema).

---

## BEFORE YOU DEPLOY

This package assumes the blog admin panel and its database table from the
earlier delivery are already live. If you have not yet run that SQL setup
or created the blog admin login, do that first — see the separate
BLOG-ADMIN-GUIDE.md from that delivery. This package does not repeat those
steps.

---

## STEP 1 — Upload the changed files to GitHub

Only 2 files actually changed. Everything else in this ZIP is included so
the upload is complete and self-contained, but these are the ones that
matter:

- `_worker.js` (at the root — new crawler visibility engine, now also
  masks emails in every job's server-rendered content)
- `job.html` (Source label removed; every apply-button code path fixed to
  never produce a mailto link; description text masks any email found
  inside it)

To upload:
1. Extract this ZIP on your computer
2. Go to `https://github.com/ABSHOUKAT/ezworkers-site/upload/main`
3. Open the extracted folder, press Ctrl+A to select everything inside
4. Drag everything onto the GitHub upload page
5. Type a commit message, for example: crawler visibility and email fix
6. Click "Commit changes"

## STEP 2 — Redeploy Cloudflare Pages

1. Go to Cloudflare, "Workers and Pages"
2. Click `ezworkers-site`
3. Click "Create new deployment"
4. Drag in ALL files from the extracted folder (not just the 2 changed
   ones — Cloudflare replaces the whole site on each deployment)
5. Click "Deploy" and wait for the success message

---

## STEP 3 — TEST EVERYTHING (do all 7, in order)

**TEST 1 — Crawlers can now read job pages**
Open any job page and copy its address. In a new browser tab type
`view-source:` followed by that address, for example:
`view-source:https://ezworkers.com/job.html?id=e9fe93e1-428b-4254-9412-3f3ba656c269`
Press Ctrl+F and search for the job title. It must be found directly in
the code, not just loaded afterward by a script.

**TEST 2 — "Source" is gone from the public page**
Open the same job page normally (not view-source). Confirm there is no
"Source" label anywhere in the job details sidebar. Then go to
`https://ezworkers.com/admin/paste-job.html`, open the Manage Jobs tab,
and confirm the Source is still visible there for every job.

**TEST 3 — Email jobs show no mailto link (logged out)**
Find a job where the employer's apply method is an email address rather
than a website (ask if unsure which ones these are, or check the admin
panel). While signed out, open that job. You should see "Sign in to
apply" only — no separate "Apply on employer site" link, and clicking
anything must never open your email app.

**TEST 4 — Email jobs show no mailto link (signed in as a job seeker)**
Sign in as a regular job seeker account, open the same job. You should
see an orange "Apply via EzWorkers" button only. No direct link to the
employer's email should appear anywhere on the page.

**TEST 5 — Applying to an email job still reaches the employer**
While signed in as a job seeker, click "Apply via EzWorkers" on that same
job, fill in the short form, and submit. Confirm you see a success
message. Then check the employer's real inbox (or your own test inbox if
that's what the job used) to confirm the application arrived. This proves
the application still gets delivered — only the direct link was removed,
not the actual delivery.

**TEST 6 — No email address appears in the page's raw code**
On that same email-apply job, use `view-source:` again as in Test 1.
Press Ctrl+F and search for "@". You should find no employer or applicant
email address anywhere in the code — only unrelated things like image
paths or script URLs if any contain an @ symbol, which is normal.

**TEST 7 — Description text with an email inside it is masked**
If you can find or create a test job whose description contains a line
like "Apply: someone@company.com", open that job page and confirm the
description shows "[apply via EzWorkers]" in place of that email, both on
the visible page and in `view-source:`.

---

## IF SOMETHING GOES WRONG

**Problem: A job page shows completely blank**
Cause: `_worker.js` failed to load the page correctly for some reason.
Fix: Every page has a built-in fallback to the original page content, so
this should not normally happen. If it does, delete `_worker.js` from
GitHub (three dots on the file, Delete file, commit) and redeploy — this
instantly restores the site to how it worked before this update, with no
other effect on anything else. Then let me know so we can find the cause.

**Problem: Manage Jobs tab in admin no longer shows Source**
This should not happen — the removal was made only in the public
`job.html` file, not the admin panel. If you see this, tell me and I will
check immediately.

**Problem: An email job still shows a mailto link somewhere**
Tell me exactly which job (its title or link) and what button or text
showed it, so I can check that specific case.
