/**
 * EzWorkers _worker.js (Cloudflare Pages Advanced Mode)
 * Server-side renders JS-only pages so crawlers get real content.
 * Falls back to untouched static files on any error.
 */

const SB  = 'https://wxltwnyuhiejavzichfd.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHR3bnl1aGllamF2emljaGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjk4NDYsImV4cCI6MjA5NzgwNTg0Nn0.8PH3VTz2u6rRcu-LqZYGMDbNIdj9YldNBQJ1irTCtI4';
const SITE = 'https://ezworkers.com';

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
    const wantsHtml = url.pathname.endsWith('.html') || path === '/';

    try {
      if (path === '/job')     return await ssrJob(env, url);
      if (path === '/article') return await ssrArticle(env, url);
      if (path === '/blog')    return await ssrBlog(env);
      if (path === '/' || path === '/index') return await ssrIndex(env);
      if (LIST_FILTERS[path])  return await ssrJobList(env, path);
    } catch (e) {
      // SSR failed (missing id, row not found, table not created yet, etc.)
      // Fall through and serve the real static page content below.
    }

    // Every other .html page (about, login, dashboard, salary-guide,
    // resources/*, etc.) and the homepage fallback: resolve to the real
    // file content directly. Cloudflare Pages Pretty URLs returns a 308
    // with an EMPTY body for the .html form, which is fine for a real
    // browser (it auto-follows) but breaks any tool that reads raw HTML
    // without following redirects, so we resolve it here instead.
    if (wantsHtml) {
      try {
        const html = await getPage(path, env);
        if (html && html.length > 50) {
          return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
        }
      } catch (e) {
        // fall through to the untouched passthrough below
      }
    }

    // Non-HTML assets (css, js, images, robots.txt, sitemap.xml, llms.txt,
    // fonts, etc.) and any getPage failure: pass the original request
    // through completely untouched.
    return env.ASSETS.fetch(request);
  }
};

// ── helpers ──────────────────────────────────────────────────────────

async function sbGet(pathAndQuery) {
  const r = await fetch(SB + pathAndQuery, {
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  });
  if (!r.ok) return null;
  return r.json();
}

async function getPage(pagePath, env) {
  // Cloudflare Pages Pretty URLs: requesting the .html path returns a 308
  // redirect with an EMPTY body. The extensionless path returns the real
  // file content directly (200). Confirmed against production directly,
  // so we always request the extensionless form here.
  const clean = pagePath.replace(/\.html$/, '') || '/';
  let r = await env.ASSETS.fetch(new Request(SITE + clean));
  // Safety net: if we still got a redirect for any reason, follow it once.
  if (r.status >= 300 && r.status < 400) {
    const loc = r.headers.get('location');
    if (loc) r = await env.ASSETS.fetch(new Request(loc.startsWith('http') ? loc : SITE + loc));
  }
  return await r.text();
}

function ok(html) {
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function saneHtml(s) {
  return String(s == null ? '' : s)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
}

function stripTags(s, max) {
  const t = String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return max ? t.substring(0, max) : t;
}

function ldScript(obj) {
  return '<script id="ssr-ld" type="application/ld+json">' +
    JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';
}

function metaBlock(title, desc, canonical) {
  return '<title>' + esc(title) + '</title>\n' +
    '<meta name="description" content="' + esc(desc) + '">\n' +
    '<link rel="canonical" href="' + esc(canonical) + '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:site_name" content="EzWorkers">\n' +
    '<meta property="og:title" content="' + esc(title) + '">\n' +
    '<meta property="og:description" content="' + esc(desc) + '">\n' +
    '<meta property="og:url" content="' + esc(canonical) + '">\n' +
    '<meta property="og:image" content="' + SITE + '/og-image.png">\n' +
    '<meta name="twitter:card" content="summary_large_image">';
}

// ── /job.html?id= ────────────────────────────────────────────────────

async function ssrJob(env, url) {
  const id = url.searchParams.get('id');
  if (!id) throw 'no id';

  const rows = await sbGet('/rest/v1/jobs?id=eq.' + encodeURIComponent(id) + '&limit=1');
  const job = rows && rows[0];
  if (!job) throw 'not found';

  let html = await getPage('/job', env);
  if (!html || html.length < 100) throw 'empty static';

  const title = job.title + (job.company ? ' at ' + job.company : '') +
                (job.country ? ' - ' + job.country : '') + ' | EzWorkers';
  const desc = stripTags(job.description, 155) ||
               (job.title + ' vacancy' + (job.country ? ' in ' + job.country : '') + ' on EzWorkers.');
  const canonical = SITE + '/job?id=' + encodeURIComponent(job.id);

  const ld = {
    '@context': 'https://schema.org', '@type': 'JobPosting',
    title: job.title || '',
    description: saneHtml(job.description) || esc(job.title),
    datePosted: job.posted_at || new Date().toISOString(),
    dateModified: job.posted_at || new Date().toISOString(),
    validThrough: new Date(Date.now() + 60*24*60*60*1000).toISOString(),
    employmentType: String(job.job_type || 'FULL_TIME').toUpperCase().replace(/-/g,'_').replace(/ /g,'_'),
    hiringOrganization: { '@type': 'Organization', name: job.company || 'Employer' },
    identifier: { '@type': 'PropertyValue', name: 'EzWorkers', value: job.id },
    url: canonical
  };
  if (job.country && job.country !== 'Global') {
    ld.jobLocation = { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: job.country, addressLocality: job.location || '' } };
  }
  if (job.salary) {
    const n = parseFloat(String(job.salary).replace(/[^0-9.]/g, ''));
    if (!isNaN(n)) {
      const cur = job.country==='UAE'?'AED':job.country==='Qatar'?'QAR':
                  job.country==='Kuwait'?'KWD':job.country==='Bahrain'?'BHD':
                  job.country==='Oman'?'OMR':'SAR';
      ld.baseSalary = { '@type': 'MonetaryAmount', currency: cur, value: { '@type': 'QuantitativeValue', value: n, unitText: 'MONTH' } };
    }
  }

  // Replace title tag with full SSR meta
  html = html.replace(/<title>[\s\S]*?<\/title>/, metaBlock(title, desc, canonical));
  // Inject JSON-LD before </head>
  html = html.replace('</head>', ldScript(ld) + '\n</head>');

  // Build visible content block
  const body =
    '<div class="wrap" style="max-width:900px;margin:0 auto;padding:2rem 1.25rem">' +
    '<h1 style="font-size:26px;margin-bottom:.5rem">' + esc(job.title) + '</h1>' +
    '<p style="color:#64748b;margin-bottom:1rem">' +
      esc(job.company || '') +
      (job.location ? ' - ' + esc(job.location) : '') +
      (job.country ? ' - ' + esc(job.country) : '') +
      (job.sector ? ' - ' + esc(job.sector) : '') +
    '</p>' +
    (job.salary ? '<p style="font-weight:600;margin-bottom:1rem">Salary: ' + esc(job.salary) + '</p>' : '') +
    '<div style="line-height:1.8;color:#374151">' + saneHtml(job.description) + '</div>' +
    '<p style="margin-top:1.5rem"><a href="' + SITE + '/">Browse more GCC jobs on EzWorkers</a></p>' +
    '</div>';

  // Inject content into the job-content container. Matched as an exact
  // literal (not a generic regex) because the placeholder has nested divs
  // and a non-greedy regex would stop at the first inner </div>, leaving
  // orphaned closing tags behind.
  const jobPlaceholder = '<div id="job-content"><div class="wrap"><div class="spin"></div></div></div>';
  if (html.includes(jobPlaceholder)) {
    html = html.replace(jobPlaceholder, '<div id="job-content">' + body + '</div>');
  } else {
    // Structure differs from what we expect: do not risk corrupting the
    // page, just leave the client-side JS to render it as before.
  }

  return ok(html);
}

// ── /article.html?id= ────────────────────────────────────────────────

async function ssrArticle(env, url) {
  const id = url.searchParams.get('id');
  if (!id) throw 'no id';

  const safe = encodeURIComponent(id);
  const rows = await sbGet('/rest/v1/blog_articles?or=(id.eq.' + safe + ',slug.eq.' + safe + ')&limit=1');
  const a = rows && rows[0];
  if (!a) throw 'not found';

  let html = await getPage('/article', env);
  if (!html || html.length < 100) throw 'empty static';

  const title = a.title + ' | EzWorkers Career Insights';
  const desc = a.excerpt || stripTags(a.body, 155);
  const canonical = SITE + '/article?id=' + encodeURIComponent(a.slug || a.id);
  const pubDate = a.publish_at || a.published_at || a.created_at;

  const ld = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: a.title || '',
    description: desc,
    datePublished: pubDate,
    dateModified: pubDate,
    author: { '@type': 'Organization', name: 'EzWorkers', url: SITE },
    publisher: { '@type': 'Organization', name: 'EzWorkers' },
    mainEntityOfPage: canonical
  };
  if (a.featured_image_url) ld.image = a.featured_image_url;

  html = html.replace(/<title>[\s\S]*?<\/title>/, metaBlock(title, desc, canonical));
  html = html.replace('</head>', ldScript(ld) + '\n</head>');

  const dateStr = pubDate ? new Date(pubDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const body =
    '<div style="max-width:760px;margin:0 auto;padding:2.5rem 1.25rem">' +
    '<h1 style="font-size:28px;margin-bottom:.5rem">' + esc(a.title) + '</h1>' +
    '<p style="color:#64748b;margin-bottom:1.5rem">' + esc(dateStr) +
      (a.reading_time ? ' - ' + a.reading_time + ' min read' : '') + '</p>' +
    (a.featured_image_url ? '<img src="' + esc(a.featured_image_url) + '" alt="' + esc(a.title) + '" style="width:100%;border-radius:12px;margin-bottom:1.5rem">' : '') +
    '<div style="line-height:1.85;color:#374151">' + saneHtml(a.body) + '</div>' +
    '<p style="margin-top:2rem"><a href="' + SITE + '/blog">More GCC career insights on EzWorkers</a></p>' +
    '</div>';

  // Inject into the article-content container using an exact literal
  // match for the same reason described in ssrJob above.
  const artPlaceholder = '<div id="article-content">\n  <div class="wrap" style="padding:3rem 0;text-align:center">\n    <div class="spin"></div>\n    <p style="color:#64748b">Loading article...</p>\n  </div>\n</div>';
  if (html.includes(artPlaceholder)) {
    html = html.replace(artPlaceholder, '<div id="article-content">' + body + '</div>');
  } else {
    // Try a whitespace-tolerant fallback: collapse whitespace before comparing
    const collapsed = html.replace(/\s+/g, ' ');
    const placeholderCollapsed = artPlaceholder.replace(/\s+/g, ' ');
    if (collapsed.includes(placeholderCollapsed)) {
      // Rebuild using a balanced-nesting-safe regex: match the outer div by
      // counting to the matching close (2 nested divs deep here specifically)
      html = html.replace(
        /<div id="article-content">\s*<div class="wrap"[^>]*>\s*<div class="spin"><\/div>\s*<p[^>]*>[^<]*<\/p>\s*<\/div>\s*<\/div>/,
        '<div id="article-content">' + body + '</div>'
      );
    }
  }

  return ok(html);
}

// ── /blog.html ───────────────────────────────────────────────────────

async function ssrBlog(env) {
  const rows = await sbGet('/rest/v1/blog_articles?select=id,slug,title,excerpt,tags,reading_time,publish_at&order=publish_at.desc&limit=24');
  if (!rows || !rows.length) throw 'no articles';

  let html = await getPage('/blog', env);
  if (!html || html.length < 100) throw 'empty static';

  const cards = rows.map(function (a) {
    const d = a.publish_at ? new Date(a.publish_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return '<a class="article-card" href="article?id=' + esc(a.slug || a.id) + '" style="display:block;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1.4rem;text-decoration:none;color:inherit">' +
      '<h2 style="font-size:17px;font-weight:700;margin-bottom:.5rem;color:#0f172a">' + esc(a.title) + '</h2>' +
      '<p style="font-size:13px;color:#64748b;line-height:1.6;margin-bottom:.75rem">' + esc(a.excerpt || '') + '</p>' +
      '<p style="font-size:12px;color:#94a3b8">' + esc(d) + (a.reading_time ? ' - ' + a.reading_time + ' min read' : '') + '</p>' +
      '</a>';
  }).join('');

  const ld = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: rows.map(function (a, i) {
      return { '@type': 'ListItem', position: i + 1, url: SITE + '/article?id=' + (a.slug || a.id), name: a.title };
    })
  };

  html = html.replace(
    /<div class="articles-grid" id="articles-grid">[\s\S]*?<\/div>\s*<\/div>/,
    '<div class="articles-grid" id="articles-grid">' + cards + '</div>'
  );
  html = html.replace('</head>', ldScript(ld) + '\n</head>');

  return ok(html);
}

// ── homepage ─────────────────────────────────────────────────────────

async function ssrIndex(env) {
  const rows = await sbGet('/rest/v1/jobs?is_active=eq.true&select=id,title,company,country&order=posted_at.desc&limit=30');
  if (!rows || !rows.length) throw 'no jobs';

  let html = await getPage('/', env);
  if (!html || html.length < 100) throw 'empty static';

  const links = '<ul style="list-style:none;padding:1rem 0">' + rows.map(function (j) {
    return '<li style="padding:.45rem 0;border-bottom:1px solid #f1f5f9">' +
      '<a href="job?id=' + esc(j.id) + '" style="color:#1A6FC4;text-decoration:none;font-weight:500">' + esc(j.title) + '</a>' +
      '<span style="color:#64748b;font-size:13px"> - ' + esc(j.company || '') + (j.country ? ', ' + esc(j.country) : '') + '</span></li>';
  }).join('') + '</ul>';

  const indexPlaceholder = '<div id="jobs-list">\n    <div class="loading-grid">\n      <div class="spinner"></div>\n      <p data-i18n="loading">Finding jobs for you...</p>\n    </div>\n  </div>';
  if (html.includes(indexPlaceholder)) {
    html = html.replace(indexPlaceholder, '<div id="jobs-list">' + links + '</div>');
  }

  return ok(html);
}

// ── /jobs/* landing pages ────────────────────────────────────────────

async function ssrJobList(env, path) {
  const f = LIST_FILTERS[path];
  const rows = await sbGet('/rest/v1/jobs?is_active=eq.true&' + f[0] + '=eq.' + encodeURIComponent(f[1]) +
    '&select=id,title,company,location,country&order=posted_at.desc&limit=40');
  if (!rows || !rows.length) throw 'no jobs';

  let html = await getPage(path, env);
  if (!html || html.length < 100) throw 'empty static';

  const links = '<ul style="list-style:none;padding:0">' + rows.map(function (j) {
    return '<li style="padding:.55rem 0;border-bottom:1px solid #f1f5f9">' +
      '<a href="../job?id=' + esc(j.id) + '" style="color:#1A6FC4;text-decoration:none;font-weight:500">' + esc(j.title) + '</a>' +
      '<span style="color:#64748b;font-size:13px"> - ' + esc(j.company || '') + (j.location ? ', ' + esc(j.location) : (j.country ? ', ' + esc(j.country) : '')) + '</span></li>';
  }).join('') + '</ul>';

  html = html.replace(
    '<div id="list"><div class="spin"></div></div>',
    '<div id="list">' + links + '</div>'
  );

  return ok(html);
}
