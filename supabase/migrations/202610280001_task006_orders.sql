create table public.reservation_price_snapshots (
  reservation_id uuid not null,
  product_id uuid not null,
  product_name text not null,
  product_slug text not null,
  unit_price_brl numeric(12,2) not null check (unit_price_brl >= 0),
  created_at timestamptz not null default clock_timestamp(),
  primary key (reservation_id, product_id),
  foreign key (reservation_id, product_id)
    references public.reservation_items(reservation_id, product_id) on delete restrict
);

create or replace function public.capture_reservation_price_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.reservation_price_snapshots (
    reservation_id, product_id, product_name, product_slug, unit_price_brl
  )
  select new.reservation_id, p.id, p.name, p.slug, p.price_brl
  from public.catalog_products p
  where p.id = new.product_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'reservation_price_snapshot_missing';
  end if;
  return new;
end;
$$;

create trigger reservation_items_capture_price
  after insert on public.reservation_items
  for each row execute function public.capture_reservation_price_snapshot();

create table public.order_quotes (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  reservation_id uuid not null references public.reservations(id) on delete restrict,
  items jsonb not null,
  total_brl numeric(12,2) not null check (total_brl >= 0),
  price_changed boolean not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  used_at timestamptz
);

create index order_quotes_customer_created_idx
  on public.order_quotes(customer_id, created_at desc);

create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  public_reference uuid not null unique default extensions.gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  reservation_id uuid not null unique references public.reservations(id) on delete restrict,
  quote_id uuid not null unique references public.order_quotes(id) on delete restrict,
  idempotency_key uuid not null,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'preparing', 'ready_for_pickup', 'picked_up', 'cancelled')),
  total_brl numeric(12,2) not null check (total_brl >= 0),
  payment_confirmed_at timestamptz,
  preparation_window_start timestamptz,
  preparation_window_end timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (customer_id, idempotency_key),
  constraint orders_preparation_window_consistent check (
    (payment_confirmed_at is null and preparation_window_start is null and preparation_window_end is null)
    or
    (payment_confirmed_at is not null
      and preparation_window_start = payment_confirmed_at + interval '1 hour'
      and preparation_window_end = payment_confirmed_at + interval '2 hours')
  ),
  constraint orders_cancelled_has_reason check (
    (status = 'cancelled' and cancellation_reason is not null)
    or (status <> 'cancelled' and cancellation_reason is null)
  )
);

create index orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index orders_status_created_idx on public.orders(status, created_at);

create table public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid not null references public.catalog_products(id) on delete restrict,
  product_name text not null,
  product_slug text not null,
  quantity integer not null check (quantity > 0),
  unit_price_brl numeric(12,2) not null check (unit_price_brl >= 0),
  created_at timestamptz not null default clock_timestamp(),
  unique (order_id, product_id)
);

create table public.order_inspections (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  inspected_by uuid not null references auth.users(id) on delete restrict,
  items_confirmed boolean not null,
  inspected_at timestamptz not null default clock_timestamp(),
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  constraint order_inspection_approval_consistent check (
    (approved_by is null and approved_at is null)
    or (approved_by is not null and approved_at is not null)
  )
);

create table public.order_events (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  event_type text not null check (event_type in (
    'created', 'inspection_recorded', 'inspection_approved', 'payment_confirmed',
    'status_changed', 'cancelled'
  )),
  from_status text,
  to_status text,
  actor_uid uuid references auth.users(id) on delete set null,
  event_data jsonb not null default '{}'::jsonb check (jsonb_typeof(event_data) = 'object'),
  created_at timestamptz not null default clock_timestamp()
);

create index order_events_order_created_idx on public.order_events(order_id, created_at);

alter table public.reservation_price_snapshots enable row level security;
alter table public.order_quotes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_inspections enable row level security;
alter table public.order_events enable row level security;

create policy orders_customer_select on public.orders
  for select to authenticated using (customer_id = (select auth.uid()));
create policy order_items_customer_select on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
  );
create policy order_events_customer_select on public.order_events
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
  );

grant select on public.orders, public.order_items, public.order_events to authenticated;
revoke all on public.reservation_price_snapshots, public.order_quotes,
  public.orders, public.order_items, public.order_inspections, public.order_events
  from anon, authenticated;
grant select on public.orders, public.order_items, public.order_events to authenticated;

create or replace function public.create_order_quote(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_reservation public.reservations%rowtype;
  v_items jsonb;
  v_total numeric(12,2);
  v_changed boolean;
  v_quote public.order_quotes%rowtype;
begin
  if v_customer_id is null then
    raise exception using errcode = '42501', message = 'customer_session_required';
  end if;
  select * into v_reservation from public.reservations
    where id = p_reservation_id and customer_id = v_customer_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'reservation_not_found'; end if;
  if v_reservation.status <> 'active' or v_reservation.expires_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'reservation_expired';
  end if;
  if exists (
    select 1 from public.reservation_items ri
    left join public.reservation_price_snapshots ps
      on ps.reservation_id = ri.reservation_id and ps.product_id = ri.product_id
    left join public.catalog_products p on p.id = ri.product_id
    where ri.reservation_id = p_reservation_id and (ps.product_id is null or p.id is null or p.status <> 'published')
  ) then
    raise exception using errcode = 'P0001', message = 'order_product_unavailable';
  end if;
  select
    jsonb_agg(jsonb_build_object(
      'product_id', ri.product_id,
      'product_name', p.name,
      'product_slug', p.slug,
      'quantity', ri.quantity,
      'selected_unit_price_brl', ps.unit_price_brl,
      'current_unit_price_brl', p.price_brl,
      'line_total_brl', round(p.price_brl * ri.quantity, 2)
    ) order by p.name, ri.product_id),
    round(sum(p.price_brl * ri.quantity), 2),
    bool_or(ps.unit_price_brl <> p.price_brl)
  into v_items, v_total, v_changed
  from public.reservation_items ri
  join public.reservation_price_snapshots ps
    on ps.reservation_id = ri.reservation_id and ps.product_id = ri.product_id
  join public.catalog_products p on p.id = ri.product_id
  where ri.reservation_id = p_reservation_id;
  if v_items is null then raise exception using errcode = 'P0001', message = 'empty_reservation'; end if;
  insert into public.order_quotes (customer_id, reservation_id, items, total_brl, price_changed, expires_at)
  values (v_customer_id, p_reservation_id, v_items, v_total, coalesce(v_changed, false),
    least(v_reservation.expires_at, clock_timestamp() + interval '10 minutes'))
  returning * into v_quote;
  return jsonb_build_object('quote_id', v_quote.id, 'reservation_id', v_quote.reservation_id,
    'items', v_quote.items, 'total_brl', v_quote.total_brl, 'price_changed', v_quote.price_changed,
    'expires_at', v_quote.expires_at);
end;
$$;

create or replace function public.create_order_from_quote(
  p_quote_id uuid,
  p_idempotency_key uuid,
  p_consent boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_reservation_id uuid;
  v_reservation public.reservations%rowtype;
  v_quote public.order_quotes%rowtype;
  v_order public.orders%rowtype;
  v_current_items jsonb;
  v_current_total numeric(12,2);
  v_changed boolean;
begin
  if v_customer_id is null then raise exception using errcode = '42501', message = 'customer_session_required'; end if;
  if p_idempotency_key is null or p_consent is distinct from true then
    raise exception using errcode = '22023', message = 'order_consent_required';
  end if;
  select * into v_order from public.orders
    where customer_id = v_customer_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('id', v_order.id, 'reference', v_order.public_reference,
      'reservation_id', v_order.reservation_id, 'status', v_order.status,
      'total_brl', v_order.total_brl,
      'items', coalesce((select jsonb_agg(jsonb_build_object(
        'product_id', oi.product_id, 'product_name', oi.product_name,
        'product_slug', oi.product_slug, 'quantity', oi.quantity,
        'selected_unit_price_brl', oi.unit_price_brl,
        'current_unit_price_brl', oi.unit_price_brl,
        'line_total_brl', round(oi.unit_price_brl * oi.quantity, 2)
      ) order by oi.product_name, oi.product_id) from public.order_items oi where oi.order_id = v_order.id), '[]'::jsonb),
      'payment_confirmed_at', v_order.payment_confirmed_at);
  end if;
  select reservation_id into v_reservation_id from public.order_quotes
    where id = p_quote_id and customer_id = v_customer_id;
  if not found then raise exception using errcode = 'P0001', message = 'order_quote_not_found'; end if;
  select * into v_reservation from public.reservations where id = v_reservation_id for update;
  if not found or v_reservation.customer_id <> v_customer_id then
    raise exception using errcode = 'P0001', message = 'reservation_not_found';
  end if;
  if v_reservation.status <> 'active' or v_reservation.expires_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'reservation_expired';
  end if;
  select * into v_quote from public.order_quotes where id = p_quote_id and customer_id = v_customer_id for update;
  if not found or v_quote.used_at is not null or v_quote.expires_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'order_quote_expired';
  end if;
  select
    jsonb_agg(jsonb_build_object(
      'product_id', ri.product_id,
      'product_name', p.name,
      'product_slug', p.slug,
      'quantity', ri.quantity,
      'selected_unit_price_brl', ps.unit_price_brl,
      'current_unit_price_brl', p.price_brl,
      'line_total_brl', round(p.price_brl * ri.quantity, 2)
    ) order by p.name, ri.product_id),
    round(sum(p.price_brl * ri.quantity), 2),
    bool_or(ps.unit_price_brl <> p.price_brl)
  into v_current_items, v_current_total, v_changed
  from public.reservation_items ri
  join public.reservation_price_snapshots ps
    on ps.reservation_id = ri.reservation_id and ps.product_id = ri.product_id
  join public.catalog_products p on p.id = ri.product_id
  where ri.reservation_id = v_reservation_id;
  if v_current_items is distinct from v_quote.items or v_current_total is distinct from v_quote.total_brl then
    raise exception using errcode = 'P0001', message = 'order_quote_changed';
  end if;
  insert into public.orders (customer_id, reservation_id, quote_id, idempotency_key, total_brl)
  values (v_customer_id, v_reservation_id, p_quote_id, p_idempotency_key, v_quote.total_brl)
  returning * into v_order;
  insert into public.order_items (
    order_id, product_id, product_name, product_slug, quantity, unit_price_brl
  )
  select v_order.id, x.product_id, x.product_name, x.product_slug, x.quantity, x.current_unit_price_brl
  from jsonb_to_recordset(v_quote.items) as x(
    product_id uuid, product_name text, product_slug text, quantity integer,
    selected_unit_price_brl numeric, current_unit_price_brl numeric, line_total_brl numeric
  );
  update public.order_quotes set used_at = clock_timestamp() where id = v_quote.id;
  insert into public.order_events (order_id, event_type, to_status, actor_uid, event_data)
  values (v_order.id, 'created', v_order.status, v_customer_id,
    jsonb_build_object('total_brl', v_order.total_brl, 'price_changed', coalesce(v_changed, false)));
  return jsonb_build_object('id', v_order.id, 'reference', v_order.public_reference,
    'reservation_id', v_order.reservation_id, 'status', v_order.status,
    'total_brl', v_order.total_brl, 'items', v_quote.items);
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
begin
  if old.status = 'active' and new.status = 'expired' then
    update public.orders
      set status = 'cancelled', cancellation_reason = 'reservation_expired', updated_at = clock_timestamp()
      where reservation_id = new.id and status = 'awaiting_payment' and payment_confirmed_at is null
      returning id into v_order_id;
    if v_order_id is not null then
      insert into public.order_events (order_id, event_type, from_status, to_status, event_data)
      values (v_order_id, 'cancelled', 'awaiting_payment', 'cancelled',
        jsonb_build_object('reason', 'reservation_expired'));
    end if;
  end if;
  return new;
end;
$$;

create trigger reservation_expiry_cancels_unpaid_order
  after update of status on public.reservations
  for each row execute function public.cancel_unpaid_order_on_reservation_expiry();

create or replace function public._require_order_admin_step_up()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session text := nullif(auth.jwt() ->> 'session_id', '');
  v_actor uuid := auth.uid();
begin
  if v_session is null or v_actor is null or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception using errcode = '42501', message = 'admin_mfa_required';
  end if;
  update public.admin_auth_sessions
    set last_activity_at = clock_timestamp()
    where session_id = v_session::uuid and user_id = v_actor and revoked_at is null
      and mfa_verified_at is not null
      and last_activity_at > clock_timestamp() - interval '1 hour';
  if not found then
    raise exception using errcode = '42501', message = 'admin_mfa_required';
  end if;
end;
$$;
create or replace function public.confirm_order_payment(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_reservation_id uuid;
  v_reservation public.reservations%rowtype;
  v_order public.orders%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if v_actor is null or v_role <> 'admin' then
    raise exception using errcode = '42501', message = 'admin_role_required';
  end if;
  perform public._require_order_admin_step_up();
  select reservation_id into v_reservation_id from public.orders where id = p_order_id;
  if not found then raise exception using errcode = 'P0001', message = 'order_not_found'; end if;
  select * into v_reservation from public.reservations where id = v_reservation_id for update;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'order_not_found'; end if;
  if v_order.payment_confirmed_at is not null then
    return jsonb_build_object('id', v_order.id, 'reference', v_order.public_reference,
      'status', v_order.status, 'payment_confirmed_at', v_order.payment_confirmed_at,
      'preparation_window_start', v_order.preparation_window_start,
      'preparation_window_end', v_order.preparation_window_end);
  end if;
  if v_order.status <> 'awaiting_payment' or v_reservation.status <> 'active'
     or v_reservation.expires_at <= v_now then
    raise exception using errcode = 'P0001', message = 'order_not_payable';
  end if;
  if not exists (select 1 from public.order_inspections i where i.order_id = v_order.id
      and i.items_confirmed and i.approved_at is not null) then
    raise exception using errcode = 'P0001', message = 'order_inspection_not_approved';
  end if;
  update public.reservations set status = 'completed', closed_at = v_now
    where id = v_reservation.id and status = 'active';
  if not found then raise exception using errcode = 'P0001', message = 'order_not_payable'; end if;
  update public.orders set payment_confirmed_at = v_now,
      preparation_window_start = v_now + interval '1 hour',
      preparation_window_end = v_now + interval '2 hours', updated_at = v_now
    where id = v_order.id returning * into v_order;
  insert into public.order_events (order_id, event_type, actor_uid, event_data)
    values (v_order.id, 'payment_confirmed', v_actor,
      jsonb_build_object('preparation_window_start', v_order.preparation_window_start,
        'preparation_window_end', v_order.preparation_window_end));
  return jsonb_build_object('id', v_order.id, 'reference', v_order.public_reference,
    'status', v_order.status, 'payment_confirmed_at', v_order.payment_confirmed_at,
    'preparation_window_start', v_order.preparation_window_start,
    'preparation_window_end', v_order.preparation_window_end);
end;
$$;

create or replace function public.record_order_inspection(p_order_id uuid, p_items_confirmed boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_order public.orders%rowtype;
  v_inspection public.order_inspections%rowtype;
begin
  if v_actor is null or v_role not in ('employee', 'admin') then
    raise exception using errcode = '42501', message = 'order_operator_required';
  end if;
  if v_role = 'employee' and not exists (
    select 1 from public.employee_profiles e where e.id = v_actor and e.account_status = 'active'
  ) then raise exception using errcode = '42501', message = 'order_operator_required'; end if;
  if v_role = 'admin' then perform public._require_order_admin_step_up(); end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'awaiting_payment' or v_order.payment_confirmed_at is not null then
    raise exception using errcode = 'P0001', message = 'order_not_inspectable';
  end if;
  insert into public.order_inspections (order_id, inspected_by, items_confirmed)
    values (p_order_id, v_actor, p_items_confirmed)
    on conflict (order_id) do update set inspected_by = excluded.inspected_by,
      items_confirmed = excluded.items_confirmed, inspected_at = clock_timestamp(),
      approved_by = null, approved_at = null
    returning * into v_inspection;
  insert into public.order_events (order_id, event_type, actor_uid, event_data)
    values (p_order_id, 'inspection_recorded', v_actor,
      jsonb_build_object('items_confirmed', p_items_confirmed));
  return jsonb_build_object('id', v_inspection.id, 'items_confirmed', v_inspection.items_confirmed,
    'inspected_at', v_inspection.inspected_at);
end;
$$;

create or replace function public.approve_order_inspection(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_inspection public.order_inspections%rowtype;
begin
  if v_actor is null or v_role <> 'admin' then
    raise exception using errcode = '42501', message = 'admin_role_required';
  end if;
  perform public._require_order_admin_step_up();
  update public.order_inspections set approved_by = v_actor, approved_at = clock_timestamp()
    where order_id = p_order_id and items_confirmed and approved_at is null
    returning * into v_inspection;
  if not found then raise exception using errcode = 'P0001', message = 'inspection_not_approvable'; end if;
  insert into public.order_events (order_id, event_type, actor_uid, event_data)
    values (p_order_id, 'inspection_approved', v_actor, '{}'::jsonb);
  return jsonb_build_object('order_id', p_order_id, 'approved_at', v_inspection.approved_at);
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
begin
  if v_actor is null or v_role not in ('employee', 'admin') then
    raise exception using errcode = '42501', message = 'order_operator_required';
  end if;
  if v_role = 'employee' and not exists (
    select 1 from public.employee_profiles e where e.id = v_actor and e.account_status = 'active'
  ) then raise exception using errcode = '42501', message = 'order_operator_required'; end if;
  if v_role = 'admin' then perform public._require_order_admin_step_up(); end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'order_not_found'; end if;
  v_previous := v_order.status;
  if (v_previous = 'awaiting_payment' and p_next_status = 'preparing' and v_order.payment_confirmed_at is not null)
    or (v_previous = 'preparing' and p_next_status = 'ready_for_pickup')
    or (v_previous = 'ready_for_pickup' and p_next_status = 'picked_up') then
    update public.orders set status = p_next_status, updated_at = clock_timestamp()
      where id = p_order_id returning * into v_order;
    insert into public.order_events (order_id, event_type, from_status, to_status, actor_uid)
      values (p_order_id, 'status_changed', v_previous, p_next_status, v_actor);
    return jsonb_build_object('id', v_order.id, 'reference', v_order.public_reference, 'status', v_order.status);
  end if;
  raise exception using errcode = 'P0001', message = 'order_transition_not_allowed';
end;
$$;

create or replace function public.cancel_unpaid_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_reservation_id uuid;
  v_reservation public.reservations%rowtype;
  v_order public.orders%rowtype;
begin
  if v_actor is null or v_role <> 'admin' then
    raise exception using errcode = '42501', message = 'admin_role_required';
  end if;
  perform public._require_order_admin_step_up();
  select reservation_id into v_reservation_id from public.orders where id = p_order_id;
  if not found then raise exception using errcode = 'P0001', message = 'order_not_found'; end if;
  select * into v_reservation from public.reservations where id = v_reservation_id for update;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.payment_confirmed_at is not null or v_order.status <> 'awaiting_payment'
     or v_reservation.status <> 'active' or v_reservation.expires_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'order_not_cancellable';
  end if;
  if not public._transition_cart_reservation(v_reservation.id, 'cancelled') then
    raise exception using errcode = 'P0001', message = 'reservation_not_cancellable';
  end if;
  update public.orders set status = 'cancelled', cancellation_reason = 'admin_cancelled', updated_at = clock_timestamp()
    where id = p_order_id returning * into v_order;
  insert into public.order_events (order_id, event_type, from_status, to_status, actor_uid, event_data)
    values (p_order_id, 'cancelled', 'awaiting_payment', 'cancelled', v_actor,
      jsonb_build_object('reason', 'admin_cancelled'));
  return jsonb_build_object('id', v_order.id, 'reference', v_order.public_reference, 'status', v_order.status);
end;
$$;

create or replace function public.prevent_order_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '42501', message = 'order_events_are_immutable';
end;
$$;

create trigger order_events_immutable
  before update or delete on public.order_events
  for each row execute function public.prevent_order_event_mutation();

revoke all on function public.capture_reservation_price_snapshot() from public, anon, authenticated, service_role;
revoke all on function public._require_order_admin_step_up() from public, anon, authenticated, service_role;
revoke all on function public.create_order_quote(uuid) from public, anon;
revoke all on function public.create_order_from_quote(uuid, uuid, boolean) from public, anon;
revoke all on function public.confirm_order_payment(uuid) from public, anon;
revoke all on function public.record_order_inspection(uuid, boolean) from public, anon;
revoke all on function public.approve_order_inspection(uuid) from public, anon;
revoke all on function public.transition_order(uuid, text) from public, anon;
revoke all on function public.cancel_unpaid_order(uuid) from public, anon;
revoke all on function public.cancel_unpaid_order_on_reservation_expiry() from public, anon, authenticated, service_role;
revoke all on function public.prevent_order_event_mutation() from public, anon, authenticated, service_role;
grant execute on function public.create_order_quote(uuid) to authenticated;
grant execute on function public.create_order_from_quote(uuid, uuid, boolean) to authenticated;
grant execute on function public.confirm_order_payment(uuid) to authenticated;
grant execute on function public.record_order_inspection(uuid, boolean) to authenticated;
grant execute on function public.approve_order_inspection(uuid) to authenticated;
grant execute on function public.transition_order(uuid, text) to authenticated;
grant execute on function public.cancel_unpaid_order(uuid) to authenticated;
