create table public.report_export_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_uid uuid not null references auth.users(id) on delete restrict,
  period_kind text not null check (period_kind in ('week', 'month')),
  date_basis text not null check (date_basis in ('created', 'paid')),
  period_start timestamptz not null,
  period_end timestamptz not null check (period_end > period_start),
  export_format text not null check (export_format in ('xlsx', 'pdf')),
  created_at timestamptz not null default clock_timestamp()
);

create index report_export_audit_actor_created_idx
  on public.report_export_audit(actor_uid, created_at desc);

alter table public.report_export_audit enable row level security;
revoke all on public.report_export_audit from anon, authenticated;
grant select, insert on public.report_export_audit to service_role;
