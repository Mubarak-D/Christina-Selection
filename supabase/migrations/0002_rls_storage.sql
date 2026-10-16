-- Staff only: every signed-in user is staff (signup is disabled, staff are invited).
-- The customer page never reads tables directly; it goes through server code and submit_selection().
do $$
declare t text;
begin
  foreach t in array array['customers', 'pieces', 'piece_media', 'selection_sets', 'set_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy staff_all on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800)  -- 50 MB
on conflict (id) do nothing;

create policy staff_media_select on storage.objects for select to authenticated using (bucket_id = 'media');
create policy staff_media_insert on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy staff_media_delete on storage.objects for delete to authenticated using (bucket_id = 'media');
