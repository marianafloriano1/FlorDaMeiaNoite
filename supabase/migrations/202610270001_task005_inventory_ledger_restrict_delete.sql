-- Preserve inventory audit history: a reservation with ledger movements cannot be deleted.
alter table public.inventory_ledger
  drop constraint if exists inventory_ledger_reservation_id_fkey;

alter table public.inventory_ledger
  add constraint inventory_ledger_reservation_id_fkey
  foreign key (reservation_id)
  references public.reservations(id)
  on delete restrict;
