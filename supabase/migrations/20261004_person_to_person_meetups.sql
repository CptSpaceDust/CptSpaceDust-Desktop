alter table public.meetup_requests
  add column if not exists with_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists invitee_status text not null default 'pending';

alter table public.meetup_requests
  drop constraint if exists meetup_requests_invitee_status_check;
alter table public.meetup_requests
  add constraint meetup_requests_invitee_status_check
  check (invitee_status in ('pending', 'accepted', 'declined'));
alter table public.meetup_requests
  drop constraint if exists meetup_requests_duration_check;
alter table public.meetup_requests
  add constraint meetup_requests_duration_check check (duration between 1 and 8);

create index if not exists meetup_requests_with_user_date_idx
  on public.meetup_requests (with_user_id, meetup_date, status);

create table if not exists public.meetup_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  block_date date not null,
  all_day boolean not null default false,
  start_time time without time zone,
  end_time time without time zone,
  created_at timestamptz not null default now(),
  constraint meetup_availability_time_check check (
    (all_day and start_time is null and end_time is null)
    or
    (not all_day and start_time is not null and end_time is not null and start_time < end_time)
  )
);

create index if not exists meetup_availability_user_date_idx
  on public.meetup_availability_blocks (user_id, block_date);
create unique index if not exists meetup_availability_all_day_unique
  on public.meetup_availability_blocks (user_id, block_date)
  where all_day;
create unique index if not exists meetup_availability_partial_unique
  on public.meetup_availability_blocks (user_id, block_date, start_time, end_time)
  where not all_day;

alter table public.meetup_availability_blocks enable row level security;
revoke all on table public.meetup_availability_blocks from anon;
revoke all on table public.meetup_availability_blocks from authenticated;
grant select, insert, update, delete on table public.meetup_availability_blocks to authenticated;
grant all on table public.meetup_availability_blocks to service_role;

drop policy if exists "Crew can view meetup availability" on public.meetup_availability_blocks;
create policy "Crew can view meetup availability"
on public.meetup_availability_blocks for select
to authenticated
using (true);

drop policy if exists "Members can add their availability" on public.meetup_availability_blocks;
create policy "Members can add their availability"
on public.meetup_availability_blocks for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Members can update their availability" on public.meetup_availability_blocks;
create policy "Members can update their availability"
on public.meetup_availability_blocks for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Members can delete their availability" on public.meetup_availability_blocks;
create policy "Members can delete their availability"
on public.meetup_availability_blocks for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Invited members can view meetup requests" on public.meetup_requests;
create policy "Invited members can view meetup requests"
on public.meetup_requests for select
to authenticated
using ((select auth.uid()) = with_user_id);

revoke insert, update, delete, truncate, references, trigger
  on table public.meetup_requests from anon;

create or replace function public.validate_meetup_schedule()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  requested_end time;
begin
  if new.with_user_id is not null and new.with_user_id = new.user_id then
    raise exception 'Choose another crew member for this meetup.';
  end if;

  requested_end := new.start_time + make_interval(hours => new.duration);
  if extract(hour from new.start_time) * 60
       + extract(minute from new.start_time)
       + new.duration * 60 > 1440 then
    raise exception 'Choose a start time that ends before midnight.';
  end if;

  if exists (
    select 1
    from public.meetup_availability_blocks block
    where block.block_date = new.meetup_date
      and block.user_id in (new.user_id, new.with_user_id)
      and (
        block.all_day
        or (new.start_time < block.end_time and requested_end > block.start_time)
      )
  ) then
    raise exception 'That time overlaps unavailable hours. Choose another time.';
  end if;

  if exists (
    select 1
    from public.meetup_requests existing
    where existing.id <> new.id
      and existing.meetup_date = new.meetup_date
      and existing.status = 'approved'
      and (
        existing.user_id in (new.user_id, new.with_user_id)
        or existing.with_user_id in (new.user_id, new.with_user_id)
      )
  ) then
    raise exception 'One of you already has an approved meetup that day.';
  end if;

  if new.status = 'approved'
     and new.with_user_id is not null
     and new.invitee_status <> 'accepted' then
    raise exception 'The invited member must accept before this meetup can be approved.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_meetup_schedule_trigger on public.meetup_requests;
create trigger validate_meetup_schedule_trigger
before insert or update of meetup_date, start_time, duration, status, with_user_id, invitee_status
on public.meetup_requests
for each row execute function public.validate_meetup_schedule();

revoke all on function public.validate_meetup_schedule() from public, anon, authenticated;

create or replace function public.notify_meetup_participants()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  organizer_name text;
  invitee_name text;
  captain record;
begin
  select coalesce(username, 'A crew member') into organizer_name
  from public.profiles where id = coalesce(new.user_id, old.user_id);
  select coalesce(username, 'a crew member') into invitee_name
  from public.profiles where id = coalesce(new.with_user_id, old.with_user_id);

  if tg_op = 'INSERT' then
    if new.with_user_id is not null then
      insert into public.notifications (user_id, type, title, message, link)
      values (
        new.with_user_id,
        'meetup_invitation',
        'New meetup invitation',
        organizer_name || ' invited you to a meetup on ' || to_char(new.meetup_date, 'Mon FMDD') || '.',
        'MeetupCalendar.html'
      );
    end if;
    for captain in
      select id from public.profiles where lower(rank) = 'captain'
        and id <> new.user_id and id is distinct from new.with_user_id
    loop
      insert into public.notifications (user_id, type, title, message, link)
      values (
        captain.id,
        'meetup_request',
        'New meetup request',
        organizer_name || ' requested a meetup' ||
          case when new.with_user_id is not null then ' with ' || invitee_name else '' end || '.',
        'CaptainPanel.html'
      );
    end loop;
  elsif tg_op = 'UPDATE' then
    if new.invitee_status is distinct from old.invitee_status then
      insert into public.notifications (user_id, type, title, message, link)
      values (
        new.user_id,
        'meetup_response',
        case when new.invitee_status = 'accepted' then 'Meetup invitation accepted' else 'Meetup invitation declined' end,
        invitee_name || ' ' || new.invitee_status || ' your meetup invitation.',
        'MeetupCalendar.html'
      );
      if new.invitee_status = 'accepted' then
        for captain in
          select id from public.profiles where lower(rank) = 'captain'
            and id <> new.user_id and id <> new.with_user_id
        loop
          insert into public.notifications (user_id, type, title, message, link)
          values (
            captain.id,
            'meetup_response',
            'Meetup invitation accepted',
            organizer_name || ' and ' || invitee_name || ' are ready for meetup approval.',
            'CaptainPanel.html'
          );
        end loop;
      end if;
    end if;
    if new.status is distinct from old.status
       and new.status in ('approved', 'denied')
       and not (new.invitee_status = 'declined' and old.invitee_status is distinct from new.invitee_status) then
      insert into public.notifications (user_id, type, title, message, link)
      select recipient,
        'meetup_update',
        case when new.status = 'approved' then 'Meetup approved' else 'Meetup not approved' end,
        'Your meetup on ' || to_char(new.meetup_date, 'Mon FMDD') || ' was ' || new.status || '.',
        'MeetupCalendar.html'
      from (
        select new.user_id recipient
        union
        select new.with_user_id where new.with_user_id is not null
      ) recipients;
    end if;
  elsif tg_op = 'DELETE' and old.with_user_id is not null then
    insert into public.notifications (user_id, type, title, message, link)
    values (
      old.with_user_id,
      'meetup_update',
      'Meetup request canceled',
      organizer_name || ' canceled the meetup request for ' || to_char(old.meetup_date, 'Mon FMDD') || '.',
      'MeetupCalendar.html'
    );
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists notify_meetup_participants_trigger on public.meetup_requests;
create trigger notify_meetup_participants_trigger
after insert or update of status, invitee_status or delete
on public.meetup_requests
for each row execute function public.notify_meetup_participants();

revoke all on function public.notify_meetup_participants() from public, anon, authenticated;

create or replace function public.respond_to_meetup_invitation(
  target_meetup_id uuid,
  response text
)
returns public.meetup_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.meetup_requests;
begin
  if response not in ('accepted', 'declined') then
    raise exception 'Response must be accepted or declined.';
  end if;

  update public.meetup_requests
  set invitee_status = response,
      status = case when response = 'declined' then 'denied' else status end,
      admin_reason = case when response = 'declined' then 'The invited member declined.' else admin_reason end
  where id = target_meetup_id
    and with_user_id = (select auth.uid())
    and status = 'pending'
    and invitee_status = 'pending'
  returning * into updated;

  if updated.id is null then
    raise exception 'This meetup invitation is no longer available.';
  end if;
  return updated;
end;
$$;

revoke all on function public.respond_to_meetup_invitation(uuid, text) from public, anon;
grant execute on function public.respond_to_meetup_invitation(uuid, text) to authenticated;
