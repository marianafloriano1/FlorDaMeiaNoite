create table public.carts (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  cart_id uuid not null references public.carts(id) on delete restrict,
  product_id uuid not null references public.catalog_products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cart_id, product_id)
);

create index cart_items_product_idx on public.cart_items(product_id);

create table public.favorites (
  customer_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

create table public.reservations (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  cart_id uuid not null references public.carts(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'expired', 'cancelled', 'completed')),
  idempotency_key uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (customer_id, idempotency_key),
  constraint reservations_terminal_time_consistent check (
    (status = 'active' and closed_at is null)
    or (status <> 'active' and closed_at is not null)
  )
);

create unique index reservations_one_active_customer_idx
  on public.reservations(customer_id) where status = 'active';
create unique index reservations_one_active_cart_idx
  on public.reservations(cart_id) where status = 'active';
create index reservations_expiry_idx on public.reservations(expires_at)
  where status = 'active';

create table public.reservation_items (
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  primary key (reservation_id, product_id)
);

create table public.inventory_ledger (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.catalog_products(id) on delete restrict,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  event_type text not null check (event_type in ('reserved', 'expired_release', 'cancelled_release')),
  quantity_delta integer not null check (quantity_delta <> 0),
  created_at timestamptz not null default now(),
  unique (reservation_id, product_id, event_type),
  constraint inventory_ledger_delta_matches_event check (
    (event_type = 'reserved' and quantity_delta < 0)
    or (event_type in ('expired_release', 'cancelled_release') and quantity_delta > 0)
  )
);

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.favorites enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;
alter table public.inventory_ledger enable row level security;

create policy carts_owner_select on public.carts
  for select to authenticated using (customer_id = (select auth.uid()));
create policy carts_owner_insert on public.carts
  for insert to authenticated with check (customer_id = (select auth.uid()));
create policy carts_owner_update on public.carts
  for update to authenticated using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));
create policy cart_items_owner_all on public.cart_items
  for all to authenticated
  using (exists (
    select 1 from public.carts c
    where c.id = cart_id and c.customer_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.carts c
    where c.id = cart_id and c.customer_id = (select auth.uid())
  ));

create policy favorites_owner_all on public.favorites
  for all to authenticated
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));

create policy reservations_owner_select on public.reservations
  for select to authenticated using (customer_id = (select auth.uid()));
create policy reservation_items_owner_select on public.reservation_items
  for select to authenticated using (exists (
    select 1 from public.reservations r
    where r.id = reservation_id and r.customer_id = (select auth.uid())
  ));

revoke all on public.carts, public.cart_items, public.favorites, public.reservations,
  public.reservation_items, public.inventory_ledger from anon, authenticated;
grant select, insert, update on public.carts to authenticated;
grant select, insert, update, delete on public.cart_items, public.favorites to authenticated;
grant select on public.reservations, public.reservation_items to authenticated;

create or replace function public._transition_cart_reservation(
  p_reservation_id uuid,
  p_target_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations%rowtype;
  v_item record;
  v_target text;
begin
  if p_target_status not in ('expired', 'cancelled') then
    raise exception using errcode = '22023', message = 'invalid_reservation_transition';
  end if;

  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found or v_reservation.status <> 'active' then
    return false;
  end if;

  if v_reservation.expires_at <= clock_timestamp() then
    v_target := 'expired';
  elsif p_target_status = 'expired' then
    return false;
  else
    v_target := 'cancelled';
  end if;

  update public.reservations
  set status = v_target, closed_at = clock_timestamp()
  where id = v_reservation.id and status = 'active';

  if not found then
    return false;
  end if;

  for v_item in
    select product_id, quantity
    from public.reservation_items
    where reservation_id = v_reservation.id
    order by product_id
  loop
    update public.catalog_products
    set stock_quantity = stock_quantity + v_item.quantity,
        updated_at = clock_timestamp()
    where id = v_item.product_id;

    insert into public.inventory_ledger (
      product_id, reservation_id, event_type, quantity_delta
    ) values (
      v_item.product_id,
      v_reservation.id,
      case when v_target = 'expired' then 'expired_release' else 'cancelled_release' end,
      v_item.quantity
    );
  end loop;

  return true;
end;
$$;

create or replace function public.create_cart_reservation(
  p_cart_id uuid,
  p_selected_product_ids uuid[],
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_reservation public.reservations%rowtype;
  v_item record;
  v_selected_count integer;
  v_cart_item_count integer;
  v_now timestamptz;
begin
  if v_customer_id is null then
    raise exception using errcode = '42501', message = 'customer_session_required';
  end if;
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'customer' then
    raise exception using errcode = '42501', message = 'customer_role_required';
  end if;
  if p_cart_id is null or p_idempotency_key is null
     or p_selected_product_ids is null
     or cardinality(p_selected_product_ids) = 0
     or array_position(p_selected_product_ids, null) is not null then
    raise exception using errcode = '22023', message = 'invalid_reservation_request';
  end if;

  select count(distinct selected_id) into v_selected_count
  from unnest(p_selected_product_ids) as selected(selected_id);
  if v_selected_count <> cardinality(p_selected_product_ids) then
    raise exception using errcode = '22023', message = 'duplicate_selected_product';
  end if;

  perform 1 from public.carts c
  where c.id = p_cart_id and c.customer_id = v_customer_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'cart_not_found';
  end if;

  select * into v_reservation
  from public.reservations r
  where r.customer_id = v_customer_id and r.idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'id', v_reservation.id,
      'status', v_reservation.status,
      'expires_at', v_reservation.expires_at
    );
  end if;

  select * into v_reservation
  from public.reservations r
  where r.customer_id = v_customer_id and r.status = 'active'
  for update;
  if found then
    if v_reservation.expires_at <= clock_timestamp() then
      perform public._transition_cart_reservation(v_reservation.id, 'expired');
    else
      raise exception using errcode = 'P0001', message = 'active_reservation_exists';
    end if;
  end if;

  select count(*) into v_cart_item_count
  from public.cart_items ci
  where ci.cart_id = p_cart_id and ci.product_id = any(p_selected_product_ids);
  if v_cart_item_count <> cardinality(p_selected_product_ids) then
    raise exception using errcode = 'P0001', message = 'invalid_cart_selection';
  end if;

  for v_item in
    select ci.product_id, ci.quantity, p.stock_quantity, p.status
    from public.cart_items ci
    join public.catalog_products p on p.id = ci.product_id
    where ci.cart_id = p_cart_id and ci.product_id = any(p_selected_product_ids)
    order by ci.product_id
    for update of ci, p
  loop
    if v_item.status <> 'published' or v_item.stock_quantity < v_item.quantity then
      raise exception using errcode = 'P0001', message = 'product_unavailable';
    end if;
  end loop;

  v_now := clock_timestamp();
  insert into public.reservations (
    customer_id, cart_id, status, idempotency_key, expires_at, created_at
  ) values (
    v_customer_id, p_cart_id, 'active', p_idempotency_key,
    v_now + interval '3 hours', v_now
  ) returning * into v_reservation;

  for v_item in
    select ci.product_id, ci.quantity
    from public.cart_items ci
    where ci.cart_id = p_cart_id and ci.product_id = any(p_selected_product_ids)
    order by ci.product_id
  loop
    update public.catalog_products
    set stock_quantity = stock_quantity - v_item.quantity,
        updated_at = v_now
    where id = v_item.product_id and status = 'published'
      and stock_quantity >= v_item.quantity;
    if not found then
      raise exception using errcode = 'P0001', message = 'product_unavailable';
    end if;

    insert into public.reservation_items (reservation_id, product_id, quantity)
    values (v_reservation.id, v_item.product_id, v_item.quantity);

    insert into public.inventory_ledger (
      product_id, reservation_id, event_type, quantity_delta
    ) values (
      v_item.product_id, v_reservation.id, 'reserved', -v_item.quantity
    );
  end loop;

  return jsonb_build_object(
    'id', v_reservation.id,
    'status', v_reservation.status,
    'expires_at', v_reservation.expires_at
  );
end;
$$;

create or replace function public.expire_due_reservations(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation_id uuid;
  v_expired_count integer := 0;
begin
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception using errcode = '22023', message = 'invalid_expiration_batch_size';
  end if;

  for v_reservation_id in
    select r.id
    from public.reservations r
    where r.status = 'active' and r.expires_at <= clock_timestamp()
    order by r.expires_at, r.id
    limit p_limit
    for update skip locked
  loop
    if public._transition_cart_reservation(v_reservation_id, 'expired') then
      v_expired_count := v_expired_count + 1;
    end if;
  end loop;

  return v_expired_count;
end;
$$;

create or replace function public.cancel_cart_reservation(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_owner_id uuid;
  v_expires_at timestamptz;
begin
  if v_customer_id is null then
    raise exception using errcode = '42501', message = 'customer_session_required';
  end if;

  select customer_id, expires_at into v_owner_id, v_expires_at
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found or v_owner_id <> v_customer_id then
    raise exception using errcode = 'P0001', message = 'reservation_not_found';
  end if;

  if v_expires_at <= clock_timestamp() then
    perform public._transition_cart_reservation(p_reservation_id, 'expired');
    return false;
  end if;

  return public._transition_cart_reservation(p_reservation_id, 'cancelled');
end;
$$;

revoke all on function public._transition_cart_reservation(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.create_cart_reservation(uuid, uuid[], uuid) from public, anon;
revoke all on function public.expire_due_reservations(integer) from public, anon, authenticated;
revoke all on function public.cancel_cart_reservation(uuid) from public, anon;
grant execute on function public.create_cart_reservation(uuid, uuid[], uuid) to authenticated;
grant execute on function public.expire_due_reservations(integer) to service_role;
grant execute on function public.cancel_cart_reservation(uuid) to authenticated;