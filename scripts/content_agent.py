#!/usr/bin/env python3
"""
EzWorkers Content Agent
Runs Monday and Thursday at 05:00 UTC (08:00 Riyadh time)
Fetches trending career topics -> Claude writes EN + AR article -> commits to articles.json
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

# Credentials
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

# Output file
ARTICLES_FILE = Path("content/articles.json")

# Safe topic sources
TREND_SOURCES = [
    "https://trends.google.com/trending/rss?geo=SA",
    "https://trends.google.com/trending/rss?geo=AE",
    "https://trends.google.com/trending/rss?geo=QA",
    "https://www.reddit.com/r/saudiarabia/top.json?limit=10&t=week",
    "https://www.reddit.com/r/dubai/top.json?limit=10&t=week",
    "https://www.reddit.com/r/expats/search.json?q=jobs+GCC&sort=top&t=week&limit=10",
    "https://hnrss.org/newest?q=jobs+hiring&count=10",
]

# High-value fallback topics — used when trending topics are not career-relevant
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
    "How to find procurement jobs in Saudi Arabia as an expat",
    "Top companies hiring in Dubai in 2026",
    "Career guide for materials engineers in the GCC",
]

# Keywords that immediately disqualify a topic
UNSAFE_KEYWORDS = [
    "protest", "arrested", "ban", "banned", "lawsuit", "corruption",
    "human rights", "criticism", "criticize", "condemn", "scandal",
    "murder", "death penalty", "execution", "detain", "prison",
    "government crackdown", "opposition", "political", "sanction",
    "conflict", "war", "attack", "terrorism", "extremist",
    "controversy", "controversial", "backlash", "outrage",
    "petrol price", "fuel price", "oil price", "gas price",
    "stock market", "crypto", "bitcoin", "inflation", "interest rate",
]

# A topic MUST contain at least one of these to be considered career-relevant
CAREER_REQUIRED_KEYWORDS = [
    "job", "jobs", "career", "hire", "hiring", "salary", "employment",
    "recruit", "skill", "skills", "professional", "engineer", "manager",
    "procurement", "construction", "workforce", "talent", "vacancy",
    "iqama", "expat", "work permit", "cv", "resume", "interview",
    "promotion", "industry", "sector", "company hiring", "jobs in",
    "careers in", "working in", "employed", "employer",
]

def is_safe_topic(text: str) -> bool:
    low = text.lower()
    return not any(kw in low for kw in UNSAFE_KEYWORDS)

def is_career_relevant(text: str) -> bool:
    low = text.lower()
    return any(kw in low for kw in CAREER_REQUIRED_KEYWORDS)

def clean_json_response(raw: str) -> str:
    raw = raw.strip()
    # Remove markdown code fences
    if raw.startswith("```"):
        parts = raw.split("```")
        for part in parts:
            p = part.strip()
            if p.startswith("json"):
                p = p[4:].strip()
            if p.startswith("{"):
                raw = p
                break
    raw = raw.strip().rstrip("`").strip()
    # Find the first { and last } to extract just the JSON object
    start = raw.find("{")
    end   = raw.rfind("}")
    if start != -1 and end != -1:
        raw = raw[start:end+1]
    return raw

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
                    # Reddit: must pass safety AND career check
                    if title and is_safe_topic(title) and is_career_relevant(title):
                        topics.append(title)

            elif "trends.google.com" in url:
                r = requests.get(url, headers=headers, timeout=10)
                if r.status_code != 200:
                    continue
                root = ET.fromstring(r.content)
                for item in root.iter("item"):
                    title = item.findtext("title", "")
                    # Google Trends: must pass safety AND career check
                    if title and is_safe_topic(title) and is_career_relevant(title):
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

    print(f"  Found {len(topics)} safe career-relevant trending topics")

    # Always supplement with fallbacks to ensure we have enough candidates
    existing       = load_existing_articles()
    used_topics    = [a.get("source_topic", "").lower() for a in existing]
    used_titles    = [a.get("title", "").lower()[:40] for a in existing]

    for fallback in FALLBACK_TOPICS:
        already_used = any(
            fallback.lower()[:30] in t for t in used_topics + used_titles
        )
        if not already_used:
            topics.append(fallback)
        if len(topics) >= 8:
            break

    return topics[:8]

def pick_best_topic(topics: list[str]) -> str:
    """
    Priority:
    1. Genuine trending topic that is career-relevant and GCC-specific
    2. Trending topic that is career-relevant (any region)
    3. Fallback topic not recently published
    """
    gcc_kw = ["saudi", "uae", "qatar", "gcc", "gulf", "iqama", "neom",
               "vision 2030", "riyadh", "dubai", "doha", "ksa"]

    # First pass: trending + GCC-specific
    for topic in topics:
        if is_career_relevant(topic) and any(kw in topic.lower() for kw in gcc_kw):
            return topic

    # Second pass: any career-relevant trending topic
    for topic in topics:
        if is_career_relevant(topic):
            return topic

    # Final fallback
    return FALLBACK_TOPICS[0]

def load_existing_articles() -> list[dict]:
    if ARTICLES_FILE.exists():
        try:
            return json.loads(ARTICLES_FILE.read_text(encoding="utf-8"))
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
    prompt = f"""You are a senior career writer for EzWorkers, a GCC job board.

Write a helpful career article on: "{topic}"

RULES:
- Positive, professional tone only
- Never criticise any GCC government, authority, or institution
- Focus on career opportunities, skills, salary, hiring trends
- 500-600 words, use clear headings

CRITICAL JSON RULES:
- Return ONLY a raw JSON object
- Start your response with {{ and end with }}
- No markdown, no backticks, no explanation before or after
- In the body field: use only these HTML tags: <h2> <p> <ul> <li>
- Do NOT use any apostrophes or single quotes inside JSON string values — use the HTML entity &apos; instead
- Do NOT use double quotes inside JSON string values — use &quot; instead
- Every JSON string must be on a single line with no line breaks inside the value

JSON format:
{{"title": "article title max 70 chars", "excerpt": "one sentence summary max 140 chars", "body": "<h2>Heading</h2><p>Content here.</p>", "tags": ["tag1", "tag2", "tag3"], "reading_time": 4}}"""

    raw = call_claude(prompt, max_tokens=2000)
    raw = clean_json_response(raw)
    return json.loads(raw)

def translate_article_ar(article_en: dict) -> dict:
    # Send only title and excerpt for translation — body is too long and causes JSON parse failures
    prompt = f"""Translate these two texts from English to Arabic (Modern Standard Arabic).

CRITICAL JSON RULES:
- Return ONLY a raw JSON object
- Start with {{ and end with }}
- No markdown, no backticks, no explanation
- Do NOT use apostrophes or single quotes inside JSON values
- Do NOT use double quotes inside JSON string values
- Keep each value on a single line

English title: {article_en['title']}
English excerpt: {article_en['excerpt']}

JSON format:
{{"title_ar": "Arabic title here", "excerpt_ar": "Arabic excerpt here"}}"""

    raw = call_claude(prompt, max_tokens=500)
    raw = clean_json_response(raw)
    result = json.loads(raw)

    # Translate body separately with a simpler prompt
    body_prompt = f"""Translate this HTML article body from English to Arabic. Keep all HTML tags unchanged. Return ONLY the translated HTML, nothing else, no JSON wrapper.

{article_en['body']}"""

    try:
        body_ar = call_claude(body_prompt, max_tokens=2000)
        # Remove any accidental markdown
        if body_ar.startswith("```"):
            body_ar = body_ar.split("```")[1]
            if body_ar.startswith("html"):
                body_ar = body_ar[4:]
        body_ar = body_ar.strip().rstrip("`").strip()
        result["body_ar"] = body_ar
    except Exception as e:
        print(f"  Body translation failed: {e} — using English body")
        result["body_ar"] = article_en["body"]

    return result

def generate_slug(title: str) -> str:
    slug = title.lower()
    for ch in " ,.'\"!?:;/\\()[]{}—":
        slug = slug.replace(ch, "-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")[:60]

def main():
    print(f"\n=== EzWorkers Content Agent — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} ===\n")

    ARTICLES_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Step 1: Fetch and select topic
    print("Fetching trending topics...")
    topics = fetch_trending_topics()
    print(f"Topic pool: {topics}")

    topic = pick_best_topic(topics)
    print(f"\nSelected topic: {topic}")

    if not is_safe_topic(topic):
        print("Topic failed safety check — using fallback")
        topic = FALLBACK_TOPICS[0]

    # Step 2: Write English article
    print("\nWriting English article...")
    try:
        article_en = write_article_en(topic)
        print(f"  Title: {article_en['title']}")
    except Exception as e:
        print(f"  English article failed: {e}")
        return

    # Step 3: Translate to Arabic (graceful fallback on failure)
    print("Translating to Arabic...")
    try:
        article_ar = translate_article_ar(article_en)
        print(f"  Arabic title: {article_ar.get('title_ar', 'N/A')}")
    except Exception as e:
        print(f"  Arabic translation failed: {e} — using English as fallback")
        article_ar = {
            "title_ar":   article_en["title"],
            "excerpt_ar": article_en["excerpt"],
            "body_ar":    article_en["body"],
        }

    # Step 4: Build article record
    now = datetime.now(timezone.utc).isoformat()
    article = {
        "id":           hashlib.sha256(article_en["title"].encode()).hexdigest()[:12],
        "slug":         generate_slug(article_en["title"]),
        "title":        article_en["title"],
        "title_ar":     article_ar.get("title_ar", article_en["title"]),
        "excerpt":      article_en["excerpt"],
        "excerpt_ar":   article_ar.get("excerpt_ar", article_en["excerpt"]),
        "body":         article_en["body"],
        "body_ar":      article_ar.get("body_ar", article_en["body"]),
        "tags":         article_en.get("tags", []),
        "reading_time": article_en.get("reading_time", 4),
        "published_at": now,
        "source_topic": topic,
    }

    # Step 5: Save — prepend to existing, keep last 50
    existing = load_existing_articles()
    existing.insert(0, article)
    existing = existing[:50]

    ARTICLES_FILE.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    print(f"\n  Saved to {ARTICLES_FILE} ({len(existing)} total articles)")
    print(f"\n=== Done ===\n")

if __name__ == "__main__":
    main()
