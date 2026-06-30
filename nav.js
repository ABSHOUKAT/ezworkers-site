// EzWorkers nav.js — smart auth-aware navbar with mega-menu and mobile drawer
// Handles relative paths from root, /jobs/, /resources/ subdirectories
(function(){
// These pages have no Arabic content. If a stale 'ar' preference was set on
// the homepage/blog (the only bilingual pages), it must not leak RTL styling
// onto pages that have nothing to show in Arabic — force LTR here explicitly.
document.documentElement.lang = 'en';
document.body.dir = 'ltr';

// Detect subdirectory depth for correct relative paths
var BASE = (window.location.pathname.indexOf('/jobs/') !== -1 ||
            window.location.pathname.indexOf('/resources/') !== -1) ? '../' : '';

var SB  = 'https://wxltwnyuhiejavzichfd.supabase.co';
var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHR3bnl1aGllamF2emljaGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjk4NDYsImV4cCI6MjA5NzgwNTg0Nn0.8PH3VTz2u6rRcu-LqZYGMDbNIdj9YldNBQJ1irTCtI4';

var sess = null, prof = null;
try { sess = JSON.parse(localStorage.getItem('ez_session')||'null'); } catch(e){}
try { prof = JSON.parse(localStorage.getItem('ez_profile')||'null'); } catch(e){}
var loggedIn = sess && sess.access_token && (!sess.expires_at || Date.now()/1000 < sess.expires_at);

// Auth buttons
var authHTML = '';
if(loggedIn && prof) {
  var dash  = BASE + (prof.role === 'employer' ? 'employer-dashboard.html' : 'dashboard.html');
  var name  = prof.full_name ? prof.full_name.split(' ')[0] : 'Dashboard';
  authHTML =
    '<a href="'+dash+'" class="ez-dash-btn">'+
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>'+
      name+
    '</a>';
} else {
  authHTML =
    '<a href="'+BASE+'login.html" class="ez-link-plain">Sign in</a>'+
    '<a href="'+BASE+'register.html" class="ez-post-btn">Register free</a>';
}

var target = document.getElementById('ez-nav');
if(!target) return;

target.innerHTML =
'<style>'+
'#ez-nav{position:sticky;top:0;z-index:200;background:#fff;border-bottom:1px solid #e2e8f0;font-family:"Inter",-apple-system,sans-serif}'+
'.ez-ni{max-width:1160px;margin:0 auto;padding:0 1.25rem;display:flex;align-items:center;height:64px;gap:1rem}'+
'.ez-logo{display:flex;align-items:center;gap:.6rem;font-size:20px;font-weight:700;color:#0f172a;text-decoration:none;flex-shrink:0;line-height:1}'+
'.ez-lm{width:36px;height:36px;min-width:36px;background:#1A6FC4;border-radius:9px;display:flex;align-items:center;justify-content:center}'+
'.ez-logo-name{color:#0f172a}.ez-logo-name .ow{color:#F47B2B}'+
'.ez-logo-tag{font-size:10px;font-weight:500;color:#64748b;letter-spacing:.04em;display:block;line-height:1;margin-top:2px}'+
'.ez-links{display:flex;align-items:center;gap:.15rem;list-style:none;flex:1;margin:0;padding:0}'+
'.ez-links li{position:relative}'+
'.ez-lnk{font-size:14px;font-weight:500;color:#64748b;padding:.4rem .6rem;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:.25rem;white-space:nowrap;background:none;border:none;font-family:inherit;transition:color .15s,background .15s;text-decoration:none}'+
'.ez-lnk:hover{color:#1A6FC4;background:#f0f7ff}'+
'.ez-lnk svg{transition:transform .2s;flex-shrink:0}'+
'.ez-lnk.open svg{transform:rotate(180deg)}'+
'.ez-dd{display:none;position:absolute;top:calc(100% + 6px);left:0;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.1);padding:.75rem;z-index:300;min-width:220px}'+
'.ez-dd.wide{min-width:500px}'+
'.ez-dd.open{display:flex;gap:1rem}'+
'.ez-dc h4{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;padding:.25rem .5rem .5rem;margin-bottom:.25rem;white-space:nowrap}'+
'.ez-dc a{display:block;font-size:13px;color:#374151;padding:.4rem .5rem;border-radius:7px;text-decoration:none;white-space:nowrap;transition:background .12s,color .12s}'+
'.ez-dc a:hover{background:#f0f7ff;color:#1A6FC4}'+
'.ez-right{display:flex;align-items:center;gap:.5rem;margin-left:auto;flex-shrink:0}'+
'.ez-dash-btn{display:flex;align-items:center;gap:.4rem;font-size:13px;font-weight:600;color:#fff;background:#1A6FC4;border-radius:8px;padding:.4rem 1rem;text-decoration:none;white-space:nowrap}'+
'.ez-dash-btn:hover{background:#155fa0}'+
'.ez-post-btn{font-size:13px;font-weight:600;color:#fff;background:#F47B2B;border-radius:8px;padding:.4rem 1rem;text-decoration:none;white-space:nowrap}'+
'.ez-post-btn:hover{background:#d96820}'+
'.ez-link-plain{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;padding:.35rem .6rem;border-radius:8px;white-space:nowrap}'+
'.ez-link-plain:hover{color:#1A6FC4}'+
'.ez-ham{display:none;background:none;border:none;cursor:pointer;padding:.3rem;color:#374151;flex-shrink:0}'+
'.ez-drawer{display:none;position:fixed;inset:0;z-index:400}'+
'.ez-dbg{position:absolute;inset:0;background:rgba(0,0,0,.4)}'+
'.ez-dp{position:absolute;right:0;top:0;bottom:0;width:280px;background:#fff;overflow-y:auto;padding:1.5rem 1.25rem}'+
'.ez-dclose{position:absolute;top:1rem;right:1rem;background:none;border:none;cursor:pointer;font-size:20px;color:#64748b;line-height:1}'+
'.ez-dlogo{font-size:18px;font-weight:700;color:#0f172a;margin-bottom:1.5rem}.ez-dlogo span{color:#F47B2B}'+
'.ez-dsec{margin-bottom:1.1rem}'+
'.ez-dsec h4{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:.5rem}'+
'.ez-dsec a{display:block;font-size:14px;color:#374151;padding:.4rem 0;text-decoration:none;border-bottom:1px solid #f1f5f9}'+
'.ez-dsec a:hover{color:#1A6FC4}'+
'.ez-dauth{margin-top:1.25rem;display:flex;flex-direction:column;gap:.6rem}'+
'@media(max-width:768px){.ez-links{display:none}.ez-ham{display:flex}.ez-post-btn,.ez-link-plain{display:none}}'+
'</style>'+
'<div class="ez-ni">'+
  '<a href="'+BASE+'index.html" class="ez-logo">'+
    '<div class="ez-lm"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.5" stroke="#fff" stroke-width="1.8"/><path d="M3 19c0-3.314 2.686-6 6-6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M15 13l2 2 4-4" stroke="#F47B2B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'+
    '<div><div class="ez-logo-name">Ez<span class="ow">Workers</span></div><span class="ez-logo-tag">GCC JOBS · وظائف الخليج</span></div>'+
  '</a>'+
  '<ul class="ez-links">'+
    '<li>'+
      '<button class="ez-lnk" id="dd1-btn">Find jobs <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>'+
      '<div class="ez-dd wide" id="dd1">'+
        '<div class="ez-dc">'+
          '<h4>By country</h4>'+
          '<a href="'+BASE+'jobs/saudi-arabia.html">🇸🇦 Saudi Arabia</a>'+
          '<a href="'+BASE+'jobs/uae.html">🇦🇪 UAE</a>'+
          '<a href="'+BASE+'jobs/qatar.html">🇶🇦 Qatar</a>'+
          '<a href="'+BASE+'jobs/kuwait.html">🇰🇼 Kuwait</a>'+
          '<a href="'+BASE+'jobs/bahrain.html">🇧🇭 Bahrain</a>'+
          '<a href="'+BASE+'jobs/oman.html">🇴🇲 Oman</a>'+
        '</div>'+
        '<div class="ez-dc">'+
          '<h4>By sector</h4>'+
          '<a href="'+BASE+'jobs/procurement.html">📦 Procurement & Supply Chain</a>'+
          '<a href="'+BASE+'jobs/construction.html">🏗️ Construction & Infrastructure</a>'+
          '<a href="'+BASE+'jobs/engineering.html">⚙️ Engineering & Technical</a>'+
          '<a href="'+BASE+'jobs/oil-gas.html">⛽ Oil & Gas / Energy</a>'+
          '<a href="'+BASE+'index.html?sector=Finance+%26+Banking">💳 Finance & Banking</a>'+
          '<a href="'+BASE+'index.html?sector=IT+%26+Technology">💻 IT & Technology</a>'+
        '</div>'+
      '</div>'+
    '</li>'+
    '<li><a href="'+BASE+'blog.html" class="ez-lnk">Career insights</a></li>'+
    '<li>'+
      '<button class="ez-lnk" id="dd2-btn">Resources <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>'+
      '<div class="ez-dd" id="dd2">'+
        '<div class="ez-dc">'+
          '<h4>Career tools</h4>'+
          '<a href="'+BASE+'salary-guide.html">💰 GCC Salary guide 2026</a>'+
          '<a href="'+BASE+'resources/cv-tips.html">📄 CV writing for GCC</a>'+
          '<a href="'+BASE+'resources/iqama-guide.html">🪪 Iqama transfer guide</a>'+
          '<a href="'+BASE+'resources/labour-laws.html">⚖️ GCC labour laws</a>'+
        '</div>'+
      '</div>'+
    '</li>'+
    '<li><a href="'+BASE+'post-job.html" class="ez-lnk">Post a job</a></li>'+
    '<li><a href="'+BASE+'about.html" class="ez-lnk">About</a></li>'+
  '</ul>'+
  '<div class="ez-right">'+
    ((function(){
      try{
        if(localStorage.getItem('ez_lang')==='ar'){
          return '<button class="ez-link-plain" id="ez-lang-reset" title="Switch to English">English</button>';
        }
      }catch(e){}
      return '';
    })())+
    authHTML+
    '<button class="ez-ham" id="ez-ham" aria-label="Open menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>'+
  '</div>'+
'</div>'+
'<div class="ez-drawer" id="ez-drawer">'+
  '<div class="ez-dbg" id="ez-dbg"></div>'+
  '<div class="ez-dp">'+
    '<button class="ez-dclose" id="ez-dclose">✕</button>'+
    '<div class="ez-dlogo">Ez<span>Workers</span></div>'+
    '<div class="ez-dsec"><h4>Jobs by country</h4>'+
      '<a href="'+BASE+'jobs/saudi-arabia.html">🇸🇦 Saudi Arabia</a>'+
      '<a href="'+BASE+'jobs/uae.html">🇦🇪 UAE</a>'+
      '<a href="'+BASE+'jobs/qatar.html">🇶🇦 Qatar</a>'+
      '<a href="'+BASE+'jobs/kuwait.html">🇰🇼 Kuwait</a>'+
      '<a href="'+BASE+'jobs/bahrain.html">🇧🇭 Bahrain</a>'+
      '<a href="'+BASE+'jobs/oman.html">🇴🇲 Oman</a>'+
    '</div>'+
    '<div class="ez-dsec"><h4>Jobs by sector</h4>'+
      '<a href="'+BASE+'jobs/procurement.html">Procurement & Supply Chain</a>'+
      '<a href="'+BASE+'jobs/construction.html">Construction & Infrastructure</a>'+
      '<a href="'+BASE+'jobs/engineering.html">Engineering & Technical</a>'+
      '<a href="'+BASE+'jobs/oil-gas.html">Oil & Gas / Energy</a>'+
    '</div>'+
    '<div class="ez-dsec"><h4>Resources</h4>'+
      '<a href="'+BASE+'salary-guide.html">💰 Salary guide 2026</a>'+
      '<a href="'+BASE+'resources/cv-tips.html">📄 CV writing tips</a>'+
      '<a href="'+BASE+'resources/iqama-guide.html">🪪 Iqama transfer guide</a>'+
      '<a href="'+BASE+'blog.html">Career insights</a>'+
      '<a href="'+BASE+'about.html">About EzWorkers</a>'+
      '<a href="https://www.linkedin.com/company/ezworkers" target="_blank" rel="noopener">LinkedIn</a>'+
    '</div>'+
    '<div class="ez-dauth">'+
      (loggedIn && prof
        ? '<a href="'+BASE+(prof.role==='employer'?'employer-dashboard.html':'dashboard.html')+'" style="display:block;text-align:center;padding:.75rem;background:#1A6FC4;color:#fff;border-radius:10px;font-weight:600;text-decoration:none">My dashboard</a>'
        : '<a href="'+BASE+'login.html" style="display:block;text-align:center;padding:.75rem;background:#f8fafc;border:1px solid #e2e8f0;color:#374151;border-radius:10px;font-weight:600;text-decoration:none">Sign in</a>'+
          '<a href="'+BASE+'register.html" style="display:block;text-align:center;padding:.75rem;background:#F47B2B;color:#fff;border-radius:10px;font-weight:600;text-decoration:none">Register free</a>'
      )+
    '</div>'+
  '</div>'+
'</div>';

// Dropdown toggle
function mkDD(btnId, ddId) {
  var btn=document.getElementById(btnId), dd=document.getElementById(ddId);
  if(!btn||!dd)return;
  btn.addEventListener('click',function(e){
    e.stopPropagation();
    var open=dd.classList.contains('open');
    document.querySelectorAll('.ez-dd').forEach(function(d){d.classList.remove('open');});
    document.querySelectorAll('.ez-lnk').forEach(function(b){b.classList.remove('open');});
    if(!open){dd.classList.add('open');btn.classList.add('open');}
  });
}
mkDD('dd1-btn','dd1');

// Emergency language reset — clears stuck Arabic preference from pages
// that have no Arabic content (everything except index/blog/article)
var langResetBtn = document.getElementById('ez-lang-reset');
if(langResetBtn){
  langResetBtn.addEventListener('click', function(){
    try{ localStorage.removeItem('ez_lang'); }catch(e){}
    window.location.reload();
  });
}
mkDD('dd2-btn','dd2');
document.addEventListener('click',function(){
  document.querySelectorAll('.ez-dd').forEach(function(d){d.classList.remove('open');});
  document.querySelectorAll('.ez-lnk').forEach(function(b){b.classList.remove('open');});
});

// Mobile drawer
var ham=document.getElementById('ez-ham'),drawer=document.getElementById('ez-drawer'),dclose=document.getElementById('ez-dclose'),dbg=document.getElementById('ez-dbg');
if(ham)    ham.addEventListener('click',function(){if(drawer)drawer.style.display='block';});
if(dclose) dclose.addEventListener('click',function(){if(drawer)drawer.style.display='none';});
if(dbg)    dbg.addEventListener('click',function(){if(drawer)drawer.style.display='none';});

})();
