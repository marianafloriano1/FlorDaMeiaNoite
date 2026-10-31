create table public.coupons (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,40}$'),
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  minimum_eligible_brl numeric(12,2) check (minimum_eligible_brl is null or minimum_eligible_brl >= 0),
  maximum_redemptions integer check (maximum_redemptions is null or maximum_redemptions > 0),
  maximum_per_customer integer check (maximum_per_customer is null or maximum_per_customer > 0),
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (valid_until > valid_from),
  check (discount_type <> 'percentage' or discount_value <= 100)
);
create table public.coupon_product_scope (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id) on delete restrict,
  primary key (coupon_id, product_id)
);
create table public.coupon_category_scope (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  category_name text not null references public.catalog_categories(name) on delete restrict,
  primary key (coupon_id, category_name)
);
create table public.coupon_quote_terms (
  quote_id uuid primary key references public.order_quotes(id) on delete restrict,
  coupon_id uuid references public.coupons(id) on delete restrict,
  code_snapshot text,
  base_subtotal_brl numeric(12,2) not null check (base_subtotal_brl >= 0),
  eligible_subtotal_brl numeric(12,2) not null check (eligible_subtotal_brl >= 0),
  discount_brl numeric(12,2) not null check (discount_brl >= 0),
  total_brl numeric(12,2) not null check (total_brl >= 0),
  terms_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  check (discount_brl <= eligible_subtotal_brl)
);
create table public.coupon_redemptions (
  id uuid primary key default extensions.gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  customer_id uuid not null references auth.users(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete restrict,
  status text not null check (status in ('redeemed', 'released')),
  code_snapshot text not null,
  eligible_subtotal_brl numeric(12,2) not null,
  discount_brl numeric(12,2) not null,
  terms_snapshot jsonb not null,
  redeemed_at timestamptz not null default clock_timestamp(),
  released_at timestamptz,
  check ((status = 'redeemed' and released_at is null) or (status = 'released' and released_at is not null))
);
create index coupon_redemptions_usage_idx on public.coupon_redemptions(coupon_id, customer_id, status);
create table public.cart_events (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  product_id uuid not null references public.catalog_products(id) on delete restrict,
  event_type text not null check (event_type in ('cart_item_added', 'favorite_added')),
  quantity_delta integer check (quantity_delta is null or quantity_delta > 0),
  created_at timestamptz not null default clock_timestamp()
);
create index cart_events_created_idx on public.cart_events(created_at desc);

alter table public.coupons enable row level security;
alter table public.coupon_product_scope enable row level security;
alter table public.coupon_category_scope enable row level security;
alter table public.coupon_quote_terms enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.cart_events enable row level security;
revoke all on public.coupons, public.coupon_product_scope, public.coupon_category_scope,
  public.coupon_quote_terms, public.coupon_redemptions, public.cart_events from anon, authenticated;

create or replace function public._task008_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

create or replace function public._task008_coupon_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(c) || jsonb_build_object(
    'product_ids', coalesce((select jsonb_agg(s.product_id) from public.coupon_product_scope s where s.coupon_id = c.id), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(s.category_name) from public.coupon_category_scope s where s.coupon_id = c.id), '[]'::jsonb)
  ) from public.coupons c where c.id = p_id
$$;

create or replace function public.admin_list_coupons()
returns setof jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public._task008_is_admin() then raise exception using errcode = '42501', message = 'admin_role_required'; end if;
  return query select public._task008_coupon_json(c.id) from public.coupons c order by c.created_at desc;
end $$;

create or replace function public.admin_create_coupon(p_coupon jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_actor uuid := auth.uid();
begin
  if not public._task008_is_admin() then raise exception using errcode = '42501', message = 'admin_role_required'; end if;
  insert into public.coupons(code, discount_type, discount_value, valid_from, valid_until,
    minimum_eligible_brl, maximum_redemptions, maximum_per_customer, active, created_by)
  values (upper(p_coupon->>'code'), p_coupon->>'discountType', (p_coupon->>'discountValue')::numeric,
    (p_coupon->>'validFrom')::timestamptz, (p_coupon->>'validUntil')::timestamptz,
    nullif(p_coupon->>'minimumEligibleBrl','null')::numeric,
    nullif(p_coupon->>'maximumRedemptions','null')::integer,
    nullif(p_coupon->>'maximumPerCustomer','null')::integer, coalesce((p_coupon->>'active')::boolean,true), v_actor)
  returning id into v_id;
  insert into public.coupon_product_scope select v_id, x.id from jsonb_array_elements_text(coalesce(p_coupon->'productIds','[]'::jsonb)) x(id);
  insert into public.coupon_category_scope select v_id, x.name from jsonb_array_elements_text(coalesce(p_coupon->'categories','[]'::jsonb)) x(name);
  return public._task008_coupon_json(v_id);
exception when unique_violation then raise exception using errcode = 'P0001', message = 'coupon_code_conflict';
end $$;

create or replace function public.admin_update_coupon(p_coupon_id uuid, p_coupon jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_coupon public.coupons%rowtype; v_actor uuid := auth.uid();
begin
  if not public._task008_is_admin() then raise exception using errcode = '42501', message = 'admin_role_required'; end if;
  select * into v_coupon from public.coupons where id = p_coupon_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'coupon_not_found'; end if;
  update public.coupons set
    code = upper(coalesce(p_coupon->>'code', v_coupon.code)),
    discount_type = coalesce(p_coupon->>'discountType', v_coupon.discount_type),
    discount_value = coalesce((p_coupon->>'discountValue')::numeric, v_coupon.discount_value),
    valid_from = coalesce((p_coupon->>'validFrom')::timestamptz, v_coupon.valid_from),
    valid_until = coalesce((p_coupon->>'validUntil')::timestamptz, v_coupon.valid_until),
    minimum_eligible_brl = case when p_coupon ? 'minimumEligibleBrl' then nullif(p_coupon->>'minimumEligibleBrl','null')::numeric else v_coupon.minimum_eligible_brl end,
    maximum_redemptions = case when p_coupon ? 'maximumRedemptions' then nullif(p_coupon->>'maximumRedemptions','null')::integer else v_coupon.maximum_redemptions end,
    maximum_per_customer = case when p_coupon ? 'maximumPerCustomer' then nullif(p_coupon->>'maximumPerCustomer','null')::integer else v_coupon.maximum_per_customer end,
    active = coalesce((p_coupon->>'active')::boolean, v_coupon.active), updated_at = clock_timestamp()
  where id = p_coupon_id;
  if p_coupon ? 'productIds' then
    delete from public.coupon_product_scope where coupon_id = p_coupon_id;
    insert into public.coupon_product_scope select p_coupon_id, x.id from jsonb_array_elements_text(p_coupon->'productIds') x(id);
  end if;
  if p_coupon ? 'categories' then
    delete from public.coupon_category_scope where coupon_id = p_coupon_id;
    insert into public.coupon_category_scope select p_coupon_id, x.name from jsonb_array_elements_text(p_coupon->'categories') x(name);
  end if;
  return public._task008_coupon_json(p_coupon_id);
exception when unique_violation then raise exception using errcode = 'P0001', message = 'coupon_code_conflict';
end $$;

create or replace function public.create_order_quote_with_coupon(p_reservation_id uuid, p_coupon_code text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_customer uuid := auth.uid(); v_quote jsonb; v_quote_id uuid; v_coupon public.coupons%rowtype;
  v_code text := nullif(upper(trim(p_coupon_code)), ''); v_eligible numeric(12,2) := 0; v_discount numeric(12,2) := 0;
  v_total numeric(12,2); v_terms jsonb := '{}'::jsonb;
begin
  v_quote := public.create_order_quote(p_reservation_id);
  v_quote_id := (v_quote->>'quote_id')::uuid;
  v_total := (v_quote->>'total_brl')::numeric;
  if v_code is not null then
    select * into v_coupon from public.coupons where code = v_code and active and valid_from <= clock_timestamp() and valid_until > clock_timestamp();
    if not found then raise exception using errcode = 'P0001', message = 'coupon_invalid'; end if;
    select round(coalesce(sum((item->>'current_unit_price_brl')::numeric * (item->>'quantity')::integer),0),2)
      into v_eligible
      from jsonb_array_elements(v_quote->'items') as lines(item)
      join public.catalog_products p on p.id = (item->>'product_id')::uuid
      where (not exists(select 1 from public.coupon_product_scope s where s.coupon_id=v_coupon.id)
        or exists(select 1 from public.coupon_product_scope s where s.coupon_id=v_coupon.id and s.product_id=p.id))
        and (not exists(select 1 from public.coupon_category_scope s where s.coupon_id=v_coupon.id)
        or exists(select 1 from public.coupon_category_scope s where s.coupon_id=v_coupon.id and s.category_name=p.category_name));
    if v_coupon.minimum_eligible_brl is not null and v_eligible < v_coupon.minimum_eligible_brl then
      raise exception using errcode = 'P0001', message = 'coupon_minimum_not_met';
    end if;
    v_discount := least(v_eligible, round(case when v_coupon.discount_type='percentage'
      then v_eligible * v_coupon.discount_value / 100 else v_coupon.discount_value end, 2));
    v_total := round((v_quote->>'total_brl')::numeric - v_discount, 2);
    v_terms := jsonb_build_object('coupon_id',v_coupon.id,'code',v_coupon.code,'discount_type',v_coupon.discount_type,
      'discount_value',v_coupon.discount_value,'valid_from',v_coupon.valid_from,'valid_until',v_coupon.valid_until,
      'minimum_eligible_brl',v_coupon.minimum_eligible_brl,'maximum_redemptions',v_coupon.maximum_redemptions,
      'maximum_per_customer',v_coupon.maximum_per_customer,
      'product_ids',coalesce((select jsonb_agg(s.product_id order by s.product_id) from public.coupon_product_scope s where s.coupon_id=v_coupon.id),'[]'::jsonb),
      'categories',coalesce((select jsonb_agg(s.category_name order by s.category_name) from public.coupon_category_scope s where s.coupon_id=v_coupon.id),'[]'::jsonb));
  end if;
  insert into public.coupon_quote_terms(quote_id,coupon_id,code_snapshot,base_subtotal_brl,eligible_subtotal_brl,discount_brl,total_brl,terms_snapshot)
  values(v_quote_id,v_coupon.id,v_coupon.code,(v_quote->>'total_brl')::numeric,v_eligible,v_discount,v_total,v_terms);
  return v_quote || jsonb_build_object('subtotal_brl',(v_quote->>'total_brl')::numeric,'total_brl',v_total,
    'coupon',case when v_code is null then null else jsonb_build_object('code',v_coupon.code,'eligible_subtotal_brl',v_eligible,'discount_brl',v_discount,'total_brl',v_total) end);
end $$;

create or replace function public.create_order_from_quote_with_coupon(p_quote_id uuid,p_idempotency_key uuid,p_consent boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_customer uuid := auth.uid(); v_terms public.coupon_quote_terms%rowtype; v_coupon public.coupons%rowtype;
  v_order jsonb; v_existing_order public.orders%rowtype; v_order_id uuid; v_used integer; v_customer_used integer;
  v_eligible_current numeric(12,2); v_discount_current numeric(12,2); v_quote public.order_quotes%rowtype;
begin
  if v_customer is null then raise exception using errcode='42501',message='customer_session_required'; end if;
  if p_idempotency_key is null or p_consent is distinct from true then
    raise exception using errcode='22023',message='order_consent_required';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_customer::text || ':' || p_idempotency_key::text,0));
  select * into v_existing_order from public.orders where customer_id=v_customer and idempotency_key=p_idempotency_key;
  if found then
    if v_existing_order.quote_id <> p_quote_id then raise exception using errcode='P0001',message='order_idempotency_key_reused'; end if;
    select * into v_terms from public.coupon_quote_terms where quote_id=p_quote_id;
    return jsonb_build_object('id',v_existing_order.id,'reference',v_existing_order.public_reference,'reservation_id',v_existing_order.reservation_id,
      'status',v_existing_order.status,'total_brl',v_existing_order.total_brl,'subtotal_brl',v_terms.base_subtotal_brl,
      'discount_brl',v_terms.discount_brl,'coupon_code',v_terms.code_snapshot,'idempotent_replay',true,
      'items',coalesce((select jsonb_agg(jsonb_build_object('product_id',oi.product_id,'product_name',oi.product_name,
        'product_slug',oi.product_slug,'quantity',oi.quantity,'selected_unit_price_brl',oi.unit_price_brl,
        'current_unit_price_brl',oi.unit_price_brl,'line_total_brl',round(oi.unit_price_brl*oi.quantity,2))
        order by oi.product_name,oi.product_id) from public.order_items oi where oi.order_id=v_existing_order.id),'[]'::jsonb));
  end if;
  select * into v_terms from public.coupon_quote_terms where quote_id=p_quote_id for update;
  if not found then raise exception using errcode='P0001',message='order_quote_not_found'; end if;
  if v_terms.coupon_id is not null then
    select * into v_coupon from public.coupons where id=v_terms.coupon_id for update;
    if not found or not v_coupon.active or v_coupon.valid_from > clock_timestamp() or v_coupon.valid_until <= clock_timestamp()
      then raise exception using errcode='P0001',message='coupon_invalid'; end if;
    if v_terms.terms_snapshot->>'code' is distinct from v_coupon.code
      or v_terms.terms_snapshot->>'discount_type' is distinct from v_coupon.discount_type
      or (v_terms.terms_snapshot->>'discount_value')::numeric is distinct from v_coupon.discount_value
      or (v_terms.terms_snapshot->>'valid_from')::timestamptz is distinct from v_coupon.valid_from
      or (v_terms.terms_snapshot->>'valid_until')::timestamptz is distinct from v_coupon.valid_until
      or (v_terms.terms_snapshot->>'minimum_eligible_brl')::numeric is distinct from v_coupon.minimum_eligible_brl
      or (v_terms.terms_snapshot->>'maximum_redemptions')::integer is distinct from v_coupon.maximum_redemptions
      or (v_terms.terms_snapshot->>'maximum_per_customer')::integer is distinct from v_coupon.maximum_per_customer
      or v_terms.terms_snapshot->'product_ids' is distinct from coalesce((select jsonb_agg(s.product_id order by s.product_id) from public.coupon_product_scope s where s.coupon_id=v_coupon.id),'[]'::jsonb)
      or v_terms.terms_snapshot->'categories' is distinct from coalesce((select jsonb_agg(s.category_name order by s.category_name) from public.coupon_category_scope s where s.coupon_id=v_coupon.id),'[]'::jsonb)
      then raise exception using errcode='P0001',message='coupon_terms_changed'; end if;
    select * into v_quote from public.order_quotes where id=p_quote_id and customer_id=v_customer;
    if not found then raise exception using errcode='P0001',message='order_quote_not_found'; end if;
    perform p.id from public.catalog_products p
      join jsonb_array_elements(v_quote.items) as lines(item) on p.id=(item->>'product_id')::uuid
      order by p.id for share of p;
    select round(coalesce(sum((item->>'current_unit_price_brl')::numeric * (item->>'quantity')::integer),0),2)
      into v_eligible_current
      from jsonb_array_elements(v_quote.items) as lines(item)
      join public.catalog_products p on p.id=(item->>'product_id')::uuid
      where (not exists(select 1 from public.coupon_product_scope s where s.coupon_id=v_coupon.id)
        or exists(select 1 from public.coupon_product_scope s where s.coupon_id=v_coupon.id and s.product_id=p.id))
        and (not exists(select 1 from public.coupon_category_scope s where s.coupon_id=v_coupon.id)
        or exists(select 1 from public.coupon_category_scope s where s.coupon_id=v_coupon.id and s.category_name=p.category_name));
    if v_coupon.minimum_eligible_brl is not null and v_eligible_current < v_coupon.minimum_eligible_brl then
      raise exception using errcode='P0001',message='coupon_minimum_not_met'; end if;
    v_discount_current := least(v_eligible_current, round(case when v_coupon.discount_type='percentage'
      then v_eligible_current * v_coupon.discount_value / 100 else v_coupon.discount_value end,2));
    if v_eligible_current is distinct from v_terms.eligible_subtotal_brl
      or v_discount_current is distinct from v_terms.discount_brl
      then raise exception using errcode='P0001',message='coupon_quote_changed'; end if;
    select count(*) into v_used from public.coupon_redemptions where coupon_id=v_coupon.id and status='redeemed';
    select count(*) into v_customer_used from public.coupon_redemptions where coupon_id=v_coupon.id and customer_id=v_customer and status='redeemed';
    if (v_coupon.maximum_redemptions is not null and v_used >= v_coupon.maximum_redemptions)
      or (v_coupon.maximum_per_customer is not null and v_customer_used >= v_coupon.maximum_per_customer)
      then raise exception using errcode='P0001',message='coupon_limit_reached'; end if;
  end if;
  v_order := public.create_order_from_quote(p_quote_id,p_idempotency_key,p_consent);
  v_order_id := (v_order->>'id')::uuid;
  update public.orders set total_brl=v_terms.total_brl,updated_at=clock_timestamp() where id=v_order_id;
  if v_terms.coupon_id is not null then
    insert into public.coupon_redemptions(coupon_id,customer_id,order_id,status,code_snapshot,eligible_subtotal_brl,discount_brl,terms_snapshot)
      values(v_terms.coupon_id,v_customer,v_order_id,'redeemed',v_terms.code_snapshot,v_terms.eligible_subtotal_brl,v_terms.discount_brl,v_terms.terms_snapshot);
    insert into public.order_events(order_id,event_type,to_status,actor_uid,event_data)
      values(v_order_id,'coupon_applied','awaiting_payment',v_customer,jsonb_build_object('code',v_terms.code_snapshot,
        'eligible_subtotal_brl',v_terms.eligible_subtotal_brl,'discount_brl',v_terms.discount_brl,'total_brl',v_terms.total_brl));
  end if;
  return v_order || jsonb_build_object('total_brl',v_terms.total_brl,'subtotal_brl',v_terms.base_subtotal_brl,
    'discount_brl',v_terms.discount_brl,'coupon_code',v_terms.code_snapshot,'idempotent_replay',false);
end $$;

create or replace function public.release_coupon_redemption_before_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status='cancelled' and old.status is distinct from new.status and new.payment_confirmed_at is null then
    update public.coupon_redemptions set status='released',released_at=clock_timestamp()
      where order_id=new.id and status='redeemed';
  end if;
  return new;
end $$;
create trigger orders_release_coupon_redemption
  after update of status on public.orders for each row execute function public.release_coupon_redemption_before_payment();

alter table public.order_events drop constraint if exists order_events_event_type_check;
alter table public.order_events add constraint order_events_event_type_check
  check (event_type in ('created','inspection_recorded','inspection_approved','payment_confirmed','status_changed','cancelled','coupon_applied'));

create or replace function public.capture_cart_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_customer uuid; v_delta integer;
begin
  if tg_table_name='favorites' then
    insert into public.cart_events(customer_id,product_id,event_type) values(new.customer_id,new.product_id,'favorite_added');
  else
    select customer_id into v_customer from public.carts where id=new.cart_id;
    v_delta := case when tg_op='INSERT' then new.quantity else greatest(new.quantity-old.quantity,0) end;
    if v_delta > 0 then insert into public.cart_events(customer_id,product_id,event_type,quantity_delta)
      values(v_customer,new.product_id,'cart_item_added',v_delta); end if;
  end if;
  return new;
end $$;
create trigger cart_items_insert_capture_event after insert on public.cart_items
  for each row execute function public.capture_cart_event();
create trigger cart_items_update_capture_event after update of quantity on public.cart_items
  for each row when (new.quantity > old.quantity) execute function public.capture_cart_event();
create trigger favorites_capture_event after insert on public.favorites
  for each row execute function public.capture_cart_event();

revoke all on function public._task008_is_admin() from public, anon, authenticated;
revoke all on function public._task008_coupon_json(uuid) from public, anon, authenticated;
revoke all on function public.admin_list_coupons() from public, anon;
revoke all on function public.admin_create_coupon(jsonb) from public, anon;
revoke all on function public.admin_update_coupon(uuid,jsonb) from public, anon;
revoke all on function public.create_order_quote_with_coupon(uuid,text) from public, anon;
revoke all on function public.create_order_from_quote_with_coupon(uuid,uuid,boolean) from public, anon;
revoke all on function public.release_coupon_redemption_before_payment() from public, anon, authenticated;
revoke all on function public.capture_cart_event() from public, anon, authenticated;
grant execute on function public.admin_list_coupons() to authenticated;
grant execute on function public.admin_create_coupon(jsonb) to authenticated;
grant execute on function public.admin_update_coupon(uuid,jsonb) to authenticated;
grant execute on function public.create_order_quote_with_coupon(uuid,text) to authenticated;
grant execute on function public.create_order_from_quote_with_coupon(uuid,uuid,boolean) to authenticated;
