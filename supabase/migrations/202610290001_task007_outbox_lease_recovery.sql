-- TASK-007: close expired outbox leases after the final delivery attempt.
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

  update public.catalog_stock_alert_outbox q
  set status = 'failed',
      locked_until = null,
      last_error_code = 'worker_lease_expired_after_max_attempts'
  where q.status = 'processing'
    and q.attempts >= 5
    and q.locked_until < clock_timestamp();

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