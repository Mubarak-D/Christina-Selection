-- Alerts use Sri Lanka dates (Asia/Colombo, UTC+5:30), and a handled set never counts as "no reply".
create or replace view public.alerts with (security_invoker = true) as
  with today as (select (now() at time zone 'Asia/Colombo')::date as d)
  select 'new_choice'::text as kind, c.id as customer_id, c.name as customer_name,
         s.id as set_id, coalesce(s.title, 'Selection') as label,
         (s.submitted_at at time zone 'Asia/Colombo')::date as due
    from public.selection_sets s join public.customers c on c.id = s.customer_id
   where s.submitted_at is not null and s.seen_at is null and s.handled_at is null
  union all
  select 'no_reply', c.id, c.name, s.id, coalesce(s.title, 'Selection'),
         (s.sent_at at time zone 'Asia/Colombo')::date
    from public.selection_sets s join public.customers c on c.id = s.customer_id
   where s.sent_at < now() - interval '3 days' and s.submitted_at is null and s.handled_at is null
  union all
  select 'upcoming_date', c.id, c.name, null, e.label, public.next_occurrence(e.d, today.d)
    from public.customers c
         cross join today
         cross join lateral (values ('Birthday', c.birthday), ('Anniversary', c.anniversary)) as e(label, d)
   where e.d is not null and public.next_occurrence(e.d, today.d) <= today.d + 7;

revoke all on public.alerts from anon;
