-- A customer's choice stays on the dashboard until staff mark the set handled.
-- is_new marks choices staff haven't opened yet (drives the "New" tag and nav badge).
drop view public.alerts;

create view public.alerts with (security_invoker = true) as
  with today as (select (now() at time zone 'Asia/Colombo')::date as d)
  select 'new_choice'::text as kind, c.id as customer_id, c.name as customer_name,
         s.id as set_id, coalesce(s.title, 'Selection') as label,
         (s.submitted_at at time zone 'Asia/Colombo')::date as due,
         s.seen_at is null as is_new
    from public.selection_sets s join public.customers c on c.id = s.customer_id
   where s.submitted_at is not null and s.handled_at is null
  union all
  select 'no_reply', c.id, c.name, s.id, coalesce(s.title, 'Selection'),
         (s.sent_at at time zone 'Asia/Colombo')::date, false
    from public.selection_sets s join public.customers c on c.id = s.customer_id
   where s.sent_at < now() - interval '3 days' and s.submitted_at is null and s.handled_at is null
  union all
  select 'deadline', c.id, c.name, null,
         case when c.deadline < today.d then 'Overdue' else 'Deadline' end, c.deadline, false
    from public.customers c cross join today
   where c.deadline is not null and c.deadline <= today.d + 7;

revoke all on public.alerts from anon;
