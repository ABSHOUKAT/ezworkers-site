#!/usr/bin/env python3
"""
EzWorkers Content Agent
Runs Monday and Thursday at 05:00 UTC (08:00 Riyadh time)
Fetches trending career topics → Claude writes EN + AR article → commits to articles.json
Site reads articles.json directly from GitHub raw — no redeployment needed.

STRICT GUARDRAILS (hardcoded — cannot be overridden):
- Only positive, informative, career-advice tone
- Never mention, criticise, or imply anything negative about any GCC government,
  ministry, authority, public entity, or official policy
- If a trending topic involves controversy, politics, or criticism of any institution,
  skip it entirely and pick the next topic
- Focus only on: career growth, job market trends, skills, hiring, salary,
  professional development, GCC economy opportunities
"""

import os
import json
import hashlib
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

# ── Credentials ─────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

# ── Output file (committed to repo, read by site at runtime) ─────────────────
ARTICLES_FILE = Path("content/articles.json")

# ── Safe topic sources (public RSS/APIs, no auth needed) ────────────────────
TREND_SOURCES = [
    # Google Trends RSS — jobs/career category
    "https://trends.google.com/trending/rss?geo=SA",
    "https://trends.google.com/trending/rss?geo=AE",
    "https://trends.google.com/trending/rss?geo=QA",
    # Reddit public JSON (no auth for public subreddits)
    "https://www.reddit.com/r/saudiarabia/top.json?limit=10&t=week",
    "https://www.reddit.com/r/dubai/top.json?limit=10&t=week",
    "https://www.reddit.com/r/expats/search.json?q=jobs+GCC&sort=top&t=week&limit=10",
    # Hacker News — jobs tag
    "https://hnrss.org/newest?q=jobs+hiring&count=10",
]

# ── Topics that are always safe and high-value for GCC job seekers ──────────
FALLBACK_TOPICS = [
    "Top skills Saudi Arabia employers are hiring for in 2026",
    "How to transfer your iqama in Saudi Arabia — complete guide",
    "Salary trends for procurement professionals in the GCC",
    "NEOM and Vision 2030 — career opportunities for engineers",
    "How to write a CV for the GCC job market",
    "Remote work opportunities for GCC-based professionals",
    "Construction boom in Saudi Arabia — jobs and skills in demand",
    "Oil and gas careers in Qatar and the GCC in 2026",
    "How to negotiate your salary in the Gulf region",
    "LinkedIn strategies for GCC job seekers",
    "Engineering roles in UAE mega-projects 2026",
    "Finance and banking careers in Saudi Arabia post-Vision 2030",
]

# ── Keywords that flag a topic as unsafe — skip immediately ─────────────────
UNSAFE_KEYWORDS = [
    "protest", "arrested", "ban", "banned", "lawsuit", "corruption",
    "human rights", "criticism", "criticize", "condemn", "scandal",
    "murder", "death penalty", "execution", "detain", "prison",
    "government crackdown", "opposition", "political", "sanction",
    "conflict", "war", "attack", "terrorism", "extremist",
    "controversy", "controversial", "backlash", "outrage",
]

def is_safe_topic(text: str) -> bool:
    low = text.lower()
    return not any(kw in low for kw in UNSAFE_KEYWORDS)

def is_career_relevant(text: str) -> bool:
    career_kw = [
        "job", "jobs", "career", "hire", "hiring", "salary", "work",
        "employment", "recruit", "skill", "professional", "engineer",
        "manager", "procurement", "construction", "energy", "finance",
        "vision 2030", "neom", "gcc", "saudi", "uae", "qatar",
        "expat", "iqama", "workforce", "talent", "industry",
    ]
    low = text.lower()
    return any(kw in low for kw in career_kw)

def fetch_trending_topics() -> list[str]:
    topics = []

    for url in TREND_SOURCES:
        try:
            headers = {"User-Agent": "EzWorkers/1.0 content-bot"}

            if "reddit.com" in url:
                r = requests.get(url, headers=headers, timeout=10)
                if r.status_code != 200:
                    continue
                data = r.json()
                posts = data.get("data", {}).get("children", [])
                for post in posts:
                    title = post.get("data", {}).get("title", "")
                    if title and is_safe_topic(title):
                        topics.append(title)

            elif "trends.google.com" in url:
                r = requests.get(url, headers=headers, timeout=10)
                if r.status_code != 200:
                    continue
                root = ET.fromstring(r.content)
                for item in root.iter("item"):
                    title = item.findtext("title", "")
                    if title and is_safe_topic(title):
                        topics.append(title)

            elif "hnrss.org" in url:
                r = requests.get(url, headers=headers, timeout=10)
                if r.status_code != 200:
                    continue
                root = ET.fromstring(r.content)
                for item in root.iter("item"):
                    title = item.findtext("title", "")
                    if title and is_safe_topic(title) and is_career_relevant(title):
                        topics.append(title)

        except Exception as e:
            print(f"  Trend source error ({url[:50]}): {e}")

    # Filter to career-relevant topics only
    career_topics = [t for t in topics if is_career_relevant(t)]
    print(f"  Found {len(career_topics)} safe career-relevant trending topics")

    # If not enough trending topics, use fallbacks
    if len(career_topics) < 2:
        print("  Using fallback topics")
        # Pick one that hasn't been published recently
        existing = load_existing_articles()
        existing_titles = [a.get("title_en", "").lower() for a in existing]
        for topic in FALLBACK_TOPICS:
            if not any(topic.lower()[:30] in t for t in existing_titles):
                career_topics.append(topic)
                if len(career_topics) >= 3:
                    break

    return career_topics[:5]  # max 5 candidates, we pick the best one

def pick_best_topic(topics: list[str]) -> str:
    """Pick the most GCC-relevant topic from the list."""
    gcc_kw = ["saudi", "uae", "qatar", "gcc", "gulf", "iqama", "neom",
               "vision 2030", "riyadh", "dubai", "doha"]
    for topic in topics:
        if any(kw in topic.lower() for kw in gcc_kw):
            return topic
    return topics[0] if topics else FALLBACK_TOPICS[0]

def load_existing_articles() -> list[dict]:
    if ARTICLES_FILE.exists():
        try:
            return json.loads(ARTICLES_FILE.read_text())
        except Exception:
            return []
    return []

def call_claude(prompt: str, max_tokens: int = 2000) -> str:
    r = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        json={
            "model": "claude-haiku-4-5",
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["content"][0]["text"].strip()

def write_article_en(topic: str) -> dict:
    prompt = f"""You are a senior career writer for EzWorkers, a GCC job board serving professionals in Saudi Arabia, UAE, Qatar, Kuwait, Bahrain and Oman.

Write a helpful, informative career article on this topic:
"{topic}"

STRICT RULES — follow all of these without exception:
- Tone must be positive, professional, and helpful to job seekers and employers
- Never criticise, mention negatively, or imply anything negative about any GCC government, ministry, authority, royal family, public entity, or official policy
- Never discuss politics, human rights, legal cases, controversies, or sensitive social topics
- Focus ONLY on: career opportunities, skills, salary, job market, professional development, hiring trends
- Write for GCC professionals — expats and nationals alike
- Length: 500-700 words
- Use clear headings and practical advice

Return ONLY valid JSON with these exact fields, no markdown, no backticks, start with {{:
{{
  "title": "article title (max 80 chars)",
  "excerpt": "2-sentence summary for preview cards (max 160 chars)",
  "body": "full article HTML using only <h2>, <p>, <ul>, <li> tags",
  "tags": ["tag1", "tag2", "tag3"],
  "reading_time": 4
}}"""

    raw = call_claude(prompt, max_tokens=2000)
    # Strip any accidental markdown
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip().rstrip("`").strip()
    return json.loads(raw)

def translate_article_ar(article_en: dict) -> dict:
    prompt = f"""Translate this career article from English to Arabic (Modern Standard Arabic / الفصحى).

The translation is for GCC professionals in Saudi Arabia, UAE, Qatar, and the Gulf region.

STRICT RULES:
- Maintain the same positive, professional tone
- Never add any criticism of governments, authorities, or institutions
- Keep all HTML tags exactly as they are (<h2>, <p>, <ul>, <li>)
- Translate only the text content, not the HTML tags
- The Arabic should read naturally, not like a word-for-word translation

English title: {article_en['title']}
English excerpt: {article_en['excerpt']}
English body:
{article_en['body']}

Return ONLY valid JSON, no markdown, no backticks, start with {{:
{{
  "title_ar": "Arabic title",
  "excerpt_ar": "Arabic 2-sentence summary",
  "body_ar": "Full Arabic article with same HTML structure"
}}"""

    raw = call_claude(prompt, max_tokens=2500)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip().rstrip("`").strip()
    return json.loads(raw)

def generate_slug(title: str) -> str:
    slug = title.lower()
    for ch in " ,.'\"!?:;/\\()[]{}":
        slug = slug.replace(ch, "-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")[:60]

def main():
    print(f"\n=== EzWorkers Content Agent — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} ===\n")

    # Ensure content directory exists
    ARTICLES_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Step 1: Fetch trending topics
    print("Fetching trending topics...")
    topics = fetch_trending_topics()
    print(f"Topics found: {topics}")

    topic = pick_best_topic(topics)
    print(f"\nSelected topic: {topic}")

    # Safety check
    if not is_safe_topic(topic):
        print("Topic failed safety check. Switching to fallback.")
        topic = FALLBACK_TOPICS[0]

    # Step 2: Write English article
    print("\nWriting English article with Claude...")
    try:
        article_en = write_article_en(topic)
        print(f"  Title: {article_en['title']}")
    except Exception as e:
        print(f"  English article failed: {e}")
        return

    # Step 3: Translate to Arabic
    print("Translating to Arabic...")
    try:
        article_ar = translate_article_ar(article_en)
        print(f"  Arabic title: {article_ar['title_ar']}")
    except Exception as e:
        print(f"  Arabic translation failed: {e}")
        article_ar = {"title_ar": article_en["title"], "excerpt_ar": article_en["excerpt"], "body_ar": article_en["body"]}

    # Step 4: Build article record
    now = datetime.now(timezone.utc).isoformat()
    article = {
        "id":          hashlib.sha256(article_en["title"].encode()).hexdigest()[:12],
        "slug":        generate_slug(article_en["title"]),
        "title":       article_en["title"],
        "title_ar":    article_ar["title_ar"],
        "excerpt":     article_en["excerpt"],
        "excerpt_ar":  article_ar["excerpt_ar"],
        "body":        article_en["body"],
        "body_ar":     article_ar["body_ar"],
        "tags":        article_en.get("tags", []),
        "reading_time": article_en.get("reading_time", 4),
        "published_at": now,
        "source_topic": topic,
    }

    # Step 5: Load existing, prepend new article, save (keep last 50)
    existing = load_existing_articles()
    existing.insert(0, article)
    existing = existing[:50]

    ARTICLES_FILE.write_text(json.dumps(existing, ensure_ascii=False, indent=2))
    print(f"\n  Saved to {ARTICLES_FILE} ({len(existing)} total articles)")
    print(f"\n=== Done ===\n")

if __name__ == "__main__":
    main()
