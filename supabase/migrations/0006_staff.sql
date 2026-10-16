-- Being signed in is not enough: only accounts on this list are staff.
-- Protects customer data even if public signup is ever switched on.
create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.staff enable row level security; -- no policies: managed with the service key only

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.staff where user_id = auth.uid()) $$;

do $$
declare t text;
begin
  foreach t in array array['customers', 'pieces', 'piece_media', 'selection_sets', 'set_items'] loop
    execute format('drop policy staff_all on public.%I', t);
    execute format('create policy staff_all on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

drop policy staff_media_select on storage.objects;
drop policy staff_media_insert on storage.objects;
drop policy staff_media_delete on storage.objects;
create policy staff_media_select on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_staff());
create policy staff_media_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_staff());
create policy staff_media_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_staff());
