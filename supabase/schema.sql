-- =====================================================================
-- AsifOps Knowledge Base — Database Schema (Supabase / PostgreSQL)
-- Run this in the Supabase SQL Editor (or `supabase db push`) once,
-- against a fresh project. Safe to re-run thanks to IF NOT EXISTS guards
-- where practical.
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- fuzzy / trigram search

-- ---------------------------------------------------------------------
-- users  (single-user mode now, multi-user-ready schema)
-- ---------------------------------------------------------------------
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  github_id       text unique not null,
  github_username text unique not null,
  name            text,
  email           text,
  avatar_url      text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- tags  (shared vocabulary across articles, commands, runbooks, projects)
-- ---------------------------------------------------------------------
create table if not exists tags (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------
create table if not exists articles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete set null,
  title       text not null,
  description text,
  category    text,
  content     text not null default '',           -- markdown
  view_count  integer not null default 0,
  search_vector tsvector,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists article_tags (
  article_id uuid references articles(id) on delete cascade,
  tag_id     uuid references tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

-- ---------------------------------------------------------------------
-- commands  (command library)
-- ---------------------------------------------------------------------
create table if not exists commands (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete set null,
  name            text not null,
  description     text,
  category        text,
  command         text not null,                  -- the actual shell command
  example_output  text,
  view_count      integer not null default 0,
  search_vector   tsvector,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists command_tags (
  command_id uuid references commands(id) on delete cascade,
  tag_id     uuid references tags(id) on delete cascade,
  primary key (command_id, tag_id)
);

-- ---------------------------------------------------------------------
-- runbooks  (troubleshooting runbooks)
-- ---------------------------------------------------------------------
create table if not exists runbooks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references users(id) on delete set null,
  title              text not null,
  problem            text,
  symptoms           text,
  root_cause         text,
  diagnosis_steps    text,
  resolution_steps   text,
  verification_steps text,
  prevention         text,
  search_vector      tsvector,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists runbook_tags (
  runbook_id uuid references runbooks(id) on delete cascade,
  tag_id     uuid references tags(id) on delete cascade,
  primary key (runbook_id, tag_id)
);

-- ---------------------------------------------------------------------
-- projects  (infrastructure documentation)
-- ---------------------------------------------------------------------
create table if not exists projects (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references users(id) on delete set null,
  name                  text not null,
  environment           text,                       -- prod / staging / dev / lab
  architecture_diagram  text,                        -- image URL or markdown/mermaid
  servers               jsonb not null default '[]', -- [{name, ip, role, os}, ...]
  services              jsonb not null default '[]', -- [{name, port, notes}, ...]
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists project_tags (
  project_id uuid references projects(id) on delete cascade,
  tag_id     uuid references tags(id) on delete cascade,
  primary key (project_id, tag_id)
);

-- ---------------------------------------------------------------------
-- vpn_inventory
-- ---------------------------------------------------------------------
create table if not exists vpn_inventory (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users(id) on delete set null,
  tunnel_name    text not null,
  peer_ip        text,
  local_subnet   text,
  remote_subnet  text,
  ike_version    text,                 -- IKEv1 / IKEv2
  status         text not null default 'unknown', -- up / down / unknown
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ssl_certificates
-- ---------------------------------------------------------------------
create table if not exists ssl_certificates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete set null,
  domain      text not null,
  expiry_date date not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- favorites  (polymorphic-ish: one row per favorited item, typed)
-- ---------------------------------------------------------------------
create table if not exists favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  item_type   text not null check (item_type in ('article','command','runbook','project')),
  item_id     uuid not null,
  created_at  timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

-- =====================================================================
-- Full text search: tsvector columns + triggers + GIN indexes
-- =====================================================================
create or replace function articles_search_vector_update() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.content, '')), 'C');
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_articles_search_vector on articles;
create trigger trg_articles_search_vector
  before insert or update on articles
  for each row execute function articles_search_vector_update();

create or replace function commands_search_vector_update() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.command, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.example_output, '')), 'D');
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_commands_search_vector on commands;
create trigger trg_commands_search_vector
  before insert or update on commands
  for each row execute function commands_search_vector_update();

create or replace function runbooks_search_vector_update() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.problem, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.symptoms, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.root_cause, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.resolution_steps, '')), 'C');
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_runbooks_search_vector on runbooks;
create trigger trg_runbooks_search_vector
  before insert or update on runbooks
  for each row execute function runbooks_search_vector_update();

-- generic updated_at bump for tables without a search vector
create or replace function bump_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at before update on projects
  for each row execute function bump_updated_at();

drop trigger if exists trg_vpn_updated_at on vpn_inventory;
create trigger trg_vpn_updated_at before update on vpn_inventory
  for each row execute function bump_updated_at();

drop trigger if exists trg_ssl_updated_at on ssl_certificates;
create trigger trg_ssl_updated_at before update on ssl_certificates
  for each row execute function bump_updated_at();

create index if not exists idx_articles_search on articles using gin (search_vector);
create index if not exists idx_commands_search on commands using gin (search_vector);
create index if not exists idx_runbooks_search on runbooks using gin (search_vector);
create index if not exists idx_articles_title_trgm on articles using gin (title gin_trgm_ops);
create index if not exists idx_commands_name_trgm on commands using gin (name gin_trgm_ops);
create index if not exists idx_articles_category on articles (category);
create index if not exists idx_commands_category on commands (category);
create index if not exists idx_ssl_expiry on ssl_certificates (expiry_date);
create index if not exists idx_favorites_user on favorites (user_id, item_type);

-- =====================================================================
-- View counters
-- =====================================================================
create or replace function increment_article_view(row_id uuid) returns void as $$
  update articles set view_count = view_count + 1 where id = row_id;
$$ language sql;

create or replace function increment_command_view(row_id uuid) returns void as $$
  update commands set view_count = view_count + 1 where id = row_id;
$$ language sql;

-- =====================================================================
-- Row Level Security — locked down by default.
-- The app talks to Supabase using the SERVICE ROLE key from trusted
-- server-side API routes only (never exposed to the browser), so RLS
-- mainly protects against the anon/public key being used directly.
-- =====================================================================
alter table users enable row level security;
alter table articles enable row level security;
alter table article_tags enable row level security;
alter table commands enable row level security;
alter table command_tags enable row level security;
alter table runbooks enable row level security;
alter table runbook_tags enable row level security;
alter table projects enable row level security;
alter table project_tags enable row level security;
alter table vpn_inventory enable row level security;
alter table ssl_certificates enable row level security;
alter table favorites enable row level security;
alter table tags enable row level security;

-- No public policies are created: the anon key gets zero access.
-- All reads/writes happen via the service role key on the server.
