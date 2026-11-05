-- TASK-010: transactional email outbox, editable holiday calendar and delivery controls.

create table public.notification_holidays (
  id uuid primary key default extensions.gen_random_uuid(),
  holiday_date date not null,
  jurisdiction text not null check (jurisdiction in ('national', 'state', 'municipal')),
  region_code text,
  name text not null check (length(trim(name)) > 0),
  enabled boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint notification_holiday_region_consistent check (
    (jurisdiction = 'national' and region_code is null)
    or (jurisdiction in ('state', 'municipal') and region_code is not null and length(trim(region_code)) > 0)
  ),
  unique (holiday_date, jurisdiction, region_code, name)
);
create index notification_holidays_date_enabled_idx
  on public.notification_holidays(holiday_date) where enabled;

create table public.notification_channel_settings (
  channel text primary key check (channel = 'email'),
  enabled boolean not null default false,
  max_messages_per_period integer,
  period_seconds integer,
  monthly_budget_brl numeric(12,2),
  budget_alert_threshold_brl numeric(12,2),
  estimated_unit_cost_brl numeric(12,4),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  retry_base_seconds integer not null default 30 check (retry_base_seconds between 1 and 3600),
  retry_max_seconds integer not null default 3600 check (retry_max_seconds between 1 and 86400),
  metadata_retention_days integer,
  payload_retention_days integer,
  updated_at timestamptz not null default clock_timestamp(),
  constraint notification_settings_limits_positive check (
    (max_messages_per_period is null or max_messages_per_period > 0)
    and (period_seconds is null or period_seconds > 0)
    and (monthly_budget_brl is null or monthly_budget_brl >= 0)
    and (budget_alert_threshold_brl is null or budget_alert_threshold_brl >= 0)
    and (estimated_unit_cost_brl is null or estimated_unit_cost_brl >= 0)
    and (metadata_retention_days is null or metadata_retention_days > 0)
    and (payload_retention_days is null or payload_retention_days > 0)
    and retry_max_seconds >= retry_base_seconds
  ),
  constraint notification_settings_enabled_complete check (
    not enabled or (
      max_messages_per_period is not null
      and period_seconds is not null
      and monthly_budget_brl is not null
      and budget_alert_threshold_brl is not null
      and estimated_unit_cost_brl is not null
      and metadata_retention_days is not null
      and payload_retention_days is not null
      and budget_alert_threshold_brl < monthly_budget_brl
    )
  )
);

create table public.notification_outbox (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null,
  order_item_id uuid,
  order_event_id uuid,
  notification_type text not null check (notification_type in (
    'order_created', 'order_status', 'ready_for_pickup',
    'pickup_reminder_24h', 'pickup_reminder_1h', 'perishable_daily'
  )),
  idempotency_key text not null unique check (length(idempotency_key) between 1 and 200),
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'sending', 'retry_wait', 'sent', 'failed', 'delivery_unknown', 'cancelled'
  )),
  scheduled_at timestamptz not null,
  available_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  lease_token uuid,
  lease_until timestamptz,
  last_error_code text check (last_error_code is null or last_error_code ~ '^[a-z0-9_]{1,80}$'),
  provider_message_id text check (provider_message_id is null or provider_message_id ~ '^[a-zA-Z0-9._:-]{1,200}$'),
  accepted_at timestamptz,
  estimated_cost_brl numeric(12,4),
  metadata_expires_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint notification_outbox_lease_consistent check (
    (status in ('processing', 'sending') and lease_token is not null and lease_until is not null)
    or (status not in ('processing', 'sending') and lease_token is null and lease_until is null)
  ),
  constraint notification_outbox_sent_consistent check (
    (status = 'sent' and accepted_at is not null)
    or (status <> 'sent' and accepted_at is null)
  ),
  constraint notification_outbox_cost_nonnegative check (estimated_cost_brl is null or estimated_cost_brl >= 0)
);
create index notification_outbox_due_idx
  on public.notification_outbox(status, available_at, scheduled_at, created_at);
create index notification_outbox_order_idx on public.notification_outbox(order_id, status);
create index notification_outbox_retention_idx on public.notification_outbox(metadata_expires_at)
  where metadata_expires_at is not null;

create table public.notification_payloads (
  notification_id uuid primary key references public.notification_outbox(id) on delete cascade,
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and (payload - array['order_reference', 'order_status', 'scheduled_pickup_at']) = '{}'::jsonb
  ),
  expires_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create index notification_payloads_expiration_idx on public.notification_payloads(expires_at)
  where expires_at is not null;

create table public.notification_budget_alerts (
  id uuid primary key default extensions.gen_random_uuid(),
  channel text not null check (channel = 'email'),
  period_start date not null,
  estimated_spend_brl numeric(12,2) not null check (estimated_spend_brl >= 0),
  threshold_brl numeric(12,2) not null check (threshold_brl >= 0),
  created_at timestamptz not null default clock_timestamp(),
  unique (channel, period_start)
);

alter table public.notification_holidays enable row level security;
alter table public.notification_channel_settings enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.notification_payloads enable row level security;
alter table public.notification_budget_alerts enable row level security;

revoke all on public.notification_holidays, public.notification_channel_settings,
  public.notification_outbox, public.notification_payloads, public.notification_budget_alerts
  from public, anon, authenticated;
grant all on public.notification_holidays, public.notification_channel_settings,
  public.notification_outbox, public.notification_payloads, public.notification_budget_alerts
  to service_role;

create or replace function public._task010_enqueue_notification(
  p_order_id uuid,
  p_order_item_id uuid,
  p_order_event_id uuid,
  p_type text,
  p_scheduled_at timestamptz,
  p_idempotency_key text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_settings public.notification_channel_settings%rowtype;
begin
  if jsonb_typeof(p_payload) <> 'object'
     or (p_payload - array['order_reference', 'order_status', 'scheduled_pickup_at']) <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'notification_payload_contains_disallowed_data';
  end if;
  select * into v_settings from public.notification_channel_settings where channel = 'email';

  insert into public.notification_outbox (
    order_id, order_item_id, order_event_id, notification_type, idempotency_key,
    scheduled_at, available_at, max_attempts, metadata_expires_at
  ) values (
    p_order_id, p_order_item_id, p_order_event_id, p_type, p_idempotency_key,
    p_scheduled_at, p_scheduled_at, coalesce(v_settings.max_attempts, 5),
    case when v_settings.metadata_retention_days is null then null
      else clock_timestamp() + make_interval(days => v_settings.metadata_retention_days) end
  )
  on conflict (idempotency_key) do update set
    order_item_id = excluded.order_item_id,
    order_event_id = excluded.order_event_id,
    scheduled_at = excluded.scheduled_at,
    available_at = excluded.available_at,
    status = 'pending',
    attempt_count = 0,
    last_error_code = null,
    lease_token = null,
    lease_until = null,
    updated_at = clock_timestamp()
  where public.notification_outbox.status = 'cancelled'
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.notification_outbox where idempotency_key = p_idempotency_key;
  end if;
  if v_id is not null and (select status from public.notification_outbox where id = v_id) = 'pending' then
    insert into public.notification_payloads(notification_id, payload, expires_at)
      values (
        v_id,
        p_payload,
        case when v_settings.payload_retention_days is null then null
          else clock_timestamp() + make_interval(days => v_settings.payload_retention_days) end
      )
      on conflict (notification_id) do update set payload = excluded.payload, expires_at = excluded.expires_at;
  end if;
  return v_id;
end;
$$;

create or replace function public._task010_next_allowed_at(p_candidate timestamptz, p_pickup timestamptz)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_local timestamp without time zone := p_candidate at time zone 'America/Sao_Paulo';
  v_result timestamptz;
  v_attempt integer := 0;
begin
  if p_candidate is null or p_pickup is null then return null; end if;
  while exists (
    select 1 from public.notification_holidays h
    where h.holiday_date = v_local::date and h.enabled
  ) loop
    v_attempt := v_attempt + 1;
    if v_attempt > 366 then
      raise exception using errcode = '22023', message = 'notification_holiday_calendar_range_exceeded';
    end if;
    v_local := (v_local::date + 1) + (v_local::time);
  end loop;
  v_result := v_local at time zone 'America/Sao_Paulo';
  if v_result > p_pickup then return null; end if;
  return v_result;
end;
$$;

create or replace function public._task010_schedule_perishable_reminders(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_pickup_local timestamp without time zone;
  v_date date;
  v_time time without time zone;
  v_schedule timestamptz;
  v_count integer := 0;
  v_scanned integer := 0;
  v_keys text[] := array[]::text[];
  v_key text;
  v_row record;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then return; end if;

  if v_order.scheduled_pickup_at is null or v_order.status <> 'ready_for_pickup'
     or not exists (
       select 1 from public.order_items oi
       where oi.order_id = p_order_id and oi.perishability = 'perishable' and oi.line_status = 'open'
     ) then
    update public.notification_outbox set status = 'cancelled',
      last_error_code = 'perishable_reminder_no_longer_applicable',
      lease_token = null, lease_until = null, updated_at = clock_timestamp()
      where order_id = p_order_id and notification_type = 'perishable_daily'
        and status in ('pending', 'retry_wait', 'processing');
    return;
  end if;

  v_pickup_local := v_order.scheduled_pickup_at at time zone 'America/Sao_Paulo';
  v_date := greatest(v_pickup_local::date, (clock_timestamp() at time zone 'America/Sao_Paulo')::date);
  v_time := v_pickup_local::time;
  while v_count < 3 and v_scanned < 366 loop
    if extract(isodow from v_date) between 1 and 5
       and not exists (
         select 1 from public.notification_holidays h
         where h.holiday_date = v_date and h.enabled
       ) then
      v_schedule := (v_date + v_time) at time zone 'America/Sao_Paulo';
      if v_schedule >= clock_timestamp() then
        v_count := v_count + 1;
        v_key := 'task010:' || p_order_id::text || ':perishable_daily:' || v_date::text;
        v_keys := array_append(v_keys, v_key);
      end if;
    end if;
    v_date := v_date + 1;
    v_scanned := v_scanned + 1;
  end loop;
  if v_count <> 3 then
    raise exception using errcode = '22023', message = 'notification_holiday_calendar_range_exceeded';
  end if;

  update public.notification_outbox set status = 'cancelled',
    last_error_code = 'perishable_reminder_rescheduled',
    lease_token = null, lease_until = null, updated_at = clock_timestamp()
    where order_id = p_order_id and notification_type = 'perishable_daily'
      and status in ('pending', 'retry_wait', 'processing')
      and not (idempotency_key = any(v_keys));

  foreach v_key in array v_keys loop
    v_date := right(v_key, 10)::date;
    v_schedule := (v_date + v_time) at time zone 'America/Sao_Paulo';
    perform public._task010_enqueue_notification(
      p_order_id, null, null, 'perishable_daily', v_schedule, v_key,
      jsonb_build_object(
        'order_reference', v_order.public_reference::text,
        'order_status', v_order.status,
        'scheduled_pickup_at', v_order.scheduled_pickup_at
      )
    );
  end loop;

  for v_row in
    select idempotency_key from public.notification_outbox
    where order_id = p_order_id and notification_type = 'perishable_daily'
      and status in ('pending', 'retry_wait') and idempotency_key = any(v_keys)
  loop
    v_date := right(v_row.idempotency_key, 10)::date;
    v_schedule := (v_date + v_time) at time zone 'America/Sao_Paulo';
    update public.notification_outbox set scheduled_at = v_schedule,
      available_at = case when status = 'pending' then v_schedule else greatest(available_at, v_schedule) end,
      updated_at = clock_timestamp()
      where order_id = p_order_id and notification_type = 'perishable_daily'
        and idempotency_key = v_row.idempotency_key;
  end loop;
end;
$$;

create or replace function public._task010_on_item_classification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.perishability is distinct from old.perishability then
    perform public._task010_schedule_perishable_reminders(new.order_id);
  end if;
  return new;
end;
$$;

create trigger task010_item_classification_notification
  after update of perishability on public.order_items
  for each row execute function public._task010_on_item_classification();

create or replace function public._task010_on_order_status_perishable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    perform public._task010_schedule_perishable_reminders(new.id);
  end if;
  return new;
end;
$$;

create trigger task010_order_status_perishable_notification
  after update of status on public.orders
  for each row execute function public._task010_on_order_status_perishable();

create or replace function public._task010_on_order_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_type text;
  v_payload jsonb;
begin
  select * into v_order from public.orders where id = new.order_id;
  if not found then return new; end if;

  if new.event_type = 'cancelled' or new.to_status = 'cancelled' then
    update public.notification_outbox set status = 'cancelled', last_error_code = 'order_cancelled',
      lease_token = null, lease_until = null, updated_at = clock_timestamp()
      where order_id = new.order_id and status in ('pending', 'retry_wait', 'processing');
    return new;
  end if;

  if new.event_type = 'created' then
    v_type := 'order_created';
  elsif new.event_type in ('payment_confirmed', 'status_changed', 'inspection_approved', 'pickup_scheduled') then
    v_type := case when coalesce(new.to_status, v_order.status) = 'ready_for_pickup'
      then 'ready_for_pickup' else 'order_status' end;
  else
    return new;
  end if;

  v_payload := jsonb_build_object(
    'order_reference', v_order.public_reference::text,
    'order_status', coalesce(new.to_status, v_order.status),
    'scheduled_pickup_at', v_order.scheduled_pickup_at
  );
  perform public._task010_enqueue_notification(
    v_order.id, null, new.id, v_type, clock_timestamp(),
    'task010:event:' || new.id::text || ':' || v_type, v_payload
  );
  return new;
end;
$$;

create trigger task010_order_event_notification
  after insert on public.order_events
  for each row execute function public._task010_on_order_event();

create or replace function public._task010_on_pickup_schedule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text;
  v_hours integer;
  v_local_date date;
  v_candidate timestamptz;
  v_allowed timestamptz;
begin
  if new.scheduled_pickup_at is not distinct from old.scheduled_pickup_at then return new; end if;
  update public.notification_outbox set status = 'cancelled', last_error_code = 'pickup_schedule_changed',
    lease_token = null, lease_until = null, updated_at = clock_timestamp()
    where order_id = new.id and notification_type in ('pickup_reminder_24h', 'pickup_reminder_1h', 'perishable_daily')
      and status in ('pending', 'retry_wait', 'processing');
  if new.scheduled_pickup_at is null or new.status in ('cancelled', 'picked_up', 'resolved') then return new; end if;

  foreach v_type in array array['pickup_reminder_24h', 'pickup_reminder_1h'] loop
    v_hours := case when v_type = 'pickup_reminder_24h' then 24 else 1 end;
    v_candidate := new.scheduled_pickup_at - make_interval(hours => v_hours);
    v_allowed := public._task010_next_allowed_at(v_candidate, new.scheduled_pickup_at);
    if v_allowed is null then continue; end if;
    v_local_date := (v_allowed at time zone 'America/Sao_Paulo')::date;
    perform public._task010_enqueue_notification(
      new.id, null, null, v_type, v_allowed,
      'task010:' || new.id::text || ':' || v_type || ':' || v_local_date::text,
      jsonb_build_object(
        'order_reference', new.public_reference::text,
        'order_status', new.status,
        'scheduled_pickup_at', new.scheduled_pickup_at
      )
    );
  end loop;
  perform public._task010_schedule_perishable_reminders(new.id);
  return new;
end;
$$;

create trigger task010_pickup_schedule_notification
  after update of scheduled_pickup_at on public.orders
  for each row execute function public._task010_on_pickup_schedule();

create or replace function public._task010_cancel_order_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('cancelled', 'picked_up', 'resolved') and old.status is distinct from new.status then
    update public.notification_outbox set status = 'cancelled', last_error_code = 'order_no_longer_actionable',
      lease_token = null, lease_until = null, updated_at = clock_timestamp()
      where order_id = new.id and status in ('pending', 'retry_wait', 'processing');
  end if;
  return new;
end;
$$;

create trigger task010_cancel_order_notifications
  after update of status on public.orders
  for each row execute function public._task010_cancel_order_notifications();

create or replace function public._task010_cancel_item_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.line_status is distinct from old.line_status and new.line_status <> 'open' then
    if not exists (
      select 1 from public.order_items oi
      where oi.order_id = new.order_id and oi.perishability = 'perishable' and oi.line_status = 'open'
    ) then
      update public.notification_outbox set status = 'cancelled', last_error_code = 'order_item_no_longer_open',
        lease_token = null, lease_until = null, updated_at = clock_timestamp()
        where order_id = new.order_id and notification_type = 'perishable_daily'
          and status in ('pending', 'retry_wait', 'processing');
    end if;
  end if;
  return new;
end;
$$;

create trigger task010_cancel_item_notifications
  after update of line_status on public.order_items
  for each row execute function public._task010_cancel_item_notifications();

create or replace function public._task010_refresh_pickup_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_hours integer;
  v_allowed timestamptz;
  v_local_date date;
  v_key text;
begin
  for v_row in
    select n.id, n.order_id, n.notification_type, n.idempotency_key, n.status, n.available_at,
      o.scheduled_pickup_at
    from public.notification_outbox n
    join public.orders o on o.id = n.order_id
    where n.notification_type in ('pickup_reminder_24h', 'pickup_reminder_1h')
      and n.status in ('pending', 'retry_wait')
  loop
    if v_row.scheduled_pickup_at is null then
      update public.notification_outbox set status = 'cancelled', last_error_code = 'pickup_schedule_missing',
        updated_at = clock_timestamp() where id = v_row.id;
      continue;
    end if;
    v_hours := case when v_row.notification_type = 'pickup_reminder_24h' then 24 else 1 end;
    v_allowed := public._task010_next_allowed_at(
      v_row.scheduled_pickup_at - make_interval(hours => v_hours), v_row.scheduled_pickup_at
    );
    if v_allowed is null then
      update public.notification_outbox set status = 'cancelled', last_error_code = 'reminder_obsolete_after_pickup',
        updated_at = clock_timestamp() where id = v_row.id;
      continue;
    end if;
    v_local_date := (v_allowed at time zone 'America/Sao_Paulo')::date;
    v_key := 'task010:' || v_row.order_id::text || ':' || v_row.notification_type || ':' || v_local_date::text;
    if v_key <> v_row.idempotency_key and exists (
      select 1 from public.notification_outbox existing
      where existing.idempotency_key = v_key and existing.id <> v_row.id
    ) then
      update public.notification_outbox set status = 'cancelled', last_error_code = 'duplicate_reminder_grouped',
        updated_at = clock_timestamp() where id = v_row.id;
      continue;
    end if;
    update public.notification_outbox set idempotency_key = v_key, scheduled_at = v_allowed,
      available_at = case when v_row.status = 'pending' then v_allowed else greatest(v_row.available_at, v_allowed) end,
      updated_at = clock_timestamp()
      where id = v_row.id;
  end loop;
end;
$$;

create or replace function public._task010_refresh_perishable_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  for v_order_id in
    select distinct n.order_id
    from public.notification_outbox n
    where n.notification_type = 'perishable_daily' and n.status in ('pending', 'retry_wait')
    union
    select distinct o.id
    from public.orders o
    where o.status = 'ready_for_pickup' and o.scheduled_pickup_at is not null
      and exists (select 1 from public.order_items oi
        where oi.order_id = o.id and oi.perishability = 'perishable' and oi.line_status = 'open')
  loop
    perform public._task010_schedule_perishable_reminders(v_order_id);
  end loop;
end;
$$;

create or replace function public.notification_channel_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.notification_channel_settings%rowtype;
  v_month date := date_trunc('month', clock_timestamp())::date;
  v_spend numeric(12,2) := 0;
  v_alert boolean := false;
  v_rows integer := 0;
begin
  select * into v_settings from public.notification_channel_settings where channel = 'email';
  if not found or not v_settings.enabled then
    return jsonb_build_object('enabled', false, 'can_send', false, 'budget_alert', false);
  end if;
  select coalesce(sum(estimated_cost_brl), 0) into v_spend
    from public.notification_outbox
    where status in ('sent', 'delivery_unknown') and coalesce(accepted_at, updated_at) >= v_month::timestamptz;
  if v_spend >= v_settings.budget_alert_threshold_brl then
    insert into public.notification_budget_alerts(channel, period_start, estimated_spend_brl, threshold_brl)
      values ('email', v_month, v_spend, v_settings.budget_alert_threshold_brl)
      on conflict (channel, period_start) do nothing;
    get diagnostics v_rows = row_count;
    v_alert := v_rows > 0;
  end if;
  return jsonb_build_object(
    'enabled', true,
    'can_send', v_spend < v_settings.monthly_budget_brl,
    'budget_alert', v_alert,
    'estimated_spend_brl', v_spend,
    'monthly_budget_brl', v_settings.monthly_budget_brl
  );
end;
$$;

create or replace function public.claim_notification_outbox(p_limit integer default 20)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.notification_channel_settings%rowtype;
  v_now timestamptz := clock_timestamp();
  v_count bigint;
  v_spend numeric(12,2);
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'invalid_notification_claim_limit';
  end if;
  select * into v_settings from public.notification_channel_settings where channel = 'email' and enabled;
  if not found then return; end if;
  if v_settings.max_messages_per_period is null or v_settings.period_seconds is null
     or v_settings.monthly_budget_brl is null or v_settings.estimated_unit_cost_brl is null
     or v_settings.metadata_retention_days is null or v_settings.payload_retention_days is null then
    return;
  end if;
  perform public._task010_refresh_pickup_reminders();
  perform pg_advisory_xact_lock(hashtextextended('task010:notification_rate:email', 0));

  update public.notification_outbox set status = 'failed', lease_token = null, lease_until = null,
    last_error_code = 'notification_retry_exhausted', updated_at = v_now
    where status = 'processing' and lease_until <= v_now and attempt_count >= max_attempts;
  update public.notification_outbox set status = 'retry_wait', lease_token = null, lease_until = null,
    available_at = v_now, last_error_code = 'processing_lease_expired', updated_at = v_now
    where status = 'processing' and lease_until <= v_now and attempt_count < max_attempts;
  update public.notification_outbox set status = 'delivery_unknown', lease_token = null, lease_until = null,
    last_error_code = 'delivery_outcome_unknown', updated_at = v_now
    where status = 'sending' and lease_until <= v_now;
  update public.notification_outbox n set status = 'failed', last_error_code = 'notification_payload_expired',
    updated_at = v_now
    where n.status in ('pending', 'retry_wait') and exists (
      select 1 from public.notification_payloads p
      where p.notification_id = n.id and p.expires_at is not null and p.expires_at <= v_now
    );
  update public.notification_outbox n set status = 'failed', last_error_code = 'notification_payload_missing',
    updated_at = v_now
    where n.status in ('pending', 'retry_wait') and not exists (
      select 1 from public.notification_payloads p where p.notification_id = n.id
    );

  perform public._task010_refresh_perishable_reminders();
  select count(*) into v_count from public.notification_outbox
    where (status = 'sent' and accepted_at >= v_now - make_interval(secs => v_settings.period_seconds))
       or (status in ('processing', 'sending') and updated_at >= v_now - make_interval(secs => v_settings.period_seconds));
  select coalesce(sum(estimated_cost_brl), 0) into v_spend from public.notification_outbox
    where status in ('sent', 'delivery_unknown', 'processing', 'sending')
      and coalesce(accepted_at, updated_at) >= date_trunc('month', v_now);
  if v_count >= v_settings.max_messages_per_period or v_spend >= v_settings.monthly_budget_brl then return; end if;

  v_count := least(v_settings.max_messages_per_period - v_count,
    case when v_settings.estimated_unit_cost_brl = 0 then p_limit
      else floor((v_settings.monthly_budget_brl - v_spend) / v_settings.estimated_unit_cost_brl)::bigint end);
  if v_count <= 0 then return; end if;

  return query
  with candidates as (
    select n.id
      from public.notification_outbox n
      join public.orders o on o.id = n.order_id
      join public.notification_payloads p on p.notification_id = n.id
      where n.status in ('pending', 'retry_wait')
        and n.available_at <= v_now and n.scheduled_at <= v_now
        and (n.metadata_expires_at is null or n.metadata_expires_at > v_now)
        and (p.expires_at is null or p.expires_at > v_now)
        and o.status <> 'cancelled'
        and (o.status not in ('picked_up', 'resolved') or n.notification_type = 'order_status')
      order by n.available_at, n.created_at
      for update of n skip locked
      limit least(p_limit, v_count)
  )
  update public.notification_outbox n set status = 'processing', attempt_count = attempt_count + 1,
    estimated_cost_brl = v_settings.estimated_unit_cost_brl,
    lease_token = extensions.gen_random_uuid(), lease_until = v_now + interval '2 minutes', updated_at = v_now
    from candidates c where n.id = c.id
  returning n.*;
end;
$$;

create or replace function public.begin_notification_dispatch(p_id uuid, p_lease_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_notification public.notification_outbox%rowtype;
  v_order public.orders%rowtype;
  v_line_status text;
begin
  select order_id into v_order_id from public.notification_outbox where id = p_id;
  if not found then return false; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found or v_order.status = 'cancelled' then
    update public.notification_outbox set status = 'cancelled', lease_token = null, lease_until = null,
      last_error_code = 'order_no_longer_actionable', updated_at = clock_timestamp()
      where id = p_id and status = 'processing';
    return false;
  end if;
  select * into v_notification from public.notification_outbox where id = p_id for update;
  if not found or v_notification.status <> 'processing' or v_notification.lease_token <> p_lease_token
     or v_notification.lease_until <= clock_timestamp() then return false; end if;
  if v_order.status in ('picked_up', 'resolved') and (
    v_notification.notification_type <> 'order_status'
    or not exists (
      select 1 from public.notification_payloads p
      where p.notification_id = p_id and p.payload ->> 'order_status' = v_order.status
    )
  ) then
    update public.notification_outbox set status = 'cancelled', lease_token = null, lease_until = null,
      last_error_code = 'order_no_longer_actionable', updated_at = clock_timestamp() where id = p_id;
    return false;
  end if;
  if v_notification.order_item_id is not null then
    select line_status into v_line_status from public.order_items where id = v_notification.order_item_id for update;
    if not found or v_line_status <> 'open' then
      update public.notification_outbox set status = 'cancelled', lease_token = null, lease_until = null,
        last_error_code = 'order_item_no_longer_open', updated_at = clock_timestamp() where id = p_id;
      return false;
    end if;
  end if;
  if v_notification.notification_type = 'perishable_daily' and not exists (
    select 1 from public.order_items oi
    where oi.order_id = v_notification.order_id and oi.perishability = 'perishable' and oi.line_status = 'open'
  ) then
    update public.notification_outbox set status = 'cancelled', lease_token = null, lease_until = null,
      last_error_code = 'order_item_no_longer_open', updated_at = clock_timestamp() where id = p_id;
    return false;
  end if;
  update public.notification_outbox set status = 'sending', updated_at = clock_timestamp() where id = p_id;
  return true;
end;
$$;

create or replace function public.finish_notification_dispatch(
  p_id uuid,
  p_lease_token uuid,
  p_outcome text,
  p_error_code text default null,
  p_provider_message_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification public.notification_outbox%rowtype;
  v_settings public.notification_channel_settings%rowtype;
  v_delay integer;
begin
  select * into v_notification from public.notification_outbox where id = p_id for update;
  if not found or v_notification.status <> 'sending' or v_notification.lease_token <> p_lease_token then return false; end if;
  select * into v_settings from public.notification_channel_settings where channel = 'email';

  if p_outcome = 'accepted' then
    update public.notification_outbox set status = 'sent', accepted_at = clock_timestamp(),
      estimated_cost_brl = v_settings.estimated_unit_cost_brl, provider_message_id = p_provider_message_id,
      lease_token = null, lease_until = null, last_error_code = null, updated_at = clock_timestamp()
      where id = p_id;
  elsif p_outcome = 'unknown' then
    update public.notification_outbox set status = 'delivery_unknown', estimated_cost_brl = v_settings.estimated_unit_cost_brl,
      last_error_code = 'delivery_outcome_unknown',
      lease_token = null, lease_until = null, updated_at = clock_timestamp() where id = p_id;
  elsif p_outcome = 'permanent' then
    update public.notification_outbox set status = 'failed',
      last_error_code = coalesce(p_error_code, 'notification_permanent_failure'),
      lease_token = null, lease_until = null, updated_at = clock_timestamp() where id = p_id;
  elsif p_outcome = 'retryable' then
    if v_notification.attempt_count >= v_notification.max_attempts then
      update public.notification_outbox set status = 'failed',
        last_error_code = coalesce(p_error_code, 'notification_retry_exhausted'),
        lease_token = null, lease_until = null, updated_at = clock_timestamp() where id = p_id;
    else
      v_delay := least(coalesce(v_settings.retry_max_seconds, 3600),
        coalesce(v_settings.retry_base_seconds, 30) * power(2, greatest(v_notification.attempt_count - 1, 0))::integer);
      update public.notification_outbox set status = 'retry_wait', available_at = clock_timestamp() + make_interval(secs => v_delay),
        last_error_code = coalesce(p_error_code, 'notification_temporary_failure'),
        lease_token = null, lease_until = null, updated_at = clock_timestamp() where id = p_id;
    end if;
  else
    raise exception using errcode = '22023', message = 'invalid_notification_dispatch_outcome';
  end if;
  return true;
end;
$$;

create or replace function public.purge_notification_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.notification_channel_settings%rowtype;
  v_payloads integer;
  v_metadata integer;
begin
  select * into v_settings from public.notification_channel_settings where channel = 'email';
  if found and v_settings.metadata_retention_days is not null then
    update public.notification_outbox set metadata_expires_at = created_at + make_interval(days => v_settings.metadata_retention_days)
      where metadata_expires_at is null;
    update public.notification_payloads set expires_at = created_at + make_interval(days => v_settings.payload_retention_days)
      where expires_at is null and v_settings.payload_retention_days is not null;
    delete from public.notification_budget_alerts
      where created_at <= clock_timestamp() - make_interval(days => v_settings.metadata_retention_days);
  end if;
  update public.notification_outbox set status = 'failed', last_error_code = 'notification_payload_expired',
    lease_token = null, lease_until = null, updated_at = clock_timestamp()
    where status in ('pending', 'retry_wait', 'processing') and exists (
      select 1 from public.notification_payloads p
      where p.notification_id = notification_outbox.id and p.expires_at is not null and p.expires_at <= clock_timestamp()
    );
  update public.notification_outbox set status = 'delivery_unknown', last_error_code = 'delivery_outcome_unknown',
    lease_token = null, lease_until = null, updated_at = clock_timestamp()
    where status = 'sending' and exists (
      select 1 from public.notification_payloads p
      where p.notification_id = notification_outbox.id and p.expires_at is not null and p.expires_at <= clock_timestamp()
    );
  delete from public.notification_payloads where expires_at is not null and expires_at <= clock_timestamp();
  get diagnostics v_payloads = row_count;
  delete from public.notification_outbox where metadata_expires_at is not null and metadata_expires_at <= clock_timestamp()
    and status in ('sent', 'failed', 'delivery_unknown', 'cancelled');
  get diagnostics v_metadata = row_count;
  return jsonb_build_object('payloads_discarded', v_payloads, 'metadata_discarded', v_metadata);
end;
$$;

revoke all on function public._task010_enqueue_notification(uuid, uuid, uuid, text, timestamptz, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public._task010_next_allowed_at(timestamptz, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public._task010_on_order_event() from public, anon, authenticated, service_role;
revoke all on function public._task010_on_pickup_schedule() from public, anon, authenticated, service_role;
revoke all on function public._task010_cancel_order_notifications() from public, anon, authenticated, service_role;
revoke all on function public._task010_cancel_item_notifications() from public, anon, authenticated, service_role;
revoke all on function public._task010_schedule_perishable_reminders(uuid) from public, anon, authenticated, service_role;
revoke all on function public._task010_on_item_classification() from public, anon, authenticated, service_role;
revoke all on function public._task010_on_order_status_perishable() from public, anon, authenticated, service_role;
revoke all on function public._task010_refresh_pickup_reminders() from public, anon, authenticated, service_role;
revoke all on function public._task010_refresh_perishable_reminders() from public, anon, authenticated, service_role;
revoke all on function public.notification_channel_status() from public, anon, authenticated;
revoke all on function public.claim_notification_outbox(integer) from public, anon, authenticated;
revoke all on function public.begin_notification_dispatch(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_notification_dispatch(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.purge_notification_data() from public, anon, authenticated;
grant execute on function public.notification_channel_status() to service_role;
grant execute on function public.claim_notification_outbox(integer) to service_role;
grant execute on function public.begin_notification_dispatch(uuid, uuid) to service_role;
grant execute on function public.finish_notification_dispatch(uuid, uuid, text, text, text) to service_role;
grant execute on function public.purge_notification_data() to service_role;
