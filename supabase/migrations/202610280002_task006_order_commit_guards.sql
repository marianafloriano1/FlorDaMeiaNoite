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
  if v_customer_id is null then
    raise exception using errcode = '42501', message = 'customer_session_required';
  end if;
  if p_idempotency_key is null or p_consent is distinct from true then
    raise exception using errcode = '22023', message = 'order_consent_required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_customer_id::text || ':' || p_idempotency_key::text, 0)
  );

  select * into v_order from public.orders
    where customer_id = v_customer_id and idempotency_key = p_idempotency_key;
  if found then
    if v_order.quote_id <> p_quote_id then
      raise exception using errcode = 'P0001', message = 'order_idempotency_key_reused';
    end if;
    return jsonb_build_object('id', v_order.id, 'reference', v_order.public_reference,
      'reservation_id', v_order.reservation_id, 'status', v_order.status,
      'total_brl', v_order.total_brl, 'idempotent_replay', true,
      'items', coalesce((select jsonb_agg(jsonb_build_object(
        'product_id', oi.product_id, 'product_name', oi.product_name,
        'product_slug', oi.product_slug, 'quantity', oi.quantity,
        'selected_unit_price_brl', oi.unit_price_brl,
        'current_unit_price_brl', oi.unit_price_brl,
        'line_total_brl', round(oi.unit_price_brl * oi.quantity, 2)
      ) order by oi.product_name, oi.product_id)
      from public.order_items oi where oi.order_id = v_order.id), '[]'::jsonb),
      'payment_confirmed_at', v_order.payment_confirmed_at);
  end if;

  select reservation_id into v_reservation_id from public.order_quotes
    where id = p_quote_id and customer_id = v_customer_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'order_quote_not_found';
  end if;
  select * into v_reservation from public.reservations
    where id = v_reservation_id for update;
  if not found or v_reservation.customer_id <> v_customer_id then
    raise exception using errcode = 'P0001', message = 'reservation_not_found';
  end if;
  if v_reservation.status <> 'active' or v_reservation.expires_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'reservation_expired';
  end if;
  select * into v_quote from public.order_quotes
    where id = p_quote_id and customer_id = v_customer_id for update;
  if not found or v_quote.used_at is not null or v_quote.expires_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'order_quote_expired';
  end if;

  perform p.id
  from public.catalog_products p
  join public.reservation_items ri on ri.product_id = p.id
  where ri.reservation_id = v_reservation_id
  order by p.id
  for share of p;

  if exists (
    select 1 from public.reservation_items ri
    join public.catalog_products p on p.id = ri.product_id
    where ri.reservation_id = v_reservation_id and p.status <> 'published'
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
  into v_current_items, v_current_total, v_changed
  from public.reservation_items ri
  join public.reservation_price_snapshots ps
    on ps.reservation_id = ri.reservation_id and ps.product_id = ri.product_id
  join public.catalog_products p on p.id = ri.product_id
  where ri.reservation_id = v_reservation_id;

  if v_current_items is null then
    raise exception using errcode = 'P0001', message = 'empty_reservation';
  end if;
  if v_current_items is distinct from v_quote.items
     or v_current_total is distinct from v_quote.total_brl then
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
    'total_brl', v_order.total_brl, 'idempotent_replay', false, 'items', v_quote.items);
end;
$$;
