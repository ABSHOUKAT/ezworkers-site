-- EzWorkers: jobs table
-- Run this in Supabase SQL Editor (one time)

create table if not exists jobs (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  company       text,
  location      text,
  country       text,
  sector        text,
  job_type      text,
  salary        text,
  description   text,
  apply_url     text,
  source        text,
  url_hash      text unique,
  posted_at     timestamptz default now(),
  created_at    timestamptz default now(),
  is_active     boolean default true
);

-- Indexes for fast filtering
create index if not exists idx_jobs_country  on jobs(country);
create index if not exists idx_jobs_sector   on jobs(sector);
create index if not exists idx_jobs_source   on jobs(source);
create index if not exists idx_jobs_posted   on jobs(posted_at desc);
create index if not exists idx_jobs_active   on jobs(is_active);
create index if not exists idx_jobs_hash     on jobs(url_hash);

-- Allow public read (anon key can read jobs)
alter table jobs enable row level security;

create policy "Public can read active jobs"
  on jobs for select
  using (is_active = true);

-- Service role can insert/update/delete (used by GitHub Actions)
create policy "Service role full access"
  on jobs for all
  using (auth.role() = 'service_role');
