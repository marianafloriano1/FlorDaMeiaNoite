create extension if not exists pgcrypto with schema extensions;

create table public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name varchar(200) not null,
  cpf char(11) not null unique,
  email varchar(320) not null,
  phone_e164 varchar(20) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_profile_name_nonempty check (length(trim(full_name)) > 0),
  constraint customer_profile_phone_e164 check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);

create table public.employee_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name varchar(200) not null,
  age integer not null check (age between 0 and 150),
  phone_e164 varchar(20) not null,
  email varchar(320) not null,
  cpf char(11) not null unique,
  hire_date date not null,
  contract_object_key text,
  account_status varchar(16) not null default 'active' check (account_status in ('active', 'frozen')),
  frozen_at timestamptz,
  delete_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_profile_phone_e164 check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint employee_profile_freeze_consistent check (
    (account_status = 'active' and frozen_at is null and delete_after is null)
    or (account_status = 'frozen' and frozen_at is not null and delete_after is not null)
  )
);

create table public.admin_auth_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mfa_verified_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index admin_auth_sessions_user_idx on public.admin_auth_sessions(user_id);

create table public.identity_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_uid uuid not null references auth.users(id),
  target_uid uuid references auth.users(id) on delete set null,
  action varchar(80) not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index identity_audit_events_target_idx on public.identity_audit_events(target_uid);

alter table public.customer_profiles enable row level security;
alter table public.employee_profiles enable row level security;
alter table public.admin_auth_sessions enable row level security;
alter table public.identity_audit_events enable row level security;

create policy customer_profiles_read_self on public.customer_profiles
  for select to authenticated using ((select auth.uid()) = id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('employee-contracts', 'employee-contracts', false, 10485760,
        array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = false;

create or replace function public.health_check()
returns boolean
language sql
security definer
set search_path = ''
as $$ select true $$;
revoke all on function public.health_check() from public, anon, authenticated;
grant execute on function public.health_check() to service_role;
