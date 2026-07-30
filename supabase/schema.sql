-- ============================================================
-- FashionAI Virtual Try-On — Supabase Schema
-- Run this entire script in the Supabase SQL Editor
-- ============================================================

-- ── Profiles (extends built-in auth.users) ──────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  credits       integer default 10,
  plan_type     text default 'free',
  created_at    timestamptz default now()
);

-- ── Garment catalog ─────────────────────────────────────────
create table if not exists garments (
  id            uuid primary key default gen_random_uuid(),
  image_url     text not null,
  description   text not null,
  category      text,
  hashtags      text,
  created_at    timestamptz default now()
);

-- ── Model bank (for autonomous Instagram demo) ───────────────
create table if not exists model_sets (
  id      uuid primary key default gen_random_uuid(),
  name    text not null,
  angles  jsonb not null  -- {"front": "url", "left_side": "url", ...}
);

-- ── Try-on jobs (one row per user request) ───────────────────
create table if not exists tryon_jobs (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade,
  human_image_url       text not null,
  garment_image_url     text not null,
  garment_description   text,
  status                text not null default 'queued',  -- queued | processing | done | error
  output_image_url      text,
  mask_image_url        text,
  error_message         text,
  created_at            timestamptz default now(),
  completed_at          timestamptz
);

-- ── Row Level Security ───────────────────────────────────────
alter table profiles    enable row level security;
alter table tryon_jobs  enable row level security;

create policy "users manage own profile"
  on profiles for all
  using (auth.uid() = id);

create policy "users manage own jobs"
  on tryon_jobs for all
  using (auth.uid() = user_id);

create policy "garments are public read"
  on garments for select
  using (true);

-- ── Enable Realtime on tryon_jobs ────────────────────────────
-- (so the browser gets live status updates without polling)
alter publication supabase_realtime add table tryon_jobs;

-- ── Instagram Credentials ────────────────────────────────────
create table if not exists instagram_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade unique,
  ig_username   text not null,
  ig_password   text not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table instagram_credentials enable row level security;

create policy "users manage own instagram credentials"
  on instagram_credentials for all
  using (auth.uid() = user_id);
