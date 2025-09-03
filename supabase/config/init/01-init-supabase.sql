-- Supabase initialization script
-- This script sets up the basic Supabase schema and our RSS Feed Parser schema

-- Enable required extensions
create extension if not exists "uuid-ossp" schema extensions;
create extension if not exists "pgcrypto" schema extensions;
create extension if not exists "pgjwt" schema extensions;

-- Create schemas
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists realtime;
create schema if not exists _realtime;
create schema if not exists graphql;
create schema if not exists graphql_public;
create schema if not exists extensions;

-- Grant usage on schemas
grant usage on schema auth to postgres, anon, authenticated, service_role;
grant usage on schema storage to postgres, anon, authenticated, service_role;
grant usage on schema realtime to postgres, anon, authenticated, service_role;
grant usage on schema extensions to postgres, anon, authenticated, service_role;
grant usage on schema graphql to postgres, anon, authenticated, service_role;
grant usage on schema graphql_public to postgres, anon, authenticated, service_role;

-- Grant all on public schema
grant all on schema public to postgres, anon, authenticated, service_role;

-- Alter default privileges
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- Create supabase roles if they don't exist
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    create role supabase_admin login createrole createdb replication bypassrls;
  end if;
  
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin noinherit createrole login noreplication;
  end if;
  
  if not exists (select 1 from pg_roles where rolname = 'supabase_storage_admin') then
    create role supabase_storage_admin noinherit createrole login noreplication;
  end if;
  
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator noinherit login noreplication;
  end if;
  
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon noinherit nologin noreplication;
  end if;
  
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated noinherit nologin noreplication;
  end if;
  
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role noinherit nologin noreplication bypassrls;
  end if;
end
$$;

-- Grant permissions to roles
grant anon, authenticated, service_role to authenticator;
grant supabase_auth_admin to supabase_admin;
grant supabase_storage_admin to supabase_admin;
grant authenticator to supabase_admin;

-- Set role passwords (using environment variables)
alter role supabase_admin with password 'supabase123';
alter role supabase_auth_admin with password 'supabase123';
alter role supabase_storage_admin with password 'supabase123';
alter role authenticator with password 'supabase123';

-- Create JWT helper functions
create or replace function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

create or replace function auth.role() returns text
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (auth.jwt() ->> 'role')
  )::text
$$;

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (auth.jwt() ->> 'sub')
  )::uuid
$$;

-- RSS Feed Parser Schema
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Feeds table
create table if not exists public.feeds (
    id uuid default uuid_generate_v4() primary key,
    url text not null unique,
    name text not null,
    description text,
    category text default 'Uncategorized',
    active boolean default true,
    last_updated timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create indexes
create index if not exists idx_feeds_active on public.feeds(active);
create index if not exists idx_feeds_category on public.feeds(category);

-- Feed items table
create table if not exists public.feed_items (
    id uuid default uuid_generate_v4() primary key,
    feed_id uuid not null references public.feeds(id) on delete cascade,
    title text not null,
    description text,
    link text not null,
    published timestamptz,
    author text,
    content text,
    images text[] default '{}',
    media_urls text[] default '{}',
    tags text[] default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(feed_id, link)
);

-- Create indexes for feed items
create index if not exists idx_feed_items_feed_id on public.feed_items(feed_id);
create index if not exists idx_feed_items_published on public.feed_items(published desc);
create index if not exists idx_feed_items_created_at on public.feed_items(created_at desc);
create index if not exists idx_feed_items_link on public.feed_items(link);

-- Feed processing logs table
create table if not exists public.feed_processing_logs (
    id uuid default uuid_generate_v4() primary key,
    feed_id uuid references public.feeds(id) on delete cascade,
    status text not null,
    items_processed integer default 0,
    error_message text,
    processing_time_ms integer,
    created_at timestamptz default now()
);

create index if not exists idx_feed_logs_feed_id on public.feed_processing_logs(feed_id);
create index if not exists idx_feed_logs_status on public.feed_processing_logs(status);
create index if not exists idx_feed_logs_created_at on public.feed_processing_logs(created_at desc);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create triggers
drop trigger if exists update_feeds_updated_at on public.feeds;
create trigger update_feeds_updated_at 
    before update on public.feeds 
    for each row 
    execute function update_updated_at_column();

drop trigger if exists update_feed_items_updated_at on public.feed_items;
create trigger update_feed_items_updated_at 
    before update on public.feed_items 
    for each row 
    execute function update_updated_at_column();

-- Views for common queries
create or replace view public.feed_summary as
select 
    f.id,
    f.url,
    f.name,
    f.description,
    f.category,
    f.active,
    f.last_updated,
    f.created_at,
    count(fi.id) as item_count,
    max(fi.published) as latest_item_date
from public.feeds f
left join public.feed_items fi on f.id = fi.feed_id
group by f.id, f.url, f.name, f.description, f.category, f.active, f.last_updated, f.created_at;

create or replace view public.recent_items as
select 
    fi.*,
    f.name as feed_name,
    f.category as feed_category
from public.feed_items fi
join public.feeds f on fi.feed_id = f.id
where fi.created_at >= now() - interval '30 days'
order by fi.published desc, fi.created_at desc;

create or replace view public.dashboard_stats as
select 
    count(distinct f.id) as total_feeds,
    count(distinct case when f.active then f.id end) as active_feeds,
    count(fi.id) as total_items,
    count(case when fi.created_at >= now() - interval '1 day' then fi.id end) as recent_items,
    count(case when fi.created_at >= now() - interval '7 days' then fi.id end) as weekly_items
from public.feeds f
left join public.feed_items fi on f.id = fi.feed_id;

-- Row Level Security (RLS) policies
alter table public.feeds enable row level security;
alter table public.feed_items enable row level security;
alter table public.feed_processing_logs enable row level security;

-- Policies for anon and authenticated users (read-only for now)
create policy "Allow anonymous read access to feeds" on public.feeds
    for select using (true);

create policy "Allow authenticated read access to feed items" on public.feed_items
    for select using (true);

create policy "Allow service role all operations on feeds" on public.feeds
    for all using (auth.role() = 'service_role');

create policy "Allow service role all operations on feed items" on public.feed_items
    for all using (auth.role() = 'service_role');

create policy "Allow service role all operations on processing logs" on public.feed_processing_logs
    for all using (auth.role() = 'service_role');

-- Grant permissions
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- Insert sample data
insert into public.feeds (url, name, description, category) values
('https://feeds.simplecast.com/fPtxrgCC', 'Test Podcast 1', 'Sample podcast feed', 'Podcasts'),
('https://feeds.simplecast.com/pGL9tdkW', 'Test Podcast 2', 'Another sample podcast feed', 'Podcasts'),
('https://cheeseonmycracker.com/feed/', 'Cheese on My Cracker Blog', 'Food blog RSS feed', 'Blogs')
on conflict (url) do nothing;

-- Enable realtime for feeds and feed_items
alter publication supabase_realtime add table public.feeds;
alter publication supabase_realtime add table public.feed_items;