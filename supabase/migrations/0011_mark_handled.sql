-- Mark a set handled and record what was bought, in one step.
-- Only the first call wins (handled_at is set atomically); a second press or a second device
-- records nothing. Handling again after Reopen replaces the set's sales instead of adding.
-- Runs as the caller (security invoker), so the staff-only RLS rules apply.
-- Returns -1 if the set was already handled (or isn't visible), else the number of sales recorded.
create function public.mark_handled(p_set_id uuid, p_sold uuid[])
returns int
language plpgsql
set search_path = public
as $$
declare
  n int;
begin
  update public.selection_sets set handled_at = now() where id = p_set_id and handled_at is null;
  if not found then
    return -1;
  end if;
  delete from public.sales where set_id = p_set_id;
  insert into public.sales (customer_id, set_id, piece_id, title, price)
    select s.customer_id, s.id, p.id, p.title, p.price
      from public.selection_sets s
      join public.set_items i on i.set_id = s.id
      join public.pieces p on p.id = i.piece_id
     where s.id = p_set_id and p.id = any(coalesce(p_sold, '{}'));
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.mark_handled(uuid, uuid[]) from public, anon;
grant execute on function public.mark_handled(uuid, uuid[]) to authenticated, service_role;

-- Belt and braces: one sale per piece per set.
create unique index sales_set_piece_key on public.sales (set_id, piece_id)
  where set_id is not null and piece_id is not null;
