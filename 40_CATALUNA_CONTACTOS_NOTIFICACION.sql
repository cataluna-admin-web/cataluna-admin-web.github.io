-- CATALUÑA · Emails adicionales de notificación por jugador
create table if not exists public.student_notification_contacts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  contact_name text,
  email text not null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint student_notification_contacts_email_not_empty
    check (length(trim(email)) > 3)
);

create unique index if not exists student_notification_contacts_student_email_uq
  on public.student_notification_contacts (student_id, lower(email));

alter table public.student_notification_contacts enable row level security;

drop policy if exists "admin manage student notification contacts"
  on public.student_notification_contacts;

create policy "admin manage student notification contacts"
on public.student_notification_contacts
for all
to authenticated
using (public.is_administrativo())
with check (public.is_administrativo());

grant select, insert, update, delete
on public.student_notification_contacts
to authenticated;
