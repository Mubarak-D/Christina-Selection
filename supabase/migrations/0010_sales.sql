-- What was sold to whom. Title and price are copied at the time of sale, so the record
-- survives later edits or deletion of the piece or the set.
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  set_id uuid references public.selection_sets(id) on delete set null,
  piece_id uuid references public.pieces(id) on delete set null,
  title text not null,
  price numeric(12,2),
  sold_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on public.sales (customer_id, sold_at desc);
create index on public.sales (set_id);
create index on public.sales (piece_id);

alter table public.sales enable row level security;
create policy staff_all on public.sales for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
