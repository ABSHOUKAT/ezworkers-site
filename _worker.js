/**
 * EzWorkers _worker.js  (Cloudflare Pages Advanced Mode)
 * Server-side renders the JS-only pages so Google, ChatGPT, Perplexity
 * and every other crawler receive real content in the raw HTML.
 *
 * Handles:
 *   /job.html?id=X        full job SSR: title, meta, OG, JobPosting JSON-LD, visible content
 *   /article.html?id=X    full article SSR: title, meta, OG, Article JSON-LD, visible body
 *   /blog.html            static article cards + ItemList JSON-LD
 *   / (homepage)          latest job links injected into the list container
 *   /jobs/*.html          filtered job links injected per landing page
 *
 * Every handler falls back to the untouched static file on ANY error,
 * so a Supabase outage can never break the site.
 *
 * Deploys automatically: just include this file at the ROOT of the
 * Cloudflare Pages drag-and-drop upload. No separate Worker needed.
 */

const SB  = 'https://wxltwnyuhiejavzichfd.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHR3bnl1aGllamF2emljaGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjk4NDYsImV4cCI6MjA5NzgwNTg0Nn0.8PH3VTz2u6rRcu-LqZYGMDbNIdj9YldNBQJ1irTCtI4';
const SITE = 'https://ezworkers.com';

// Landing page path -> Supabase filter column and value
const LIST_FILTERS = {
  '/jobs/saudi-arabia': ['country', 'Saudi Arabia'],
  '/jobs/uae':          ['country', 'UAE'],
  '/jobs/qatar':        ['country', 'Qatar'],
  '/jobs/kuwait':       ['country', 'Kuwait'],
  '/jobs/bahrain':      ['country', 'Bahrain'],
  '/jobs/oman':         ['country', 'Oman'],
  '/jobs/global':       ['country', 'Global'],
  '/jobs/remote':       ['job_type', 'Remote'],
  '/jobs/procurement':  ['sector', 'Procurement & Supply Chain'],
  '/jobs/construction': ['sector', 'Construction & Infrastructure'],
  '/jobs/engineering':  ['sector', 'Engineering & Technical'],
  '/jobs/oil-gas':      ['sector', 'Oil & Gas / Energy'],
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname.replace(/\.html$/, '').replace(/\/$/, '');
    if (path === '') path = '/';

    try {
      if (path === '/job')     return await ssrJob(request, env, url);
      if (path === '/article') return await ssrArticle(request, env, url);
      if (path === '/blog')    return await ssrBlog(request, env);
      if (path === '/' || path === '/index') return await ssrIndex(request, env);
      if (LIST_FILTERS[path])  return await ssrJobList(request, env, path);
    } catch (e) {
      // Any failure: serve the untouched static page
    }
    return env.ASSETS.fetch(request);
  }
};

// ── helpers ──────────────────────────────────────────────────────────

async function sbGet(pathAndQuery) {
  const r = await fetch(SB + pathAndQuery, {
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY },
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (!r.ok) return null;
  return r.json();
}

async function getStatic(request, env) {
  const r = await env.ASSETS.fetch(request);
  return { html: await r.text(), status: r.status, headers: r.headers };
}

function htmlResponse(html) {
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Light sanitizer for description HTML coming from the database
function saneHtml(s) {
  return String(s == null ? '' : s)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function stripTags(s, max) {
  const t = String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return max ? t.substring(0, max) : t;
}

function ldScript(obj) {
  const json = JSON.stringify(obj).replace(/</g, '\\u003c');
  return '<script id="ssr-ld" type="application/ld+json">' + json + '</script>';
}

function metaBlock(title, desc, canonical, ogType) {
  return '<title>' + esc(title) + '</title>\n' +
    '<meta name="description" content="' + esc(desc) + '">\n' +
    '<link rel="canonical" href="' + esc(canonical) + '">\n' +
    '<meta property="og:type" content="' + (ogType || 'website') + '">\n' +
    '<meta property="og:site_name" content="EzWorkers">\n' +
    '<meta property="og:title" content="' + esc(title) + '">\n' +
    '<meta property="og:description" content="' + esc(desc) + '">\n' +
    '<meta property="og:url" content="' + esc(canonical) + '">\n' +
    '<meta property="og:image" content="' + SITE + '/og-image.png">\n' +
    '<meta name="twitter:card" content="summary_large_image">';
}

// Replace the page's original <title>...</title> with a full SSR meta block
function swapTitle(html, block) {
  return html.replace(/<title>[\s\S]*?<\/title>/, block);
}

// ── /job.html?id= ────────────────────────────────────────────────────

async function ssrJob(request, env, url) {
  const id = url.searchParams.get('id');
  if (!id) return env.ASSETS.fetch(request);

  const rows = await sbGet('/rest/v1/jobs?id=eq.' + encodeURIComponent(id) + '&limit=1');
  const job = rows && rows[0];
  if (!job) return env.ASSETS.fetch(request);

  const page = await getStatic(request, env);
  let html = page.html;

  const title = job.title + (job.company ? ' at ' + job.company : '') +
                (job.country ? ' \u2014 ' + job.country : '') + ' | EzWorkers';
  const desc = stripTags(job.description, 155) ||
               (job.title + ' vacancy' + (job.country ? ' in ' + job.country : '') + ' on EzWorkers.');
  const canonical = SITE + '/job.html?id=' + encodeURIComponent(job.id);

  const ld = {
    '@context': 'https://schema.org', '@type': 'JobPosting',
    title: job.title || '',
    description: saneHtml(job.description) || '<p>' + esc(job.title || 'Job') + '</p>',
    datePosted: job.posted_at || new Date().toISOString(),
    dateModified: job.posted_at || new Date().toISOString(),
    validThrough: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    employmentType: String(job.job_type || 'FULL_TIME').toUpperCase().replace(/-/g, '_').replace(/ /g, '_'),
    hiringOrganization: { '@type': 'Organization', name: job.company || 'Employer' },
    identifier: { '@type': 'PropertyValue', name: 'EzWorkers', value: job.id },
    url: canonical
  };
  if (job.country && job.country !== 'Global') {
    ld.jobLocation = { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: job.country, addressLocality: job.location || '' } };
  } else {
    ld.jobLocationType = 'TELECOMMUTE';
  }
  if (job.salary) {
    const n = parseFloat(String(job.salary).replace(/[^0-9.]/g, ''));
    if (!isNaN(n)) {
      const cur = job.country === 'UAE' ? 'AED' : job.country === 'Qatar' ? 'QAR' :
                  job.country === 'Kuwait' ? 'KWD' : job.country === 'Bahrain' ? 'BHD' :
                  job.country === 'Oman' ? 'OMR' : 'SAR';
      ld.baseSalary = { '@type': 'MonetaryAmount', currency: cur, value: { '@type': 'QuantitativeValue', value: n, unitText: 'MONTH' } };
    }
  }

  html = swapTitle(html, metaBlock(title, desc, canonical, 'article') + '\n' + ldScript(ld));

  const isEmail = job.apply_url && job.apply_url.includes('@') && !String(job.apply_url).startsWith('http');
  const applyHref = !job.apply_url ? '' : (isEmail ? 'mailto:' + job.apply_url : job.apply_url);
  const body =
    '<div class="wrap" style="max-width:900px;margin:0 auto;padding:2rem 1.25rem">' +
    '<h1 style="font-size:26px;margin-bottom:.5rem">' + esc(job.title) + '</h1>' +
    '<p style="color:#64748b;margin-bottom:1rem">' +
      esc(job.company || '') +
      (job.location ? ' \u00b7 ' + esc(job.location) : '') +
      (job.country ? ' \u00b7 ' + esc(job.country) : '') +
      (job.sector ? ' \u00b7 ' + esc(job.sector) : '') +
      (job.job_type ? ' \u00b7 ' + esc(job.job_type) : '') +
    '</p>' +
    (job.salary ? '<p style="font-weight:600;margin-bottom:1rem">Salary: ' + esc(job.salary) + '</p>' : '') +
    '<div style="line-height:1.8;color:#374151">' + saneHtml(job.description) + '</div>' +
    (applyHref ? '<p style="margin-top:1.5rem"><a href="' + esc(applyHref) + '" rel="nofollow noopener">Apply for this job</a></p>' : '') +
    '<p style="margin-top:1rem"><a href="' + SITE + '/">Browse more GCC jobs on EzWorkers</a></p>' +
    '</div>';

  html = html.replace(
    '<div id="job-content"><div class="wrap"><div class="spin"></div></div></div>',
    '<div id="job-content">' + body + '</div>'
  );

  return htmlResponse(html);
}

// ── /article.html?id= ────────────────────────────────────────────────

async function ssrArticle(request, env, url) {
  const id = url.searchParams.get('id');
  if (!id) return env.ASSETS.fetch(request);

  const safe = encodeURIComponent(id);
  const rows = await sbGet('/rest/v1/blog_articles?or=(id.eq.' + safe + ',slug.eq.' + safe + ')&limit=1');
  const a = rows && rows[0];
  if (!a) return env.ASSETS.fetch(request);

  const page = await getStatic(request, env);
  let html = page.html;

  const title = a.title + ' | EzWorkers Career Insights';
  const desc = a.excerpt || stripTags(a.body, 155);
  const canonical = SITE + '/article.html?id=' + encodeURIComponent(a.slug || a.id);
  const pubDate = a.publish_at || a.published_at || a.created_at;

  const ld = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: a.title || '',
    description: desc,
    datePublished: pubDate,
    dateModified: pubDate,
    author: { '@type': 'Organization', name: 'EzWorkers', url: SITE },
    publisher: { '@type': 'Organization', name: 'EzWorkers', logo: { '@type': 'ImageObject', url: SITE + '/logo.png' } },
    mainEntityOfPage: canonical
  };
  if (a.featured_image_url) ld.image = a.featured_image_url;

  html = swapTitle(html, metaBlock(title, desc, canonical, 'article') + '\n' + ldScript(ld));

  const dateStr = pubDate ? new Date(pubDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const body =
    '<div style="max-width:760px;margin:0 auto;padding:2.5rem 1.25rem">' +
    '<h1 style="font-size:28px;margin-bottom:.5rem">' + esc(a.title) + '</h1>' +
    '<p style="color:#64748b;margin-bottom:1.5rem">' + esc(dateStr) +
      (a.reading_time ? ' \u00b7 ' + a.reading_time + ' min read' : '') + '</p>' +
    (a.featured_image_url ? '<img src="' + esc(a.featured_image_url) + '" alt="' + esc(a.title) + '" style="width:100%;border-radius:12px;margin-bottom:1.5rem">' : '') +
    '<div style="line-height:1.85;color:#374151">' + saneHtml(a.body) + '</div>' +
    '<p style="margin-top:2rem"><a href="' + SITE + '/blog.html">More GCC career insights on EzWorkers</a></p>' +
    '</div>';

  html = html.replace(/<div id="article-content">[\s\S]*?<\/div>\s*(?=<div id="footer-placeholder">|<footer|<script)/,
    '<div id="article-content">' + body + '</div>\n');
  // Fallback anchor if the regex above did not match (structure variations)
  if (html.indexOf(esc(a.title)) === -1) {
    html = html.replace('<div id="article-content">', '<div id="article-content">' + body);
  }

  return htmlResponse(html);
}

// ── /blog.html ───────────────────────────────────────────────────────

async function ssrBlog(request, env) {
  const rows = await sbGet('/rest/v1/blog_articles?select=id,slug,title,excerpt,tags,reading_time,publish_at&order=publish_at.desc&limit=24');
  if (!rows || !rows.length) return env.ASSETS.fetch(request);

  const page = await getStatic(request, env);
  let html = page.html;

  const cards = rows.map(function (a) {
    const d = a.publish_at ? new Date(a.publish_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return '<a class="article-card" href="article.html?id=' + esc(a.slug || a.id) + '" style="display:block;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1.4rem;text-decoration:none;color:inherit">' +
      '<h2 style="font-size:17px;font-weight:700;margin-bottom:.5rem;color:#0f172a">' + esc(a.title) + '</h2>' +
      '<p style="font-size:13px;color:#64748b;line-height:1.6;margin-bottom:.75rem">' + esc(a.excerpt || '') + '</p>' +
      '<p style="font-size:12px;color:#94a3b8">' + esc(d) + (a.reading_time ? ' \u00b7 ' + a.reading_time + ' min read' : '') + '</p>' +
      '</a>';
  }).join('');

  const ld = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: rows.map(function (a, i) {
      return { '@type': 'ListItem', position: i + 1, url: SITE + '/article.html?id=' + (a.slug || a.id), name: a.title };
    })
  };

  html = html.replace(/(<div class="articles-grid" id="articles-grid">)[\s\S]*?(<\/div>\s*<\/div>)/,
    '$1' + cards + '$2');
  html = html.replace('</head>', ldScript(ld) + '\n</head>');

  return htmlResponse(html);
}

// ── homepage ─────────────────────────────────────────────────────────

async function ssrIndex(request, env) {
  const rows = await sbGet('/rest/v1/jobs?is_active=eq.true&select=id,title,company,country&order=posted_at.desc&limit=30');
  if (!rows || !rows.length) return env.ASSETS.fetch(request);

  const page = await getStatic(request, env);
  let html = page.html;

  const links = '<ul style="list-style:none;padding:1rem 0">' + rows.map(function (j) {
    return '<li style="padding:.45rem 0;border-bottom:1px solid #f1f5f9">' +
      '<a href="job.html?id=' + esc(j.id) + '" style="color:#1A6FC4;text-decoration:none;font-weight:500">' + esc(j.title) + '</a>' +
      '<span style="color:#64748b;font-size:13px"> \u2014 ' + esc(j.company || '') + (j.country ? ', ' + esc(j.country) : '') + '</span></li>';
  }).join('') + '</ul>';

  html = html.replace(/(<div id="jobs-list">)([\s\S]*?)(<\/div>)/, '$1' + links + '$3');
  return htmlResponse(html);
}

// ── /jobs/* landing pages ────────────────────────────────────────────

async function ssrJobList(request, env, path) {
  const f = LIST_FILTERS[path];
  const rows = await sbGet('/rest/v1/jobs?is_active=eq.true&' + f[0] + '=eq.' + encodeURIComponent(f[1]) +
    '&select=id,title,company,location,country&order=posted_at.desc&limit=40');
  if (!rows || !rows.length) return env.ASSETS.fetch(request);

  const page = await getStatic(request, env);
  let html = page.html;

  const links = '<ul style="list-style:none;padding:0">' + rows.map(function (j) {
    return '<li style="padding:.55rem 0;border-bottom:1px solid #f1f5f9">' +
      '<a href="../job.html?id=' + esc(j.id) + '" style="color:#1A6FC4;text-decoration:none;font-weight:500">' + esc(j.title) + '</a>' +
      '<span style="color:#64748b;font-size:13px"> \u2014 ' + esc(j.company || '') + (j.location ? ', ' + esc(j.location) : (j.country ? ', ' + esc(j.country) : '')) + '</span></li>';
  }).join('') + '</ul>';

  html = html.replace('<div id="list"><div class="spin"></div></div>', '<div id="list">' + links + '</div>');
  return htmlResponse(html);
}
