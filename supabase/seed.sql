-- Local-only test sink for Supabase Auth SMS hooks. This seed is not a migration
-- and must never be applied to a hosted/production project.
create table if not exists public.local_sms_captures (
  id bigint generated always as identity primary key,
  otp text not null,
  created_at timestamptz not null default now()
);

alter table public.local_sms_captures enable row level security;
revoke all on table public.local_sms_captures from public, anon, authenticated;
grant select, delete on table public.local_sms_captures to service_role;

create or replace function public.capture_local_sms_otp(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.local_sms_captures (otp)
  values (event -> 'sms' ->> 'otp');
  return '{}'::jsonb;
end;
$$;

revoke all on function public.capture_local_sms_otp(jsonb) from public, anon, authenticated;
grant execute on function public.capture_local_sms_otp(jsonb) to supabase_auth_admin;
