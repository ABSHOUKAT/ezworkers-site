// EzWorkers — main.js
// Supabase credentials (anon/public key — safe to expose)
const SUPABASE_URL = 'https://wxltwnyuhiejavzichfd.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHR3bnl1aGllamF2emljaGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjk4NDYsImV4cCI6MjA5NzgwNTg0Nn0.8PH3VTz2u6rRcu-LqZYGMDbNIdj9YldNBQJ1irTCtI4';

const PAGE_SIZE = 20;

// ── Language ────────────────────────────────────────────────────────────────
const LANG = {
  en: {
    search_placeholder: 'Job title, company, or keyword',
    search_btn: 'Search jobs',
    all_countries: 'All countries',
    all_sectors: 'All sectors',
    filters: 'Filter:',
    sort_newest: 'Newest first',
    sort_oldest: 'Oldest first',
    job_type_all: 'All types',
    loading: 'Finding jobs for you...',
    no_jobs: 'No jobs found',
    no_jobs_sub: 'Try different keywords or remove filters',
    back: '← Back to jobs',
    apply: 'Apply for this job',
    posted: 'Posted',
    source: 'Source',
    full_time: 'Full-time',
    remote: 'Remote',
    contract: 'Contract',
    new_badge: 'New',
    post_job: 'Post a job',
    nav_jobs: 'Browse jobs',
    nav_blog: 'Career insights',
    nav_post: 'Post a job',
    nav_contact: 'Contact',
    hero_eyebrow: 'GCC\'s fastest-growing job board',
    hero_h1_1: 'Find your next role',
    hero_h1_2: 'across the Gulf',
    hero_sub: 'Thousands of jobs in Saudi Arabia, UAE, Qatar and across the GCC — updated every 6 hours.',
    stat_jobs: 'Live jobs',
    stat_countries: 'GCC countries',
    stat_sectors: 'Sectors',
    results_label: 'jobs found',
    footer_desc: 'The GCC\'s job search engine for professionals in construction, energy, procurement, and beyond.',
    footer_jobs: 'Jobs',
    footer_company: 'Company',
    footer_about: 'About EzWorkers',
    footer_contact: 'Contact us',
    footer_post: 'Post a job',
    footer_privacy: 'Privacy policy',
    footer_terms: 'Terms of use',
    copyright: '© 2026 EzWorkers. All rights reserved.',
  },
  ar: {
    search_placeholder: 'المسمى الوظيفي أو الشركة أو الكلمة المفتاحية',
    search_btn: 'بحث عن وظائف',
    all_countries: 'جميع الدول',
    all_sectors: 'جميع القطاعات',
    filters: 'تصفية:',
    sort_newest: 'الأحدث أولاً',
    sort_oldest: 'الأقدم أولاً',
    job_type_all: 'جميع الأنواع',
    loading: 'جاري البحث عن الوظائف...',
    no_jobs: 'لا توجد وظائف',
    no_jobs_sub: 'جرب كلمات مختلفة أو أزل الفلاتر',
    back: 'العودة إلى الوظائف ←',
    apply: 'التقدم لهذه الوظيفة',
    posted: 'نُشر في',
    source: 'المصدر',
    full_time: 'دوام كامل',
    remote: 'عن بُعد',
    contract: 'عقد',
    new_badge: 'جديد',
    post_job: 'انشر وظيفة',
    nav_jobs: 'تصفح الوظائف',
    nav_blog: 'رؤى مهنية',
    nav_post: 'انشر وظيفة',
    nav_contact: 'تواصل معنا',
    hero_eyebrow: 'أسرع منصة وظائف في الخليج',
    hero_h1_1: 'ابحث عن وظيفتك القادمة',
    hero_h1_2: 'في دول الخليج',
    hero_sub: 'آلاف الوظائف في السعودية والإمارات وقطر وسائر دول الخليج — تُحدَّث كل 6 ساعات.',
    stat_jobs: 'وظيفة متاحة',
    stat_countries: 'دول خليجية',
    stat_sectors: 'قطاع',
    results_label: 'وظيفة',
    footer_desc: 'محرك البحث الوظيفي لمحترفي الإنشاء والطاقة والمشتريات وما هو أبعد في الخليج.',
    footer_jobs: 'الوظائف',
    footer_company: 'الشركة',
    footer_about: 'عن إيزووركرز',
    footer_contact: 'تواصل معنا',
    footer_post: 'انشر وظيفة',
    footer_privacy: 'سياسة الخصوصية',
    footer_terms: 'شروط الاستخدام',
    copyright: '© 2026 إيزووركرز. جميع الحقوق محفوظة.',
  }
};

let currentLang = localStorage.getItem('ez_lang') || 'en';

function t(key) { return LANG[currentLang][key] || LANG['en'][key] || key; }

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('ez_lang', lang);
  document.documentElement.lang = lang;
  document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
  applyTranslations();
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const attr = el.getAttribute('data-i18n-attr');
    if (attr) el.setAttribute(attr, t(key));
    else el.textContent = t(key);
  });
  // Update lang toggle button text
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = currentLang === 'en' ? 'عربي' : 'English';
}

// ── Supabase query ──────────────────────────────────────────────────────────
async function queryJobs({ search = '', country = '', sector = '', jobType = '', page = 1, sort = 'newest' } = {}) {
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  let url = `${SUPABASE_URL}/rest/v1/jobs?is_active=eq.true&select=*`;

  if (search) {
    const q = encodeURIComponent(search);
    url += `&or=(title.ilike.*${q}*,company.ilike.*${q}*,description.ilike.*${q}*,location.ilike.*${q}*)`;
  }
  if (country && country !== 'all') url += `&country=eq.${encodeURIComponent(country)}`;
  if (sector  && sector  !== 'all') url += `&sector=eq.${encodeURIComponent(sector)}`;
  if (jobType && jobType !== 'all') url += `&job_type=eq.${encodeURIComponent(jobType)}`;

  url += sort === 'newest'
    ? `&order=posted_at.desc`
    : `&order=posted_at.asc`;

  url += `&limit=${PAGE_SIZE}&offset=${from}`;

  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Prefer': 'count=exact',
    }
  });

  const total = parseInt(res.headers.get('content-range')?.split('/')[1] || '0');
  const jobs  = await res.json();
  return { jobs, total };
}

async function getJobById(id) {
  const url = `${SUPABASE_URL}/rest/v1/jobs?id=eq.${id}&select=*&limit=1`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` }
  });
  const data = await res.json();
  return data[0] || null;
}

async function countJobs() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jobs?is_active=eq.true&select=id&limit=1`, {
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Prefer': 'count=exact' }
  });
  return parseInt(res.headers.get('content-range')?.split('/')[1] || '0');
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (hours < 1)  return currentLang === 'ar' ? 'منذ قليل' : 'Just now';
  if (hours < 24) return currentLang === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
  if (days < 7)   return currentLang === 'ar' ? `منذ ${days} أيام` : `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(currentLang === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' });
}

function isNew(dateStr) {
  return Date.now() - new Date(dateStr).getTime() < 86400000 * 3;
}

function companyInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

function formatDescription(text) {
  if (!text) return '<p>No description available.</p>';
  // Strip HTML tags, then format
  const clean = text.replace(/<[^>]*>/g, '');
  return clean
    .split('\n')
    .filter(l => l.trim())
    .map(l => `<p>${l}</p>`)
    .join('');
}

function applyUrl(url) {
  if (!url) return '#';
  if (url.includes('@')) return `mailto:${url}`;
  if (!url.startsWith('http')) return `https://${url}`;
  return url;
}

// ── Job card HTML ────────────────────────────────────────────────────────────
function jobCardHTML(job) {
  const newBadge = isNew(job.posted_at) ? `<span class="tag new">${t('new_badge')}</span>` : '';
  const salary   = job.salary ? `<div class="job-salary">${job.salary}</div>` : '';
  return `
    <a class="job-card" href="job.html?id=${job.id}">
      <div class="job-logo">${companyInitial(job.company)}</div>
      <div>
        <div class="job-title">${job.title || 'Untitled'}</div>
        <div class="job-company">${job.company || 'Company not specified'}</div>
        <div class="job-tags">
          ${job.country ? `<span class="tag country">${job.country}</span>` : ''}
          ${job.sector  ? `<span class="tag sector">${job.sector}</span>`   : ''}
          ${newBadge}
        </div>
      </div>
      <div class="job-meta">
        ${salary}
        <div class="job-date">${timeAgo(job.posted_at)}</div>
        <div class="job-type-badge">${job.job_type || t('full_time')}</div>
      </div>
    </a>`;
}

// ── Navbar builder (shared) ──────────────────────────────────────────────────
function buildNavbar(activePage) {
  return `
    <nav class="navbar">
      <div class="container">
        <div class="navbar-inner">
          <a href="index.html" class="logo">
            <div class="logo-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="8" r="3.5" stroke="#fff" stroke-width="1.8"/>
                <path d="M3 19c0-3.314 2.686-6 6-6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M15 13l2 2 4-4" stroke="#F47B2B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              Ez<span>Workers</span>
              <span class="logo-tag">GCC JOBS · وظائف الخليج</span>
            </div>
          </a>
          <ul class="nav-links">
            <li><a href="index.html" class="${activePage==='home'?'active':''}" data-i18n="nav_jobs"></a></li>
            <li><a href="blog.html" class="${activePage==='blog'?'active':''}" data-i18n="nav_blog"></a></li>
            <li><a href="post-job.html" class="${activePage==='post'?'active':''}" data-i18n="nav_post"></a></li>
          </ul>
          <div class="nav-actions">
            <button class="btn-lang" id="lang-toggle" onclick="toggleLang()">عربي</button>
            <a href="post-job.html" class="btn-post" data-i18n="post_job"></a>
          </div>
        </div>
      </div>
    </nav>`;
}

function buildFooter() {
  return `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="footer-logo">Ez<span>Workers</span></div>
            <p data-i18n="footer_desc"></p>
          </div>
          <div class="footer-col">
            <h4 data-i18n="footer_jobs"></h4>
            <ul>
              <li><a href="index.html?country=Saudi+Arabia">Saudi Arabia</a></li>
              <li><a href="index.html?country=UAE">UAE</a></li>
              <li><a href="index.html?country=Qatar">Qatar</a></li>
              <li><a href="index.html?country=Kuwait">Kuwait</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4 data-i18n="footer_company"></h4>
            <ul>
              <li><a href="#" data-i18n="footer_about"></a></li>
              <li><a href="#" data-i18n="footer_contact"></a></li>
              <li><a href="post-job.html" data-i18n="footer_post"></a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="privacy.html" data-i18n="footer_privacy"></a></li>
              <li><a href="terms.html" data-i18n="footer_terms"></a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span data-i18n="copyright"></span>
        </div>
      </div>
    </footer>`;
}

function toggleLang() {
  setLang(currentLang === 'en' ? 'ar' : 'en');
}

// Init lang on load
document.addEventListener('DOMContentLoaded', () => {
  setLang(currentLang);
});
