// EzWorkers nav.js — smart auth-aware navbar with mega-menu and mobile drawer
// Include AFTER page content loads. No external dependencies.

(function(){
var SB  = 'https://wxltwnyuhiejavzichfd.supabase.co';
var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHR3bnl1aGllamF2emljaGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjk4NDYsImV4cCI6MjA5NzgwNTg0Nn0.8PH3VTz2u6rRcu-LqZYGMDbNIdj9YldNBQJ1irTCtI4';

var sess = null, prof = null;
try { sess = JSON.parse(localStorage.getItem('ez_session')||'null'); } catch(e){}
try { prof = JSON.parse(localStorage.getItem('ez_profile')||'null'); } catch(e){}
var loggedIn = sess && sess.access_token && (!sess.expires_at || Date.now()/1000 < sess.expires_at);

// Build auth buttons
var authHTML = '';
if(loggedIn && prof) {
  var dash = prof.role === 'employer' ? 'employer-dashboard.html' : 'dashboard.html';
  var label = prof.role === 'employer' ? 'Employer dashboard' : 'My dashboard';
  var name = prof.full_name ? prof.full_name.split(' ')[0] : '';
  authHTML =
    '<a href="'+dash+'" class="nav-dash-btn">'+
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>'+
      (name ? name : label)+
    '</a>';
} else {
  authHTML =
    '<a href="login.html" class="nav-link-plain">Sign in</a>'+
    '<a href="register.html" class="nav-post-btn">Register free</a>';
}

// Inject navbar into #ez-nav
var target = document.getElementById('ez-nav');
if(!target) return;

target.innerHTML =
'<style>'+
'#ez-nav{position:sticky;top:0;z-index:200;background:#fff;border-bottom:1px solid #e2e8f0;font-family:"Inter",-apple-system,sans-serif}'+
'.ez-nav-inner{max-width:1160px;margin:0 auto;padding:0 1.25rem;display:flex;align-items:center;height:64px;gap:1.5rem}'+
'.ez-logo{display:flex;align-items:center;gap:.6rem;font-size:20px;font-weight:700;color:#0f172a;text-decoration:none;flex-shrink:0}'+
'.ez-logo-mark{width:36px;height:36px;background:#1A6FC4;border-radius:9px;display:flex;align-items:center;justify-content:center}'+
'.ez-logo span{color:#F47B2B}'+
'.ez-logo-tag{font-size:10px;font-weight:500;color:#64748b;letter-spacing:.04em;display:block;line-height:1;margin-top:2px}'+
'.ez-nav-links{display:flex;align-items:center;gap:.25rem;list-style:none;flex:1}'+
'.ez-nav-links li{position:relative}'+
'.ez-nav-link{font-size:14px;font-weight:500;color:#64748b;padding:.4rem .65rem;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:.2rem;white-space:nowrap;background:none;border:none;font-family:inherit;transition:color .15s,background .15s;text-decoration:none}'+
'.ez-nav-link:hover{color:#1A6FC4;background:#f0f7ff}'+
'.ez-nav-link svg{transition:transform .2s}'+
'.ez-nav-link.open svg{transform:rotate(180deg)}'+
'.ez-dropdown{display:none;position:absolute;top:calc(100% + 8px);left:0;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.1);min-width:240px;padding:.75rem;z-index:300}'+
'.ez-dropdown.wide{min-width:560px;display:none;grid-template-columns:1fr 1fr}'+
'.ez-dropdown.open{display:grid}'+
'.ez-dropdown-col h4{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;padding:.25rem .5rem .5rem;margin-bottom:.25rem}'+
'.ez-dropdown a{display:block;font-size:13px;color:#374151;padding:.4rem .5rem;border-radius:7px;text-decoration:none;transition:background .12s,color .12s}'+
'.ez-dropdown a:hover{background:#f0f7ff;color:#1A6FC4}'+
'.ez-dropdown a .flag{margin-right:.35rem}'+
'.ez-nav-right{display:flex;align-items:center;gap:.6rem;margin-left:auto;flex-shrink:0}'+
'.nav-dash-btn{display:flex;align-items:center;gap:.4rem;font-size:13px;font-weight:600;color:#fff;background:#1A6FC4;border-radius:8px;padding:.4rem 1rem;text-decoration:none;transition:background .15s}'+
'.nav-dash-btn:hover{background:#155fa0}'+
'.nav-post-btn{font-size:13px;font-weight:600;color:#fff;background:#F47B2B;border-radius:8px;padding:.4rem 1rem;text-decoration:none;transition:background .15s}'+
'.nav-post-btn:hover{background:#d96820}'+
'.nav-link-plain{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;padding:.4rem .6rem;border-radius:8px;transition:color .15s}'+
'.nav-link-plain:hover{color:#1A6FC4}'+
// Mobile
'.ez-hamburger{display:none;background:none;border:none;cursor:pointer;padding:.25rem;color:#374151}'+
'.ez-drawer{display:none;position:fixed;inset:0;z-index:400}'+
'.ez-drawer-bg{position:absolute;inset:0;background:rgba(0,0,0,.4)}'+
'.ez-drawer-panel{position:absolute;right:0;top:0;bottom:0;width:280px;background:#fff;overflow-y:auto;padding:1.5rem 1.25rem}'+
'.ez-drawer-close{position:absolute;top:1rem;right:1rem;background:none;border:none;cursor:pointer;font-size:20px;color:#64748b}'+
'.ez-drawer-logo{font-size:18px;font-weight:700;color:#0f172a;margin-bottom:1.5rem}'+
'.ez-drawer-logo span{color:#F47B2B}'+
'.ez-drawer-section{margin-bottom:1rem}'+
'.ez-drawer-section h4{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:.5rem}'+
'.ez-drawer-section a{display:block;font-size:14px;color:#374151;padding:.4rem 0;text-decoration:none;border-bottom:1px solid #f1f5f9}'+
'.ez-drawer-section a:hover{color:#1A6FC4}'+
'.ez-drawer-auth{margin-top:1.25rem;display:flex;flex-direction:column;gap:.6rem}'+
'@media(max-width:768px){.ez-nav-links{display:none}.ez-hamburger{display:flex}.nav-post-btn,.nav-link-plain{display:none}}'+
'</style>'+

'<div class="ez-nav-inner">'+
  '<a href="index.html" class="ez-logo">'+
    '<div class="ez-logo-mark">'+
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.5" stroke="#fff" stroke-width="1.8"/><path d="M3 19c0-3.314 2.686-6 6-6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M15 13l2 2 4-4" stroke="#F47B2B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
    '</div>'+
    '<div>Ez<span>Workers</span><span class="ez-logo-tag">GCC JOBS · وظائف الخليج</span></div>'+
  '</a>'+

  '<ul class="ez-nav-links">'+
    '<li>'+
      '<button class="ez-nav-link" id="dd-jobs-btn">'+
        'Find jobs '+
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'+
      '</button>'+
      '<div class="ez-dropdown wide" id="dd-jobs">'+
        '<div class="ez-dropdown-col">'+
          '<h4>By country</h4>'+
          '<a href="jobs/saudi-arabia.html"><span class="flag">🇸🇦</span>Saudi Arabia jobs</a>'+
          '<a href="jobs/uae.html"><span class="flag">🇦🇪</span>UAE jobs</a>'+
          '<a href="jobs/qatar.html"><span class="flag">🇶🇦</span>Qatar jobs</a>'+
          '<a href="jobs/kuwait.html"><span class="flag">🇰🇼</span>Kuwait jobs</a>'+
          '<a href="jobs/bahrain.html"><span class="flag">🇧🇭</span>Bahrain jobs</a>'+
          '<a href="jobs/oman.html"><span class="flag">🇴🇲</span>Oman jobs</a>'+
        '</div>'+
        '<div class="ez-dropdown-col">'+
          '<h4>By sector</h4>'+
          '<a href="jobs/procurement.html">Procurement & Supply Chain</a>'+
          '<a href="jobs/construction.html">Construction & Infrastructure</a>'+
          '<a href="jobs/engineering.html">Engineering & Technical</a>'+
          '<a href="jobs/oil-gas.html">Oil & Gas / Energy</a>'+
          '<a href="index.html?sector=Finance+%26+Banking">Finance & Banking</a>'+
          '<a href="index.html?sector=IT+%26+Technology">IT & Technology</a>'+
        '</div>'+
      '</div>'+
    '</li>'+
    '<li><a href="blog.html" class="ez-nav-link">Career insights</a></li>'+
    '<li>'+
      '<button class="ez-nav-link" id="dd-res-btn">'+
        'Resources '+
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'+
      '</button>'+
      '<div class="ez-dropdown" id="dd-res">'+
        '<div class="ez-dropdown-col" style="min-width:220px">'+
          '<h4>Career tools</h4>'+
          '<a href="salary-guide.html">💰 GCC Salary guide 2026</a>'+
          '<a href="resources/cv-tips.html">📄 CV writing for GCC market</a>'+
          '<a href="resources/iqama-guide.html">🪪 Iqama transfer guide 2026</a>'+
          '<a href="resources/labour-laws.html">⚖️ GCC labour laws overview</a>'+
        '</div>'+
      '</div>'+
    '</li>'+
    '<li><a href="post-job.html" class="ez-nav-link">Post a job</a></li>'+
  '</ul>'+

  '<div class="ez-nav-right">'+
    authHTML+
    '<button class="ez-hamburger" id="ez-ham" aria-label="Open menu">'+
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>'+
    '</button>'+
  '</div>'+
'</div>'+

// Mobile drawer
'<div class="ez-drawer" id="ez-drawer">'+
  '<div class="ez-drawer-bg" id="ez-drawer-bg"></div>'+
  '<div class="ez-drawer-panel">'+
    '<button class="ez-drawer-close" id="ez-drawer-close">✕</button>'+
    '<div class="ez-drawer-logo">Ez<span>Workers</span></div>'+
    '<div class="ez-drawer-section">'+
      '<h4>Jobs by country</h4>'+
      '<a href="jobs/saudi-arabia.html">🇸🇦 Saudi Arabia</a>'+
      '<a href="jobs/uae.html">🇦🇪 UAE</a>'+
      '<a href="jobs/qatar.html">🇶🇦 Qatar</a>'+
      '<a href="jobs/kuwait.html">🇰🇼 Kuwait</a>'+
      '<a href="jobs/bahrain.html">🇧🇭 Bahrain</a>'+
      '<a href="jobs/oman.html">🇴🇲 Oman</a>'+
    '</div>'+
    '<div class="ez-drawer-section">'+
      '<h4>Jobs by sector</h4>'+
      '<a href="jobs/procurement.html">Procurement & Supply Chain</a>'+
      '<a href="jobs/construction.html">Construction & Infrastructure</a>'+
      '<a href="jobs/engineering.html">Engineering & Technical</a>'+
      '<a href="jobs/oil-gas.html">Oil & Gas / Energy</a>'+
    '</div>'+
    '<div class="ez-drawer-section">'+
      '<h4>Resources</h4>'+
      '<a href="salary-guide.html">Salary guide 2026</a>'+
      '<a href="resources/cv-tips.html">CV writing tips</a>'+
      '<a href="resources/iqama-guide.html">Iqama transfer guide</a>'+
      '<a href="blog.html">Career insights blog</a>'+
    '</div>'+
    '<div class="ez-drawer-auth">'+
      (loggedIn && prof
        ? '<a href="'+(prof.role==='employer'?'employer-dashboard.html':'dashboard.html')+'" style="display:block;text-align:center;padding:.75rem;background:#1A6FC4;color:#fff;border-radius:10px;font-weight:600;text-decoration:none">My dashboard</a>'
        : '<a href="login.html" style="display:block;text-align:center;padding:.75rem;background:#f8fafc;border:1px solid #e2e8f0;color:#374151;border-radius:10px;font-weight:600;text-decoration:none">Sign in</a>'+
          '<a href="register.html" style="display:block;text-align:center;padding:.75rem;background:#F47B2B;color:#fff;border-radius:10px;font-weight:600;text-decoration:none">Register free</a>'
      )+
    '</div>'+
  '</div>'+
'</div>';

// Dropdown toggle logic
function toggleDD(btnId, ddId) {
  var btn = document.getElementById(btnId);
  var dd  = document.getElementById(ddId);
  if(!btn || !dd) return;
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var open = dd.classList.contains('open');
    // close all dropdowns
    document.querySelectorAll('.ez-dropdown').forEach(function(d){ d.classList.remove('open'); });
    document.querySelectorAll('.ez-nav-link').forEach(function(b){ b.classList.remove('open'); });
    if(!open) { dd.classList.add('open'); btn.classList.add('open'); }
  });
}
toggleDD('dd-jobs-btn','dd-jobs');
toggleDD('dd-res-btn','dd-res');

// Close dropdowns on outside click
document.addEventListener('click', function() {
  document.querySelectorAll('.ez-dropdown').forEach(function(d){ d.classList.remove('open'); });
  document.querySelectorAll('.ez-nav-link').forEach(function(b){ b.classList.remove('open'); });
});

// Mobile drawer
var ham   = document.getElementById('ez-ham');
var drawer = document.getElementById('ez-drawer');
var dclose = document.getElementById('ez-drawer-close');
var dbg    = document.getElementById('ez-drawer-bg');
function openDrawer(){ if(drawer) drawer.style.display='block'; }
function closeDrawer(){ if(drawer) drawer.style.display='none'; }
if(ham)    ham.addEventListener('click', openDrawer);
if(dclose) dclose.addEventListener('click', closeDrawer);
if(dbg)    dbg.addEventListener('click', closeDrawer);

})();
