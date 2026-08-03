-- ============================================================
-- Migration: Create instagram_connections table
-- For the Instagram Login (Business Login) OAuth flow
-- ============================================================

create table if not exists instagram_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade unique,
  ig_user_id       text not null,          -- Instagram's numeric user ID
  ig_username      text,                   -- Instagram username
  access_token     text not null,          -- Long-lived token (60 days), encrypted at rest via Supabase
  token_expires_at timestamptz not null,   -- When the current token expires
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Index for cron job: find tokens expiring soon
create index if not exists idx_ig_connections_token_expiry
  on instagram_connections (token_expires_at);

-- ── Row Level Security ──────────────────────────────────────
alter table instagram_connections enable row level security;

-- Users can read their own connection (non-sensitive columns only via column-level grants,
-- but Supabase RLS operates at row level — the admin client bypasses RLS for token reads)
create policy "users_read_own_connection"
  on instagram_connections for select
  using (auth.uid() = user_id);

-- Users can delete their own connection (disconnect)
create policy "users_delete_own_connection"
  on instagram_connections for delete
  using (auth.uid() = user_id);

-- INSERT and UPDATE are only allowed via the service role (bypasses RLS).
-- No explicit insert/update policies for anon/authenticated roles.
