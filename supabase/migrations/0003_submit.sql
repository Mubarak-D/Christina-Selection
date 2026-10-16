-- The customer's only write path. Runs as owner (bypasses RLS) but touches only the set named by p_token.
-- Returns 'ok' | 'invalid' | 'locked'. A rejected submit changes nothing.
create function public.submit_selection(p_token text, p_chosen uuid[])
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.selection_sets;
begin
  select * into s from public.selection_sets where token = p_token for update;
  if not found then
    return 'invalid';
  end if;
  if s.handled_at is not null then
    return 'locked';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_chosen, '{}')) as c(piece_id)
    where not exists (select 1 from public.set_items i where i.set_id = s.id and i.piece_id = c.piece_id)
  ) then
    return 'invalid';
  end if;

  update public.set_items
     set status = case when piece_id = any(coalesce(p_chosen, '{}')) then 'chosen' else 'dismissed' end
   where set_id = s.id;
  update public.selection_sets set submitted_at = now(), seen_at = null where id = s.id;
  return 'ok';
end;
$$;

revoke all on function public.submit_selection(text, uuid[]) from public;
grant execute on function public.submit_selection(text, uuid[]) to anon, service_role;
