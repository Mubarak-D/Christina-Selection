-- Customers: optional "needed by" deadline replaces birthday/anniversary;
-- contact is a WhatsApp number or an email (at least one).
drop view public.alerts;
drop function public.next_occurrence(date, date);

alter table public.customers
  drop column birthday,
  drop column anniversary,
  add column deadline date,
  add column email text,
  alter column phone drop not null,
  add constraint customers_contact check (phone is not null or email is not null);
create unique index customers_email_key on public.customers (lower(email));

create view public.alerts with (security_invoker = true) as
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
  -- Deadlines in the next 7 days, plus missed ones until staff change or clear them.
  select 'deadline', c.id, c.name, null,
         case when c.deadline < today.d then 'Overdue' else 'Deadline' end, c.deadline
    from public.customers c cross join today
   where c.deadline is not null and c.deadline <= today.d + 7;

revoke all on public.alerts from anon;
