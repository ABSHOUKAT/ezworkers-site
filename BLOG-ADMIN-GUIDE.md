# EzWorkers: Blog Admin Panel + Crawler Visibility Fix
# Deployment Guide

This package contains TWO upgrades in one deployment:

UPGRADE 1: Blog admin panel (write, edit, schedule posts yourself)
UPGRADE 2: Crawler visibility fix. Until now, job pages, the blog, the
homepage and the country pages were EMPTY for Google, ChatGPT and
Perplexity because all content loaded with JavaScript. A new file
called _worker.js now fills every one of those pages with real content
on the server before it reaches any visitor or crawler. Nothing extra
to configure: it deploys automatically with the normal upload.

What the blog upgrade changes:
- The automatic twice-weekly blog generator is STOPPED.
- You now write, edit, schedule, and delete blog posts yourself in a new
  admin panel at https://ezworkers.com/admin/blog.html
- Scheduling is enforced by the database. A post scheduled for Monday 9am
  stays invisible on the website until Monday 9am. No servers, no cron.
- Only the admin account can touch the blog. Regular site users cannot.
- The existing live article is migrated and stays live.

Follow the 5 parts below IN ORDER. The order matters.

---

## PART 1: Set up the database (do this FIRST)

1. Open this link: https://supabase.com/dashboard/project/wxltwnyuhiejavzichfd/sql/new
2. Open the file sql/BLOG-ADMIN-SETUP.sql from this package in Notepad
3. Press Ctrl+A then Ctrl+C in Notepad to copy everything
4. Click inside the big empty box on the Supabase page, press Ctrl+V
5. Click the green "Run" button (bottom right of the box)
6. Wait 2 seconds. At the bottom you must see:
   "EzWorkers blog admin schema applied successfully"
   If you see red error text instead, stop and share the error.

---

## PART 2: Create the admin login

1. Open this link: https://supabase.com/dashboard/project/wxltwnyuhiejavzichfd/auth/users
2. Click the green "Add user" button (top right). Choose "Create new user"
3. In the Email box type exactly:  admin@ezworkers.com
4. In the Password box type a strong password you will remember.
   Write it down somewhere safe now. You will use it every time you
   open the blog admin panel.
5. If you see a checkbox called "Auto Confirm User", tick it.
6. Click "Create user"

---

## PART 3: Stop the old automatic blog generator on GitHub

Uploading files does NOT delete old files on GitHub, so this step is manual.

1. Open this link:
   https://github.com/ABSHOUKAT/ezworkers-site/blob/main/.github/workflows/content-agent.yml
2. Look at the top right of the file. Click the three dots button (...)
3. Click "Delete file"
4. Scroll down, click the green "Commit changes" button
5. Click "Commit changes" again in the popup

The Monday and Thursday automatic articles are now stopped forever.

---

## PART 4: Upload the new files to GitHub

1. Extract this ZIP package on your computer
2. Open this link: https://github.com/ABSHOUKAT/ezworkers-site/upload/main
3. In File Explorer, open the extracted folder
4. Press Ctrl+A to select everything inside
5. Drag the selection onto the GitHub upload page
6. Wait for the file list to appear, scroll down
7. Type: blog admin panel
8. Click the green "Commit changes" button

---

## PART 5: Deploy to Cloudflare Pages

1. Go to https://cloudflare.com and sign in
2. Click "Workers and Pages" in the left menu
3. Click "ezworkers-site"
4. Click "Create new deployment"
5. Drag ALL files and folders from the extracted ZIP onto the upload area
   (Cloudflare replaces the whole site each time, so always upload everything)
6. Click "Deploy" and wait for the green success message

---

## TEST CHECKLIST (do all 6, in order)

TEST 1: Old article still live
Open https://ezworkers.com/blog.html
You must see the article "Top procurement skills GCC employers are hiring
for in 2026". Click it. It must open and read normally, in both English
and Arabic.

TEST 2: Admin login works
Open https://ezworkers.com/admin/blog.html
Type email admin@ezworkers.com and the password from Part 2. Click Sign in.
You must see the articles list with 1 article in it, marked "Published".

TEST 3: Create a draft
Click "+ New article". Type a title like "My first test post".
Type one sentence in the body. Leave Status as "Draft". Click "Save article".
Open https://ezworkers.com/blog.html in a different browser tab.
The test post must NOT appear there. Drafts are hidden. Correct behaviour.

TEST 4: Schedule a post
In the admin, click Edit on your test post. Change Status to
"Schedule for later". Pick a time 5 minutes from now. Click "Save article".
The list must show an orange "Scheduled" badge with the time.
Check the public blog page: still hidden. Wait 6 minutes, refresh the
public blog page: the post must now appear by itself. That is the
database doing the scheduling.

TEST 5: Edit and publish now
Edit the test post, change Status to "Publish now", save.
Refresh the public blog: visible immediately.

TEST 6: Delete
Edit the test post, click the red "Delete article" button, confirm.
Refresh the public blog: the test post is gone. Only the real article remains.

TEST 7: Crawlers now see job content
Open any job on the site and copy its address from the browser bar.
In a new tab type:  view-source:  followed by that address, for example
view-source:https://ezworkers.com/job.html?id=abc123
Press Ctrl+F and search for the job title.
It must be found in the code. Before this fix it was not there at all.

TEST 8: Crawlers see the blog article
Do the same view-source check on your article page address.
Search for the article title. It must be found in the code.

If all 8 pass, the system is fully working.

---

## DAILY USE (how you will actually use it)

1. Go to https://ezworkers.com/admin/blog.html and sign in
2. Click "+ New article"
3. Write the title. The URL slug fills itself.
4. Write a 1 to 2 sentence excerpt (this shows on the blog cards)
5. Add tags separated by commas, for example: procurement, Saudi Arabia
6. Write the article in the editor. Use the toolbar for headings,
   bold, lists, and quotes.
7. Arabic is optional. Click "+ Add Arabic version" only if you want it.
8. Featured image is optional. Click Upload to add one from your computer.
9. Choose: Draft (keep working on it later), Publish now,
   or Schedule for later with a date and time.
10. Click "Preview" to see it styled before saving.
11. Click "Save article". Done. No deployment needed, ever.
    Posts appear on the live site the moment they are published.

---

## IF SOMETHING GOES WRONG

Problem: Blog page says "Articles loading soon" and never loads
Cause: Part 1 (SQL) was not run, or Part 5 deployed before Part 1
Fix: Run Part 1, then refresh the page.

Problem: Admin login says "Invalid login credentials"
Cause: The admin user was not created, or wrong password
Fix: Redo Part 2. If the user exists, use "..." next to the user
     in Supabase to send a password reset or set a new password.

Problem: Saving an article fails with a permissions error
Cause: You are signed in with a different email than admin@ezworkers.com
Fix: Sign out in the panel, sign back in with admin@ezworkers.com.
     Only that exact email can write to the blog.

Problem: Image upload fails
Cause: The storage rules were not created
Fix: Run Part 1 again (it is safe to re-run).
