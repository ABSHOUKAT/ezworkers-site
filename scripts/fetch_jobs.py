#!/usr/bin/env python3
"""
EzWorkers Job Fetch Agent
Runs via GitHub Actions every 6 hours.
Sources: Indeed RSS, Remotive API, Arbeitnow API, Adzuna API
No GCC filter for first 1-2 weeks — fetch everything.
"""

import os
import hashlib
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from supabase import create_client

# ── Credentials (set as GitHub Secrets) ────────────────────────────────────
SUPABASE_URL     = os.environ["SUPABASE_URL"]
SUPABASE_KEY     = os.environ["SUPABASE_SERVICE_KEY"]   # service role key (not anon)
ADZUNA_APP_ID    = os.environ["ADZUNA_APP_ID"]
ADZUNA_APP_KEY   = os.environ["ADZUNA_APP_KEY"]

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── GCC country keywords — used ONLY for tagging, not filtering ─────────────
GCC_COUNTRIES = {
    "saudi arabia": "Saudi Arabia", "ksa": "Saudi Arabia", "riyadh": "Saudi Arabia",
    "jeddah": "Saudi Arabia", "dammam": "Saudi Arabia", "neom": "Saudi Arabia",
    "uae": "UAE", "dubai": "UAE", "abu dhabi": "UAE", "sharjah": "UAE",
    "qatar": "Qatar", "doha": "Qatar",
    "kuwait": "Kuwait", "kuwait city": "Kuwait",
    "bahrain": "Bahrain", "manama": "Bahrain",
    "oman": "Oman", "muscat": "Oman",
}

SECTOR_KEYWORDS = {
    "procurement": "Procurement & Supply Chain",
    "supply chain": "Procurement & Supply Chain",
    "logistics": "Procurement & Supply Chain",
    "construction": "Construction & Infrastructure",
    "infrastructure": "Construction & Infrastructure",
    "civil": "Construction & Infrastructure",
    "engineering": "Engineering & Technical",
    "mechanical": "Engineering & Technical",
    "electrical": "Engineering & Technical",
    "oil": "Oil & Gas / Energy",
    "gas": "Oil & Gas / Energy",
    "energy": "Oil & Gas / Energy",
    "petroleum": "Oil & Gas / Energy",
    "finance": "Finance & Banking",
    "accounting": "Finance & Banking",
    "it": "IT & Technology",
    "software": "IT & Technology",
    "developer": "IT & Technology",
    "hr": "HR & Admin",
    "human resources": "HR & Admin",
    "admin": "HR & Admin",
    "health": "Healthcare",
    "medical": "Healthcare",
    "nurse": "Healthcare",
    "doctor": "Healthcare",
}

def url_hash(url: str) -> str:
    return hashlib.sha256(url.strip().encode()).hexdigest()[:32]

def detect_country(text: str) -> str:
    low = text.lower()
    for kw, country in GCC_COUNTRIES.items():
        if kw in low:
            return country
    return "Global"

def detect_sector(text: str) -> str:
    low = text.lower()
    for kw, sector in SECTOR_KEYWORDS.items():
        if kw in low:
            return sector
    return "General"

def clean(text: str, max_len: int = 5000) -> str:
    if not text:
        return ""
    return text.strip()[:max_len]

def upsert_jobs(jobs: list[dict]):
    if not jobs:
        return
    # Remove duplicates within this batch by url_hash
    seen = {}
    for j in jobs:
        if j.get("url_hash") and j["url_hash"] not in seen:
            seen[j["url_hash"]] = j
    unique = list(seen.values())

    try:
        result = sb.table("jobs").upsert(
            unique,
            on_conflict="url_hash",
            ignore_duplicates=True
        ).execute()
        print(f"  Upserted {len(unique)} jobs")
    except Exception as e:
        print(f"  Supabase upsert error: {e}")

# ── SOURCE 1: Indeed RSS ────────────────────────────────────────────────────
def fetch_indeed() -> list[dict]:
    print("Fetching Indeed RSS...")
    queries = [
        "procurement+jobs+middle+east",
        "construction+jobs+gulf",
        "engineering+jobs+saudi+arabia",
        "oil+gas+jobs+qatar",
        "jobs+UAE",
        "jobs+dubai",
        "management+jobs+GCC",
    ]
    jobs = []
    for q in queries:
        url = f"https://www.indeed.com/rss?q={q}&sort=date&limit=25"
        try:
            r = requests.get(url, timeout=15, headers={
                "User-Agent": "Mozilla/5.0 (compatible; EzWorkers/1.0)"
            })
            if r.status_code != 200:
                print(f"  Indeed {q}: HTTP {r.status_code}")
                continue
            root = ET.fromstring(r.content)
            for item in root.iter("item"):
                title       = item.findtext("title", "").strip()
                link        = item.findtext("link", "").strip()
                description = item.findtext("description", "").strip()
                pub_date    = item.findtext("pubDate", "")
                author      = item.findtext("author", "") or item.findtext("{http://purl.org/dc/elements/1.1/}creator", "")

                if not link:
                    continue

                combined = f"{title} {description}"
                jobs.append({
                    "title":       clean(title, 200),
                    "company":     clean(author, 200),
                    "location":    "",
                    "country":     detect_country(combined),
                    "sector":      detect_sector(combined),
                    "job_type":    "Full-time",
                    "salary":      "",
                    "description": clean(description, 3000),
                    "apply_url":   link,
                    "source":      "indeed_rss",
                    "url_hash":    url_hash(link),
                    "posted_at":   pub_date or datetime.now(timezone.utc).isoformat(),
                })
        except Exception as e:
            print(f"  Indeed {q} error: {e}")
    print(f"  Indeed: {len(jobs)} raw jobs")
    return jobs

# ── SOURCE 2: Remotive API ──────────────────────────────────────────────────
def fetch_remotive() -> list[dict]:
    print("Fetching Remotive...")
    categories = [
        "engineering", "management", "finance", "hr",
        "all-others", "business", "product"
    ]
    jobs = []
    for cat in categories:
        try:
            r = requests.get(
                f"https://remotive.com/api/remote-jobs?category={cat}&limit=50",
                timeout=15
            )
            if r.status_code != 200:
                continue
            for j in r.json().get("jobs", []):
                combined = f"{j.get('title','')} {j.get('description','')}"
                jobs.append({
                    "title":       clean(j.get("title",""), 200),
                    "company":     clean(j.get("company_name",""), 200),
                    "location":    clean(j.get("candidate_required_location",""), 200),
                    "country":     detect_country(combined),
                    "sector":      detect_sector(combined),
                    "job_type":    j.get("job_type","Remote"),
                    "salary":      clean(j.get("salary",""), 200),
                    "description": clean(j.get("description",""), 3000),
                    "apply_url":   j.get("url",""),
                    "source":      "remotive",
                    "url_hash":    url_hash(j.get("url","")),
                    "posted_at":   j.get("publication_date", datetime.now(timezone.utc).isoformat()),
                })
        except Exception as e:
            print(f"  Remotive {cat} error: {e}")
    print(f"  Remotive: {len(jobs)} raw jobs")
    return jobs

# ── SOURCE 3: Arbeitnow API ─────────────────────────────────────────────────
def fetch_arbeitnow() -> list[dict]:
    print("Fetching Arbeitnow...")
    jobs = []
    for page in range(1, 6):   # up to 5 pages = ~250 jobs
        try:
            r = requests.get(
                f"https://www.arbeitnow.com/api/job-board-api?page={page}",
                timeout=15
            )
            if r.status_code != 200:
                break
            data = r.json().get("data", [])
            if not data:
                break
            for j in data:
                combined = f"{j.get('title','')} {j.get('description','')} {j.get('location','')}"
                jobs.append({
                    "title":       clean(j.get("title",""), 200),
                    "company":     clean(j.get("company_name",""), 200),
                    "location":    clean(j.get("location",""), 200),
                    "country":     detect_country(combined),
                    "sector":      detect_sector(combined),
                    "job_type":    "Full-time" if not j.get("remote") else "Remote",
                    "salary":      "",
                    "description": clean(j.get("description",""), 3000),
                    "apply_url":   j.get("url",""),
                    "source":      "arbeitnow",
                    "url_hash":    url_hash(j.get("url",j.get("slug",""))),
                    "posted_at":   datetime.fromtimestamp(
                                     j.get("created_at", datetime.now(timezone.utc).timestamp()),
                                     tz=timezone.utc
                                   ).isoformat(),
                })
        except Exception as e:
            print(f"  Arbeitnow page {page} error: {e}")
            break
    print(f"  Arbeitnow: {len(jobs)} raw jobs")
    return jobs

# ── SOURCE 4: Adzuna API ────────────────────────────────────────────────────
def fetch_adzuna() -> list[dict]:
    print("Fetching Adzuna...")
    # Country codes Adzuna supports in GCC region + broader search
    searches = [
        ("gb", "procurement"),
        ("gb", "construction engineer"),
        ("gb", "oil gas"),
        ("us", "procurement supply chain"),
        ("us", "engineering construction"),
        ("au", "procurement"),
    ]
    jobs = []
    for country_code, keyword in searches:
        try:
            r = requests.get(
                f"https://api.adzuna.com/v1/api/jobs/{country_code}/search/1",
                params={
                    "app_id":    ADZUNA_APP_ID,
                    "app_key":   ADZUNA_APP_KEY,
                    "what":      keyword,
                    "results_per_page": 20,
                    "sort_by":   "date",
                },
                timeout=15
            )
            if r.status_code != 200:
                print(f"  Adzuna {country_code}/{keyword}: HTTP {r.status_code}")
                continue
            for j in r.json().get("results", []):
                location = j.get("location", {}).get("display_name", "")
                combined = f"{j.get('title','')} {j.get('description','')} {location}"
                jobs.append({
                    "title":       clean(j.get("title",""), 200),
                    "company":     clean(j.get("company",{}).get("display_name",""), 200),
                    "location":    clean(location, 200),
                    "country":     detect_country(combined),
                    "sector":      detect_sector(combined),
                    "job_type":    j.get("contract_type","Full-time") or "Full-time",
                    "salary":      f"{j.get('salary_min','')} - {j.get('salary_max','')}".strip(" -"),
                    "description": clean(j.get("description",""), 3000),
                    "apply_url":   j.get("redirect_url",""),
                    "source":      "adzuna",
                    "url_hash":    url_hash(j.get("redirect_url", j.get("id",""))),
                    "posted_at":   j.get("created", datetime.now(timezone.utc).isoformat()),
                })
        except Exception as e:
            print(f"  Adzuna {country_code}/{keyword} error: {e}")
    print(f"  Adzuna: {len(jobs)} raw jobs")
    return jobs

# ── Main ────────────────────────────────────────────────────────────────────
def main():
    print(f"\n=== EzWorkers Job Fetch Agent — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} ===\n")

    all_jobs = []
    all_jobs += fetch_indeed()
    all_jobs += fetch_remotive()
    all_jobs += fetch_arbeitnow()
    all_jobs += fetch_adzuna()

    print(f"\nTotal raw jobs fetched: {len(all_jobs)}")

    # Filter out jobs with no apply URL
    all_jobs = [j for j in all_jobs if j.get("apply_url")]
    print(f"After removing jobs with no apply URL: {len(all_jobs)}")

    # Push to Supabase in batches of 100
    batch_size = 100
    for i in range(0, len(all_jobs), batch_size):
        batch = all_jobs[i:i+batch_size]
        print(f"\nBatch {i//batch_size + 1}: pushing {len(batch)} jobs...")
        upsert_jobs(batch)

    print(f"\n=== Done ===\n")

if __name__ == "__main__":
    main()
