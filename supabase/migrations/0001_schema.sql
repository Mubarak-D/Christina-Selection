create extension if not exists pgcrypto with schema extensions;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,          -- E.164, e.g. +94771234567
  birthday date,
  anniversary date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.pieces (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price numeric(12,2),
  metal text,
  karat text,
  weight_g numeric(8,2),
  stones text,
  description text,
  in_catalogue boolean not null default true,  -- false = one-off added while building a set
  created_at timestamptz not null default now()
);

create table public.piece_media (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete cascade,
  path text not null,                  -- object path in the private "media" bucket
  kind text not null check (kind in ('image', 'video')),
  sort int not null default 0
);
create index on public.piece_media (piece_id);

create table public.selection_sets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text,
  -- 32-char url-safe secret used in the customer's link
  token text not null unique
    default translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'),
  sent_at timestamptz,
  submitted_at timestamptz,
  seen_at timestamptz,
  handled_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.selection_sets (customer_id);

create table public.set_items (
  set_id uuid not null references public.selection_sets(id) on delete cascade,
  piece_id uuid not null references public.pieces(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'chosen', 'dismissed')),
  primary key (set_id, piece_id)
);
create index on public.set_items (piece_id);
