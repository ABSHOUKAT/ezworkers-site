// EzWorkers Analytics — Google Analytics 4 + custom event tracking
// Replace GA_MEASUREMENT_ID with your actual ID from Google Analytics
// Format: G-XXXXXXXXXX

var GA_ID = 'G-XXXXXXXXXX'; // <-- REPLACE THIS with your GA4 Measurement ID

// ── Load GA4 ──────────────────────────────────────────────────────────────────
(function(){
  if(!GA_ID || GA_ID === 'G-XXXXXXXXXX') {
    console.info('[EzWorkers] GA4 not configured. Replace GA_MEASUREMENT_ID in js/analytics.js');
    window.gtag = function(){};
    return;
  }
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', GA_ID, {
    send_page_view: true,
    anonymize_ip: true,
  });
})();

// ── Custom event helpers ──────────────────────────────────────────────────────

// Call this when a user applies to a job
function trackApplication(jobTitle, company, country, sector) {
  if(typeof gtag === 'undefined') return;
  gtag('event', 'apply_job', {
    event_category:  'engagement',
    event_label:     jobTitle,
    job_company:     company || '',
    job_country:     country || '',
    job_sector:      sector  || '',
  });
}

// Call this when a CV is downloaded
function trackCVDownload(format) {
  if(typeof gtag === 'undefined') return;
  gtag('event', 'cv_download', {
    event_category: 'engagement',
    event_label:    format || 'html',
  });
}

// Call this when a job page is viewed
function trackJobView(jobTitle, company, country, sector) {
  if(typeof gtag === 'undefined') return;
  gtag('event', 'view_job', {
    event_category: 'engagement',
    event_label:    jobTitle,
    job_company:    company || '',
    job_country:    country || '',
    job_sector:     sector  || '',
  });
}

// Call this when a user registers
function trackRegister(role) {
  if(typeof gtag === 'undefined') return;
  gtag('event', 'sign_up', {
    event_category: 'acquisition',
    method:         'email',
    user_role:      role || 'jobseeker',
  });
}

// Call this when a job is saved
function trackSaveJob(jobTitle) {
  if(typeof gtag === 'undefined') return;
  gtag('event', 'save_job', {
    event_category: 'engagement',
    event_label:    jobTitle,
  });
}

// Call this when a job alert is created
function trackAlertCreated(keyword, country) {
  if(typeof gtag === 'undefined') return;
  gtag('event', 'create_alert', {
    event_category: 'engagement',
    alert_keyword:  keyword || '',
    alert_country:  country || '',
  });
}

// Call this when search is performed
function trackSearch(query, country, sector) {
  if(typeof gtag === 'undefined') return;
  gtag('event', 'search', {
    search_term:    query   || '',
    search_country: country || '',
    search_sector:  sector  || '',
  });
}

// Call this when an employer posts a job
function trackJobPosted(sector, country) {
  if(typeof gtag === 'undefined') return;
  gtag('event', 'post_job', {
    event_category: 'employer',
    job_sector:     sector  || '',
    job_country:    country || '',
  });
}
