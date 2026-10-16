-- Next anniversary of d on or after today. Feb 29 lands on Feb 28 in non-leap years
-- (Postgres date + interval 'n years' behaviour).
create function public.next_occurrence(d date, today date default current_date)
returns date
language sql
stable
as $$
  select case when this_year >= today then this_year
              else (d + make_interval(years => yrs + 1))::date end
  from (select (extract(year from today) - extract(year from d))::int as yrs) y,
       lateral (select (d + make_interval(years => y.yrs))::date as this_year) t
$$;

-- Staff dashboard alerts, derived on read. Windows: no reply after 3 days, dates within 7 days.
create view public.alerts with (security_invoker = true) as
  select 'new_choice'::text as kind, c.id as customer_id, c.name as customer_name,
         s.id as set_id, coalesce(s.title, 'Selection') as label, s.submitted_at::date as due
    from public.selection_sets s join public.customers c on c.id = s.customer_id
   where s.submitted_at is not null and s.seen_at is null and s.handled_at is null
  union all
  select 'no_reply', c.id, c.name, s.id, coalesce(s.title, 'Selection'), s.sent_at::date
    from public.selection_sets s join public.customers c on c.id = s.customer_id
   where s.sent_at < now() - interval '3 days' and s.submitted_at is null
  union all
  select 'upcoming_date', c.id, c.name, null, e.label, public.next_occurrence(e.d)
    from public.customers c
         cross join lateral (values ('Birthday', c.birthday), ('Anniversary', c.anniversary)) as e(label, d)
   where e.d is not null and public.next_occurrence(e.d) <= current_date + 7;

revoke all on public.alerts from anon;
