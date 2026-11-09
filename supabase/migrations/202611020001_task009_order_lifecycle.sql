-- TASK-009: line-level pickup, cancellation, perishability and inventory returns.

alter table public.orders
  drop constraint orders_status_check,
  add constraint orders_status_check check (status in (
    'awaiting_payment', 'preparing', 'ready_for_pickup', 'picked_up', 'cancelled', 'resolved'
  )),
  add column scheduled_pickup_at timestamptz,
  add column pickup_scheduled_by uuid references auth.users(id) on delete restrict,
  add column pickup_scheduled_at timestamptz,
  add constraint orders_pickup_schedule_consistent check (
    (scheduled_pickup_at is null and pickup_scheduled_by is null and pickup_scheduled_at is null)
    or (scheduled_pickup_at is not null and pickup_scheduled_by is not null and pickup_scheduled_at is not null)
  );

alter table public.order_items
  add column perishability text check (perishability in ('perishable', 'non_perishable')),
  add column classified_by uuid references auth.users(id) on delete restrict,
  add column classified_at timestamptz,
  add column line_status text not null default 'open'
    check (line_status in ('open', 'picked_up', 'cancelled', 'discarded')),
  add column quantity_used integer not null default 0,
  add column resolved_by uuid references auth.users(id) on delete set null,
  add column resolved_at timestamptz,
  add constraint order_items_classification_consistent check (
    (perishability is null and classified_by is null and classified_at is null)
    or (perishability is not null and classified_by is not null and classified_at is not null)
  ),
  add constraint order_items_usage_within_quantity check (quantity_used between 0 and quantity),
  add constraint order_items_lifecycle_consistent check (
    (line_status = 'open' and resolved_at is null and quantity_used = 0)
    or (line_status in ('picked_up', 'discarded') and resolved_at is not null and quantity_used = 0)
    or (line_status = 'cancelled' and resolved_at is not null)
  );

-- Preserve the terminal outcomes of orders that existed before this additive migration.
update public.order_items oi
set line_status = case o.status
      when 'picked_up' then 'picked_up'
      when 'cancelled' then 'cancelled'
      else 'open'
    end,
    resolved_at = case when o.status in ('picked_up', 'cancelled') then o.updated_at else null end
from public.orders o
where o.id = oi.order_id;

create index order_items_order_lifecycle_idx on public.order_items(order_id, line_status);

alter table public.inventory_ledger
  add column order_id uuid references public.orders(id) on delete restrict,
  add column order_item_id uuid references public.order_items(id) on delete restrict,
  drop constraint inventory_ledger_event_type_check,
  add constraint inventory_ledger_event_type_check
    check (event_type in ('reserved', 'expired_release', 'cancelled_release', 'stock_adjustment', 'order_return')),
  drop constraint inventory_ledger_delta_matches_event,
  add constraint inventory_ledger_delta_matches_event check (
    (event_type = 'reserved' and quantity_delta < 0)
    or (event_type in ('expired_release', 'cancelled_release', 'order_return') and quantity_delta > 0)
    or (event_type = 'stock_adjustment'
      and quantity_before is not null and quantity_before >= 0
      and quantity_after is not null and quantity_after >= 0
      and quantity_delta = quantity_after - quantity_before)
  ),
  drop constraint inventory_ledger_task007_fields_consistent,
  add constraint inventory_ledger_task007_fields_consistent check (
    (event_type = 'stock_adjustment'
      and reservation_id is null and actor_uid is not null
      and quantity_before is not null and quantity_after is not null
      and nullif(btrim(reason), '') is not null and char_length(btrim(reason)) <= 400
      and order_id is null and order_item_id is null)
    or (event_type = 'order_return'
      and reservation_id is null and actor_uid is not null
      and quantity_before is not null and quantity_after is not null
      and quantity_delta = quantity_after - quantity_before and quantity_delta > 0
      and reason in ('order_cancellation', 'nonperishable_deadline')
      and order_id is not null and order_item_id is not null)
    or (event_type not in ('stock_adjustment', 'order_return')
      and reservation_id is not null and actor_uid is null
      and quantity_before is null and quantity_after is null and reason is null
      and order_id is null and order_item_id is null)
  );

create unique index inventory_ledger_order_return_once_idx
  on public.inventory_ledger(order_item_id) where event_type = 'order_return';

alter table public.order_events
  drop constraint order_events_event_type_check,
  add constraint order_events_event_type_check check (event_type in (
    'created', 'inspection_recorded', 'inspection_approved', 'payment_confirmed',
    'status_changed', 'cancelled', 'coupon_applied', 'pickup_scheduled', 'item_classified',
    'item_cancelled', 'item_discarded', 'cancellation_agreement_confirmed', 'issue_recorded'
  ));

create unique index order_events_issue_idempotency_idx
  on public.order_events(order_id, (event_data ->> 'idempotency_key'))
  where event_type = 'issue_recorded';

create or replace function public._task009_add_business_days(p_start date, p_days integer)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_date date := p_start;
  v_count integer := 0;
begin
  if p_start is null or p_days < 0 or p_days > 366 then
    raise exception using errcode = '22023', message = 'invalid_business_day_window';
  end if;
  while v_count < p_days loop
    v_date := v_date + 1;
    if extract(isodow from v_date) between 1 and 6 then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_date;
end;
$$;

create or replace function public._task009_require_admin()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_session uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
begin
  if v_actor is null or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception using errcode = '42501', message = 'admin_role_required';
  end if;
  if v_session is null or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2'
     or not exists (
       select 1 from public.admin_auth_sessions s
       where s.session_id = v_session and s.user_id = v_actor and s.revoked_at is null
         and s.mfa_verified_at >= clock_timestamp() - interval '5 minutes'
         and s.last_activity_at > clock_timestamp() - interval '1 hour'
     ) then
    raise exception using errcode = '42501', message = 'admin_mfa_required';
  end if;
  perform public._require_order_admin_step_up();
  return v_actor;
end;
$$;

create or replace function public._task009_refresh_order_status(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_open integer;
  v_picked_up integer;
  v_cancelled integer;
  v_target text;
begin
  select count(*), count(*) filter (where line_status = 'open'),
      count(*) filter (where line_status = 'picked_up'),
      count(*) filter (where line_status = 'cancelled')
    into v_total, v_open, v_picked_up, v_cancelled
  from public.order_items where order_id = p_order_id;
  if v_total = 0 then
    raise exception using errcode = 'P0001', message = 'order_items_missing';
  end if;
  if v_open > 0 then
    select status into v_target from public.orders where id = p_order_id;
    return v_target;
  end if;
  if v_picked_up = v_total then
    v_target := 'picked_up';
  elsif v_cancelled = v_total then
    v_target := 'cancelled';
  else
    v_target := 'resolved';
  end if;
  update public.orders
    set status = v_target,
        cancellation_reason = case
          when v_target = 'cancelled' then coalesce(cancellation_reason, 'admin_cancelled')
          else null
        end,
        updated_at = clock_timestamp()
    where id = p_order_id;
  return v_target;
end;
$$;

create or replace function public.set_order_pickup_schedule(p_order_id uuid, p_pickup_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_order public.orders%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  v_actor := public._task009_require_admin();
  if p_pickup_at is null then
    raise exception using errcode = '22023', message = 'invalid_pickup_schedule';
  end if;
  if p_pickup_at <= v_now then
    raise exception using errcode = '22023', message = 'pickup_schedule_must_be_future';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'order_not_found'; end if;
  if v_order.status in ('picked_up', 'cancelled', 'resolved') then
    raise exception using errcode = 'P0001', message = 'order_not_schedulable';
  end if;
  if v_order.scheduled_pickup_at = p_pickup_at then
    return jsonb_build_object('order_id', v_order.id, 'scheduled_pickup_at', v_order.scheduled_pickup_at,
      'idempotent_replay', true);
  end if;
  update public.orders set scheduled_pickup_at = p_pickup_at,
      pickup_scheduled_by = v_actor, pickup_scheduled_at = v_now, updated_at = v_now
    where id = p_order_id returning * into v_order;
  insert into public.order_events(order_id, event_type, actor_uid, event_data)
    values (p_order_id, 'pickup_scheduled', v_actor,
      jsonb_build_object('scheduled_pickup_at', v_order.scheduled_pickup_at));
  return jsonb_build_object('order_id', v_order.id, 'scheduled_pickup_at', v_order.scheduled_pickup_at,
    'idempotent_replay', false);
end;
$$;

create or replace function public.classify_order_item(
  p_order_id uuid, p_order_item_id uuid, p_perishable boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_value text;
  v_now timestamptz := clock_timestamp();
begin
  v_actor := public._task009_require_admin();
  v_value := case when p_perishable then 'perishable' else 'non_perishable' end;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'order_not_found'; end if;
  select * into v_item from public.order_items
    where id = p_order_item_id and order_id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'order_item_not_found'; end if;
  if v_item.line_status <> 'open' then
    raise exception using errcode = 'P0001', message = 'order_item_not_classifiable';
  end if;
  if v_item.perishability = v_value then
    return jsonb_build_object('order_item_id', v_item.id, 'perishability', v_value,
      'idempotent_replay', true);
  end if;
  update public.order_items set perishability = v_value,
      classified_by = v_actor, classified_at = v_now
    where id = v_item.id;
  insert into public.order_events(order_id, event_type, actor_uid, event_data)
    values (p_order_id, 'item_classified', v_actor,
      jsonb_build_object('order_item_id', v_item.id, 'perishability', v_value));
  return jsonb_build_object('order_item_id', v_item.id, 'perishability', v_value,
    'idempotent_replay', false);
end;
$$;

create or replace function public._task009_record_stock_return(
  p_order_id uuid, p_item public.order_items, p_actor uuid, p_quantity integer, p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before integer;
  v_after integer;
begin
  if p_quantity <= 0 then return; end if;
  select stock_quantity into v_before from public.catalog_products
    where id = p_item.product_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'order_product_missing'; end if;
  if v_before > 2147483647 - p_quantity then
    raise exception using errcode = '22003', message = 'stock_return_overflow';
  end if;
  v_after := v_before + p_quantity;
  update public.catalog_products set stock_quantity = v_after, updated_at = clock_timestamp()
    where id = p_item.product_id;
  insert into public.inventory_ledger(
    product_id, reservation_id, event_type, quantity_delta, actor_uid,
    quantity_before, quantity_after, reason, order_id, order_item_id
  ) values (
    p_item.product_id, null, 'order_return', p_quantity, p_actor,
    v_before, v_after, p_reason, p_order_id, p_item.id
  );
end;
$$;

create or replace function public.cancel_order(
  p_order_id uuid,
  p_used_quantities jsonb default '[]'::jsonb,
  p_customer_agreement_confirmed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_order public.orders%rowtype;
  v_reservation public.reservations%rowtype;
  v_item public.order_items%rowtype;
  v_used integer;
  v_returned integer;
  v_open_count integer;
  v_input_count integer;
  v_status text;
  v_now timestamptz := clock_timestamp();
  v_results jsonb := '[]'::jsonb;
begin
  v_actor := public._task009_require_admin();
  if p_used_quantities is null or jsonb_typeof(p_used_quantities) <> 'array' then
    raise exception using errcode = '22023', message = 'invalid_order_item_usage';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'order_not_found'; end if;

  if exists (select 1 from public.order_events e where e.order_id = p_order_id
      and e.event_type = 'cancelled' and e.event_data ->> 'reason' = 'admin_cancelled') then
    return jsonb_build_object('order_id', v_order.id, 'status', v_order.status,
      'idempotent_replay', true);
  end if;

  if v_order.status = 'awaiting_payment' and v_order.payment_confirmed_at is null then
    if jsonb_array_length(p_used_quantities) <> 0 then
      raise exception using errcode = '22023', message = 'invalid_order_item_usage';
    end if;
    select * into v_reservation from public.reservations
      where id = v_order.reservation_id for update;
    if not found or v_reservation.status <> 'active' or v_reservation.expires_at <= v_now then
      raise exception using errcode = 'P0001', message = 'order_not_cancellable';
    end if;
    if not public._transition_cart_reservation(v_reservation.id, 'cancelled') then
      raise exception using errcode = 'P0001', message = 'reservation_not_cancellable';
    end if;
    update public.order_items set line_status = 'cancelled', resolved_by = v_actor,
        resolved_at = v_now, quantity_used = 0
      where order_id = p_order_id and line_status = 'open';
    update public.orders set status = 'cancelled', cancellation_reason = 'admin_cancelled', updated_at = v_now
      where id = p_order_id returning * into v_order;
    insert into public.order_events(order_id, event_type, from_status, to_status, actor_uid, event_data)
      values (p_order_id, 'cancelled', 'awaiting_payment', 'cancelled', v_actor,
        jsonb_build_object('reason', 'admin_cancelled', 'customer_agreement_confirmed', false));
    return jsonb_build_object('order_id', v_order.id, 'status', v_order.status,
      'idempotent_replay', false, 'returned_items', v_results);
  end if;

  if v_order.payment_confirmed_at is null
     or v_order.status not in ('awaiting_payment', 'preparing', 'ready_for_pickup') then
    raise exception using errcode = 'P0001', message = 'order_not_cancellable';
  end if;
  if p_customer_agreement_confirmed is distinct from true then
    raise exception using errcode = 'P0001', message = 'customer_agreement_required';
  end if;
  select count(*) into v_open_count from public.order_items
    where order_id = p_order_id and line_status = 'open';
  select count(*) into v_input_count
  from jsonb_to_recordset(p_used_quantities) as x(order_item_id uuid, quantity_used integer);
  if v_open_count = 0 or v_input_count <> v_open_count
     or exists (
       select 1 from jsonb_to_recordset(p_used_quantities) as x(order_item_id uuid, quantity_used integer)
       group by x.order_item_id having count(*) <> 1
     )
     or exists (
       select 1 from public.order_items oi where oi.order_id = p_order_id and oi.line_status = 'open'
         and oi.id not in (select x.order_item_id from jsonb_to_recordset(p_used_quantities)
           as x(order_item_id uuid, quantity_used integer))
     ) then
    raise exception using errcode = '22023', message = 'invalid_order_item_usage';
  end if;

  insert into public.order_events(order_id, event_type, actor_uid, event_data)
    values (p_order_id, 'cancellation_agreement_confirmed', v_actor,
      jsonb_build_object('customer_agreement_confirmed', true));

  for v_item in select * from public.order_items
      where order_id = p_order_id and line_status = 'open' order by id for update
  loop
    select x.quantity_used into v_used
    from jsonb_to_recordset(p_used_quantities) as x(order_item_id uuid, quantity_used integer)
    where x.order_item_id = v_item.id;
    if v_used is null or v_used < 0 or v_used > v_item.quantity then
      raise exception using errcode = '22023', message = 'invalid_order_item_usage';
    end if;
    v_returned := v_item.quantity - v_used;
    perform public._task009_record_stock_return(p_order_id, v_item, v_actor, v_returned,
      'order_cancellation');
    update public.order_items set line_status = 'cancelled', quantity_used = v_used,
        resolved_by = v_actor, resolved_at = v_now
      where id = v_item.id;
    insert into public.order_events(order_id, event_type, actor_uid, event_data)
      values (p_order_id, 'item_cancelled', v_actor,
        jsonb_build_object('order_item_id', v_item.id, 'quantity_used', v_used,
          'quantity_returned', v_returned, 'reason', 'admin_cancelled'));
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'order_item_id', v_item.id, 'quantity_used', v_used, 'quantity_returned', v_returned));
  end loop;
  insert into public.order_events(order_id, event_type, from_status, actor_uid, event_data)
    values (p_order_id, 'cancelled', v_order.status, v_actor,
      jsonb_build_object('reason', 'admin_cancelled', 'customer_agreement_confirmed', true));
  v_status := public._task009_refresh_order_status(p_order_id);
  update public.orders set cancellation_reason = case when v_status = 'cancelled'
      then 'admin_cancelled' else null end, updated_at = v_now where id = p_order_id;
  return jsonb_build_object('order_id', p_order_id, 'status', v_status,
    'idempotent_replay', false, 'returned_items', v_results);
end;
$$;

create or replace function public.cancel_nonperishable_order_item(
  p_order_id uuid, p_order_item_id uuid, p_quantity_used integer,
  p_customer_agreement_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_pickup_date date;
  v_returned integer;
  v_status text;
  v_now timestamptz := clock_timestamp();
begin
  v_actor := public._task009_require_admin();
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'order_not_found'; end if;
  select * into v_item from public.order_items
    where id = p_order_item_id and order_id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'order_item_not_found'; end if;
  if v_item.line_status = 'cancelled' and exists (
    select 1 from public.order_events e where e.order_id = p_order_id and e.event_type = 'item_cancelled'
      and e.event_data ->> 'order_item_id' = p_order_item_id::text
  ) then
    return jsonb_build_object('order_id', p_order_id, 'order_item_id', p_order_item_id,
      'status', v_order.status, 'idempotent_replay', true);
  end if;
  if v_order.payment_confirmed_at is null
     or v_order.status not in ('awaiting_payment', 'preparing', 'ready_for_pickup')
     or v_item.line_status <> 'open' or v_item.perishability <> 'non_perishable' then
    raise exception using errcode = 'P0001', message = 'order_item_not_cancellable';
  end if;
  if v_order.scheduled_pickup_at is null then
    raise exception using errcode = 'P0001', message = 'order_schedule_required';
  end if;
  v_pickup_date := (v_order.scheduled_pickup_at at time zone 'America/Sao_Paulo')::date;
  if (v_now at time zone 'America/Sao_Paulo')::date <= v_pickup_date + 7 then
    raise exception using errcode = 'P0001', message = 'nonperishable_deadline_not_reached';
  end if;
  if p_customer_agreement_confirmed is distinct from true then
    raise exception using errcode = 'P0001', message = 'customer_agreement_required';
  end if;
  if p_quantity_used is null or p_quantity_used < 0 or p_quantity_used > v_item.quantity then
    raise exception using errcode = '22023', message = 'invalid_order_item_usage';
  end if;
  insert into public.order_events(order_id, event_type, actor_uid, event_data)
    values (p_order_id, 'cancellation_agreement_confirmed', v_actor,
      jsonb_build_object('customer_agreement_confirmed', true, 'order_item_id', p_order_item_id));
  v_returned := v_item.quantity - p_quantity_used;
  perform public._task009_record_stock_return(p_order_id, v_item, v_actor, v_returned,
    'nonperishable_deadline');
  update public.order_items set line_status = 'cancelled', quantity_used = p_quantity_used,
      resolved_by = v_actor, resolved_at = v_now
    where id = p_order_item_id;
  insert into public.order_events(order_id, event_type, actor_uid, event_data)
    values (p_order_id, 'item_cancelled', v_actor,
      jsonb_build_object('order_item_id', p_order_item_id, 'quantity_used', p_quantity_used,
        'quantity_returned', v_returned, 'reason', 'nonperishable_deadline'));
  v_status := public._task009_refresh_order_status(p_order_id);
  return jsonb_build_object('order_id', p_order_id, 'order_item_id', p_order_item_id,
    'status', v_status, 'quantity_returned', v_returned, 'idempotent_replay', false);
end;
$$;

create or replace function public.discard_perishable_order_item(p_order_id uuid, p_order_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_pickup_date date;
  v_deadline date;
  v_status text;
  v_now timestamptz := clock_timestamp();
begin
  v_actor := public._task009_require_admin();
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'order_not_found'; end if;
  select * into v_item from public.order_items
    where id = p_order_item_id and order_id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'order_item_not_found'; end if;
  if v_item.line_status = 'discarded' then
    return jsonb_build_object('order_id', p_order_id, 'order_item_id', p_order_item_id,
      'status', v_order.status, 'idempotent_replay', true);
  end if;
  if v_order.payment_confirmed_at is null
     or v_order.status not in ('awaiting_payment', 'preparing', 'ready_for_pickup')
     or v_item.line_status <> 'open'
     or v_item.perishability <> 'perishable' then
    raise exception using errcode = 'P0001', message = 'order_item_not_discardable';
  end if;
  if v_order.scheduled_pickup_at is null then
    raise exception using errcode = 'P0001', message = 'order_schedule_required';
  end if;
  v_pickup_date := (v_order.scheduled_pickup_at at time zone 'America/Sao_Paulo')::date;
  v_deadline := public._task009_add_business_days(v_pickup_date, 3);
  if (v_now at time zone 'America/Sao_Paulo')::date <= v_deadline then
    raise exception using errcode = 'P0001', message = 'perishable_deadline_not_reached';
  end if;
  update public.order_items set line_status = 'discarded', resolved_by = v_actor, resolved_at = v_now
    where id = p_order_item_id;
  insert into public.order_events(order_id, event_type, actor_uid, event_data)
    values (p_order_id, 'item_discarded', v_actor,
      jsonb_build_object('order_item_id', p_order_item_id, 'deadline', v_deadline,
        'stock_returned', false));
  v_status := public._task009_refresh_order_status(p_order_id);
  return jsonb_build_object('order_id', p_order_id, 'order_item_id', p_order_item_id,
    'status', v_status, 'deadline', v_deadline, 'idempotent_replay', false);
end;
$$;

create or replace function public.record_order_issue(
  p_order_id uuid, p_order_item_id uuid, p_issue_type text, p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_item public.order_items%rowtype;
  v_existing public.order_events%rowtype;
begin
  if v_actor is null or v_role not in ('employee', 'admin') then
    raise exception using errcode = '42501', message = 'order_operator_required';
  end if;
  if v_role = 'employee' and not exists (
    select 1 from public.employee_profiles e where e.id = v_actor and e.account_status = 'active'
  ) then raise exception using errcode = '42501', message = 'order_operator_required'; end if;
  if v_role = 'admin' then perform public._task009_require_admin(); end if;
  if p_issue_type not in ('defect', 'damage') or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'invalid_order_issue';
  end if;
  select * into v_existing from public.order_events
    where order_id = p_order_id and event_type = 'issue_recorded'
      and event_data ->> 'idempotency_key' = p_idempotency_key::text;
  if found then
    if v_existing.event_data ->> 'order_item_id' <> p_order_item_id::text
       or v_existing.event_data ->> 'issue_type' <> p_issue_type then
      raise exception using errcode = 'P0001', message = 'idempotency_key_conflict';
    end if;
    return jsonb_build_object('event_id', v_existing.id, 'idempotent_replay', true);
  end if;
  select * into v_item from public.order_items where id = p_order_item_id and order_id = p_order_id;
  if not found then raise exception using errcode = 'P0001', message = 'order_item_not_found'; end if;
  insert into public.order_events(order_id, event_type, actor_uid, event_data)
    values (p_order_id, 'issue_recorded', v_actor,
      jsonb_build_object('order_item_id', p_order_item_id, 'issue_type', p_issue_type,
        'idempotency_key', p_idempotency_key))
    on conflict (order_id, (event_data ->> 'idempotency_key'))
      where event_type = 'issue_recorded' do nothing
    returning * into v_existing;
  if not found then
    select * into v_existing from public.order_events
      where order_id = p_order_id and event_type = 'issue_recorded'
        and event_data ->> 'idempotency_key' = p_idempotency_key::text;
    if v_existing.event_data ->> 'order_item_id' <> p_order_item_id::text
       or v_existing.event_data ->> 'issue_type' <> p_issue_type then
      raise exception using errcode = 'P0001', message = 'idempotency_key_conflict';
    end if;
    return jsonb_build_object('event_id', v_existing.id, 'idempotent_replay', true);
  end if;
  return jsonb_build_object('event_id', v_existing.id, 'idempotent_replay', false);
end;
$$;

create or replace function public.transition_order(p_order_id uuid, p_next_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_order public.orders%rowtype;
  v_previous text;
  v_status text;
begin
  if v_actor is null or v_role not in ('employee', 'admin') then
    raise exception using errcode = '42501', message = 'order_operator_required';
  end if;
  if v_role = 'employee' and not exists (
    select 1 from public.employee_profiles e where e.id = v_actor and e.account_status = 'active'
  ) then raise exception using errcode = '42501', message = 'order_operator_required'; end if;
  if v_role = 'admin' then perform public._task009_require_admin(); end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'order_not_found'; end if;
  v_previous := v_order.status;
  if p_next_status in ('preparing', 'ready_for_pickup') and v_previous = p_next_status then
    return jsonb_build_object('id', v_order.id, 'reference', v_order.public_reference,
      'status', v_order.status, 'idempotent_replay', true);
  end if;
  if p_next_status = 'picked_up' and exists (
    select 1 from public.order_events e where e.order_id = p_order_id and e.event_type = 'status_changed'
      and e.event_data ->> 'requested_status' = 'picked_up'
  ) and v_order.status in ('picked_up', 'resolved') then
    return jsonb_build_object('id', v_order.id, 'reference', v_order.public_reference,
      'status', v_order.status, 'idempotent_replay', true);
  end if;
  if v_previous = 'awaiting_payment' and p_next_status = 'preparing'
     and v_order.payment_confirmed_at is not null then
    if exists (
      select 1 from public.order_items
      where order_id = p_order_id and line_status = 'open' and perishability is null
    ) then
      raise exception using errcode = 'P0001', message = 'order_items_unclassified';
    end if;
    update public.orders set status = 'preparing', updated_at = clock_timestamp()
      where id = p_order_id returning * into v_order;
  elsif v_previous = 'preparing' and p_next_status = 'ready_for_pickup' then
    if v_order.scheduled_pickup_at is null then
      raise exception using errcode = 'P0001', message = 'order_schedule_required';
    end if;
    update public.orders set status = 'ready_for_pickup', updated_at = clock_timestamp()
      where id = p_order_id returning * into v_order;
  elsif v_previous = 'ready_for_pickup' and p_next_status = 'picked_up' then
    update public.order_items set line_status = 'picked_up', resolved_by = v_actor,
        resolved_at = clock_timestamp()
      where order_id = p_order_id and line_status = 'open';
    v_status := public._task009_refresh_order_status(p_order_id);
    select * into v_order from public.orders where id = p_order_id;
  else
    raise exception using errcode = 'P0001', message = 'order_transition_not_allowed';
  end if;
  insert into public.order_events(order_id, event_type, from_status, to_status, actor_uid, event_data)
    values (p_order_id, 'status_changed', v_previous, v_order.status, v_actor,
      jsonb_build_object('requested_status', p_next_status));
  return jsonb_build_object('id', v_order.id, 'reference', v_order.public_reference,
    'status', v_order.status, 'idempotent_replay', false);
end;
$$;

create or replace function public.cancel_unpaid_order_on_reservation_expiry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if old.status = 'active' and new.status = 'expired' then
    update public.orders set status = 'cancelled', cancellation_reason = 'reservation_expired', updated_at = v_now
      where reservation_id = new.id and status = 'awaiting_payment' and payment_confirmed_at is null
      returning id into v_order_id;
    if v_order_id is not null then
      update public.order_items set line_status = 'cancelled', quantity_used = 0,
          resolved_by = null, resolved_at = v_now
        where order_id = v_order_id and line_status = 'open';
      insert into public.order_events(order_id, event_type, from_status, to_status, event_data)
        values (v_order_id, 'cancelled', 'awaiting_payment', 'cancelled',
          jsonb_build_object('reason', 'reservation_expired'));
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public._task009_add_business_days(date, integer) from public, anon, authenticated, service_role;
revoke all on function public._task009_require_admin() from public, anon, authenticated, service_role;
revoke all on function public._task009_refresh_order_status(uuid) from public, anon, authenticated, service_role;
revoke all on function public._task009_record_stock_return(uuid, public.order_items, uuid, integer, text)
  from public, anon, authenticated, service_role;
revoke all on function public.set_order_pickup_schedule(uuid, timestamptz) from public, anon;
revoke all on function public.classify_order_item(uuid, uuid, boolean) from public, anon;
revoke all on function public.cancel_order(uuid, jsonb, boolean) from public, anon;
revoke all on function public.cancel_nonperishable_order_item(uuid, uuid, integer, boolean) from public, anon;
revoke all on function public.discard_perishable_order_item(uuid, uuid) from public, anon;
revoke all on function public.record_order_issue(uuid, uuid, text, uuid) from public, anon;
revoke all on function public.transition_order(uuid, text) from public, anon;
revoke all on function public.cancel_unpaid_order_on_reservation_expiry() from public, anon, authenticated, service_role;
grant execute on function public.set_order_pickup_schedule(uuid, timestamptz) to authenticated;
grant execute on function public.classify_order_item(uuid, uuid, boolean) to authenticated;
grant execute on function public.cancel_order(uuid, jsonb, boolean) to authenticated;
grant execute on function public.cancel_nonperishable_order_item(uuid, uuid, integer, boolean) to authenticated;
grant execute on function public.discard_perishable_order_item(uuid, uuid) to authenticated;
grant execute on function public.record_order_issue(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.transition_order(uuid, text) to authenticated;
