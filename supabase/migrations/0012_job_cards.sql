-- Job cards: a custom order written up clearly for the maker.
-- customer_words is the customer's own text, appended by the app, never written by AI.
create table public.job_cards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_no bigint generated always as identity unique,
  source text not null check (source in ('whatsapp', 'website', 'walk_in', 'phone')),
  due_date date,
  taken_by uuid default auth.uid(),
  customer_words jsonb not null default '[]',   -- [{at, text}], append-only
  fields jsonb not null default '{}',
  edited text[] not null default '{}',          -- field keys a person set; AI fill skips them
  questions jsonb not null default '[]',
  instructions_en text[] not null default '{}',
  instructions_si text[] not null default '{}',
  revision int not null default 1,
  printed_at timestamptz,
  changes jsonb not null default '[]',          -- [{field, old, new, at}] after first print
  created_at timestamptz not null default now()
);
create index on public.job_cards (customer_id);
create index on public.job_cards (due_date);

create table public.job_card_media (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards(id) on delete cascade,
  path text not null,                  -- object path in the private "media" bucket, under jobs/<id>/
  caption text,
  sort int not null default 0
);
create index on public.job_card_media (job_card_id);

alter table public.job_cards enable row level security;
alter table public.job_card_media enable row level security;
create policy staff_all on public.job_cards for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.job_card_media for all to authenticated using (public.is_staff()) with check (public.is_staff());
