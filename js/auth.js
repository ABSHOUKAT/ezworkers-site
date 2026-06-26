// EzWorkers — auth.js
// Shared authentication helper. Include after main.js on every page.

const SUPABASE_URL  = 'https://wxltwnyuhiejavzichfd.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHR3bnl1aGllamF2emljaGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjk4NDYsImV4cCI6MjA5NzgwNTg0Nn0.8PH3VTz2u6rRcu-LqZYGMDbNIdj9YldNBQJ1irTCtI4';

// ── Supabase Auth API helpers ────────────────────────────────────────────────

async function sbRequest(path, options = {}) {
  const session = getSession();
  const headers = {
    'apikey': SUPABASE_ANON,
    'Content-Type': 'application/json',
    ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : { 'Authorization': `Bearer ${SUPABASE_ANON}` }),
    ...options.headers,
  };
  const r = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  return r;
}

// ── Session management (stored in localStorage) ──────────────────────────────

function saveSession(session) {
  localStorage.setItem('ez_session', JSON.stringify(session));
}

function getSession() {
  try {
    const raw = localStorage.getItem('ez_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Check if token is expired
    if (session.expires_at && Date.now() / 1000 > session.expires_at) {
      localStorage.removeItem('ez_session');
      return null;
    }
    return session;
  } catch { return null; }
}

function clearSession() {
  localStorage.removeItem('ez_session');
  localStorage.removeItem('ez_profile');
}

function getProfile() {
  try {
    const raw = localStorage.getItem('ez_profile');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveProfile(profile) {
  localStorage.setItem('ez_profile', JSON.stringify(profile));
}

function isLoggedIn() {
  return !!getSession();
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html?next=' + encodeURIComponent(window.location.href);
  }
}

// ── Sign up with email + password ────────────────────────────────────────────
async function signUp(email, password, role) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data: { role } }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.msg || data.error_description || 'Sign up failed');
  if (data.session) {
    saveSession(data.session);
    // Create profile record
    await createProfile(data.user.id, role, email);
  }
  return data;
}

// ── Sign in with email + password ────────────────────────────────────────────
async function signIn(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error_description || data.msg || 'Sign in failed');
  saveSession(data);
  await loadAndSaveProfile(data.user?.id);
  return data;
}

// ── Magic link ───────────────────────────────────────────────────────────────
async function sendMagicLink(email) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/magiclink`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) {
    const data = await r.json();
    throw new Error(data.msg || 'Could not send magic link');
  }
  return true;
}

// ── Sign out ─────────────────────────────────────────────────────────────────
async function signOut() {
  const session = getSession();
  if (session) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${session.access_token}` },
    }).catch(() => {});
  }
  clearSession();
  window.location.href = 'index.html';
}

// ── Profile helpers ──────────────────────────────────────────────────────────
async function createProfile(userId, role, email) {
  const r = await sbRequest('/rest/v1/profiles', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=ignore-duplicates' },
    body: JSON.stringify({ id: userId, role, full_name: email.split('@')[0] }),
  });
  return r.ok;
}

async function loadAndSaveProfile(userId) {
  if (!userId) return null;
  const r = await sbRequest(`/rest/v1/profiles?id=eq.${userId}&select=*&limit=1`);
  const data = await r.json();
  if (data && data[0]) {
    saveProfile(data[0]);
    return data[0];
  }
  return null;
}

async function updateProfile(fields) {
  const session = getSession();
  if (!session) return false;
  const userId = session.user?.id;
  const r = await sbRequest(`/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
  if (r.ok) {
    const profile = { ...getProfile(), ...fields };
    saveProfile(profile);
  }
  return r.ok;
}

// ── Application helpers ──────────────────────────────────────────────────────
async function applyToJob(jobId, coverNote) {
  const session = getSession();
  if (!session) return { error: 'Not logged in' };
  const profile = getProfile();
  const r = await sbRequest('/rest/v1/applications', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({
      job_id:       jobId,
      applicant_id: profile.id,
      cover_note:   coverNote,
      cv_url:       profile.cv_url || null,
    }),
  });
  const data = await r.json();
  if (!r.ok) return { error: data.message || 'Application failed' };
  return { success: true, data };
}

async function getMyApplications() {
  const r = await sbRequest(
    '/rest/v1/applications?select=*,jobs(title,company,country,sector,posted_at)&order=applied_at.desc'
  );
  return r.ok ? r.json() : [];
}

// ── Saved jobs helpers ───────────────────────────────────────────────────────
async function saveJob(jobId) {
  const profile = getProfile();
  if (!profile) return false;
  const r = await sbRequest('/rest/v1/saved_jobs', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=ignore-duplicates' },
    body: JSON.stringify({ user_id: profile.id, job_id: jobId }),
  });
  return r.ok;
}

async function unsaveJob(jobId) {
  const profile = getProfile();
  if (!profile) return false;
  const r = await sbRequest(
    `/rest/v1/saved_jobs?user_id=eq.${profile.id}&job_id=eq.${jobId}`,
    { method: 'DELETE' }
  );
  return r.ok;
}

async function getMySavedJobs() {
  const r = await sbRequest(
    '/rest/v1/saved_jobs?select=*,jobs(id,title,company,country,sector,job_type,posted_at)&order=saved_at.desc'
  );
  return r.ok ? r.json() : [];
}

async function isJobSaved(jobId) {
  const profile = getProfile();
  if (!profile) return false;
  const r = await sbRequest(
    `/rest/v1/saved_jobs?user_id=eq.${profile.id}&job_id=eq.${jobId}&select=id&limit=1`
  );
  const data = await r.json();
  return Array.isArray(data) && data.length > 0;
}

// ── Handle magic link token in URL (called on page load) ────────────────────
async function handleMagicLinkCallback() {
  const hash   = window.location.hash;
  const params = new URLSearchParams(hash.replace('#', ''));
  const access_token  = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const expires_in    = params.get('expires_in');

  if (!access_token) return false;

  // Fetch user info
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${access_token}` },
  });
  const user = await r.json();

  const session = {
    access_token,
    refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + parseInt(expires_in || 3600),
    user,
  };
  saveSession(session);

  // Ensure profile exists
  await loadAndSaveProfile(user.id);
  const profile = getProfile();
  if (!profile) {
    await createProfile(user.id, 'jobseeker', user.email);
    await loadAndSaveProfile(user.id);
  }

  // Clean URL and redirect
  window.location.href = 'dashboard.html';
  return true;
}

// ── Update navbar based on auth state ────────────────────────────────────────
function updateNavAuth() {
  const loggedIn = isLoggedIn();
  const profile  = getProfile();

  const actionsEl = document.querySelector('.nav-actions');
  if (!actionsEl) return;

  if (loggedIn && profile) {
    const dashLink = profile.role === 'employer' ? 'employer-dashboard.html' : 'dashboard.html';
    actionsEl.innerHTML = `
      <button class="btn-lang" id="lang-toggle" onclick="toggleLang()">عربي</button>
      <a href="${dashLink}" class="btn-post" style="background:var(--blue)">My dashboard</a>
      <button onclick="signOut()" class="btn-lang" style="color:var(--muted)">Sign out</button>`;
  } else {
    actionsEl.innerHTML = `
      <button class="btn-lang" id="lang-toggle" onclick="toggleLang()">عربي</button>
      <a href="login.html" class="btn-lang">Sign in</a>
      <a href="post-job.html" class="btn-post">Post a job</a>`;
  }
  // Reapply lang toggle text
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = (localStorage.getItem('ez_lang') || 'en') === 'en' ? 'عربي' : 'English';
}
