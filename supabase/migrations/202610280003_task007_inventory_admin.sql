-- TASK-007: immutable stock adjustment audit and idempotent internal alert outbox.

alter table public.inventory_ledger
  alter column reservation_id drop not null,
  -- Keep the immutable actor UUID even if the employee account is later removed.
  add column actor_uid uuid,
  add column quantity_before integer,
  add column quantity_after integer,
  add column reason text;

alter table public.inventory_ledger
  drop constraint if exists inventory_ledger_event_type_check,
  drop constraint if exists inventory_ledger_delta_matches_event,
  add constraint inventory_ledger_event_type_check
    check (event_type in ('reserved', 'expired_release', 'cancelled_release', 'stock_adjustment')),
  add constraint inventory_ledger_delta_matches_event check (
    (event_type = 'reserved' and quantity_delta < 0)
    or (event_type in ('expired_release', 'cancelled_release') and quantity_delta > 0)
    or (event_type = 'stock_adjustment'
      and quantity_before is not null and quantity_before >= 0
      and quantity_after is not null and quantity_after >= 0
      and quantity_delta = quantity_after - quantity_before)
  ),
  add constraint inventory_ledger_task007_fields_consistent check (
    (event_type = 'stock_adjustment'
      and reservation_id is null
      and actor_uid is not null
      and quantity_before is not null
      and quantity_after is not null
      and nullif(btrim(reason), '') is not null
      and char_length(btrim(reason)) <= 400)
    or (event_type <> 'stock_adjustment'
      and reservation_id is not null
      and actor_uid is null
      and quantity_before is null
      and quantity_after is null
      and reason is null)
  );

create or replace function public.prevent_inventory_ledger_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'inventory_ledger_immutable';
end;
$$;

create trigger inventory_ledger_immutable
before update or delete on public.inventory_ledger
for each row execute function public.prevent_inventory_ledger_mutation();

create table public.catalog_stock_alert_outbox (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.catalog_products(id) on delete restrict,
  quantity_before integer not null check (quantity_before > 7),
  quantity_after integer not null check (quantity_after between 0 and 7),
  idempotency_key uuid not null unique default extensions.gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_until timestamptz,
  sent_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  constraint catalog_stock_alert_status_consistent check (
    (status = 'processing' and locked_until is not null)
    or (status <> 'processing' and locked_until is null)
  )
);

create index catalog_stock_alert_outbox_pending_idx
  on public.catalog_stock_alert_outbox (available_at, created_at)
  where status in ('pending', 'processing');

alter table public.catalog_stock_alert_outbox enable row level security;
revoke all on public.catalog_stock_alert_outbox from anon, authenticated;

create or replace function public.enqueue_catalog_stock_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.stock_quantity > 7 and new.stock_quantity <= 7 then
    insert into public.catalog_stock_alert_outbox (
      product_id, quantity_before, quantity_after
    ) values (
      new.id, old.stock_quantity, new.stock_quantity
    );
  end if;
  return new;
end;
$$;

create trigger catalog_products_low_stock_alert
after update of stock_quantity on public.catalog_products
for each row
when (old.stock_quantity > 7 and new.stock_quantity <= 7)
execute function public.enqueue_catalog_stock_alert();

create or replace function public.admin_adjust_catalog_stock(
  p_product_id uuid,
  p_new_quantity integer,
  p_reason text,
  p_actor_uid uuid
)
returns table (ledger_id uuid, stock_before integer, stock_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before integer;
  v_after integer;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_role text;
  v_ledger_id uuid;
begin
  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception using errcode = '22023', message = 'invalid_stock_quantity';
  end if;
  if char_length(v_reason) < 1 or char_length(v_reason) > 400 then
    raise exception using errcode = '22023', message = 'invalid_stock_adjustment_reason';
  end if;

  select u.raw_app_meta_data ->> 'role'
    into v_role
  from auth.users u
  where u.id = p_actor_uid;
  if v_role = 'employee' then
    perform 1 from public.employee_profiles e
      where e.id = p_actor_uid and e.account_status = 'active';
    if not found then
      raise exception using errcode = '42501', message = 'catalog_operator_required';
    end if;
  elsif v_role is distinct from 'admin' then
    raise exception using errcode = '42501', message = 'catalog_operator_required';
  end if;

  select p.stock_quantity into v_before
  from public.catalog_products p
  where p.id = p_product_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'catalog_product_not_found';
  end if;
  if v_before = p_new_quantity then
    raise exception using errcode = '22023', message = 'stock_quantity_unchanged';
  end if;

  v_after := p_new_quantity;
  update public.catalog_products
  set stock_quantity = v_after, updated_at = clock_timestamp()
  where id = p_product_id;

  insert into public.inventory_ledger (
    product_id, reservation_id, event_type, quantity_delta,
    actor_uid, quantity_before, quantity_after, reason, created_at
  ) values (
    p_product_id, null, 'stock_adjustment', v_after - v_before,
    p_actor_uid, v_before, v_after, v_reason, clock_timestamp()
  ) returning id into v_ledger_id;

  return query select v_ledger_id, v_before, v_after;
end;
$$;

create or replace function public.claim_catalog_stock_alerts(p_limit integer default 20)
returns table (
  id uuid,
  product_id uuid,
  quantity_before integer,
  quantity_after integer,
  idempotency_key uuid,
  attempt integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'invalid_alert_batch_size';
  end if;
  return query
  with picked as (
    select q.id
    from public.catalog_stock_alert_outbox q
    where q.attempts < 5
      and q.available_at <= clock_timestamp()
      and (q.status = 'pending' or (q.status = 'processing' and q.locked_until < clock_timestamp()))
    order by q.created_at, q.id
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.catalog_stock_alert_outbox q
    set status = 'processing', attempts = q.attempts + 1,
        locked_until = clock_timestamp() + interval '5 minutes'
    from picked
    where q.id = picked.id
    returning q.id, q.product_id, q.quantity_before, q.quantity_after,
      q.idempotency_key, q.attempts
  )
  select c.id, c.product_id, c.quantity_before, c.quantity_after,
    c.idempotency_key, c.attempts from claimed c;
end;
$$;

create or replace function public.finish_catalog_stock_alert(
  p_id uuid,
  p_sent boolean,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.catalog_stock_alert_outbox q
  set status = case when p_sent then 'sent'
                    when q.attempts >= 5 then 'failed'
                    else 'pending' end,
      available_at = case when p_sent or q.attempts >= 5 then q.available_at
                          else clock_timestamp() + make_interval(secs => least(900, q.attempts * 30)) end,
      locked_until = null,
      sent_at = case when p_sent then clock_timestamp() else null end,
      last_error_code = case when p_sent then null else left(coalesce(p_error_code, 'delivery_failed'), 80) end
  where q.id = p_id and q.status = 'processing' and q.locked_until >= clock_timestamp();
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.admin_adjust_catalog_stock(uuid, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.claim_catalog_stock_alerts(integer) from public, anon, authenticated;
revoke all on function public.finish_catalog_stock_alert(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_adjust_catalog_stock(uuid, integer, text, uuid) to service_role;
grant execute on function public.claim_catalog_stock_alerts(integer) to service_role;
grant execute on function public.finish_catalog_stock_alert(uuid, boolean, text) to service_role;
