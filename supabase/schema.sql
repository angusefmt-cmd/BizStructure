-- Enable UUID extension (already enabled on most Supabase projects)
create extension if not exists "uuid-ossp";

-- Create the analyses table
create table public.analyses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  business_name text,
  industry text,
  result_json jsonb not null,
  created_at timestamptz default now() not null
);

-- Enable Row Level Security (RLS) — users can only see their own data
alter table public.analyses enable row level security;

-- Policy: users can insert their own analyses
create policy "Users can insert own analyses"
  on public.analyses for insert
  to authenticated
  with check (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
  );

-- Policy: users can read their own analyses
create policy "Users can read own analyses"
  on public.analyses for select
  to authenticated
  using (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
  );

-- Policy: users can delete their own analyses
create policy "Users can delete own analyses"
  on public.analyses for delete
  to authenticated
  using (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
  );

-- Index for faster queries by user
create index on public.analyses (user_id, created_at desc);