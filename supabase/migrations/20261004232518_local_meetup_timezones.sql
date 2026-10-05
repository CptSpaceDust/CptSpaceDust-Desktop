alter table public.meetup_requests
  add column if not exists time_zone text not null default 'America/Denver';

alter table public.meetup_availability_blocks
  add column if not exists time_zone text not null default 'America/Denver';

create or replace function public.validate_meetup_schedule()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  requested_start timestamptz;
  requested_end timestamptz;
  selected_day_start timestamptz;
  selected_day_end timestamptz;
begin
  if new.with_user_id is not null and new.with_user_id = new.user_id then
    raise exception 'Choose another crew member for this meetup.';
  end if;

  requested_start := (new.meetup_date + new.start_time) at time zone new.time_zone;
  requested_end := requested_start + make_interval(hours => new.duration);
  selected_day_start := new.meetup_date::timestamp at time zone new.time_zone;
  selected_day_end := (new.meetup_date + 1)::timestamp at time zone new.time_zone;

  if requested_end > selected_day_end then
    raise exception 'Choose a start time that ends before midnight.';
  end if;

  if exists (
    select 1
    from public.meetup_availability_blocks block
    where block.user_id in (new.user_id, new.with_user_id)
      and tstzrange(
        case
          when block.all_day
            then block.block_date::timestamp at time zone block.time_zone
          else (block.block_date + block.start_time) at time zone block.time_zone
        end,
        case
          when block.all_day
            then (block.block_date + 1)::timestamp at time zone block.time_zone
          else (block.block_date + block.end_time) at time zone block.time_zone
        end,
        '[)'
      ) && tstzrange(requested_start, requested_end, '[)')
  ) then
    raise exception 'That time overlaps unavailable hours. Choose another time.';
  end if;

  if exists (
    select 1
    from public.meetup_requests existing
    where existing.id <> new.id
      and existing.status = 'approved'
      and ((existing.meetup_date + existing.start_time) at time zone existing.time_zone) >= selected_day_start
      and ((existing.meetup_date + existing.start_time) at time zone existing.time_zone) < selected_day_end
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
before insert or update of meetup_date, start_time, time_zone, duration, status, with_user_id, invitee_status
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
  captain_involved boolean;
begin
  select coalesce(username, 'A crew member') into organizer_name
  from public.profiles where id = coalesce(new.user_id, old.user_id);
  select coalesce(username, 'a crew member') into invitee_name
  from public.profiles where id = coalesce(new.with_user_id, old.with_user_id);
  select exists (
    select 1 from public.profiles
    where id = coalesce(new.with_user_id, old.with_user_id)
      and lower(rank) = 'captain'
  ) into captain_involved;

  if tg_op = 'INSERT' then
    if new.with_user_id is not null then
      insert into public.notifications (user_id, type, title, message, link)
      values (
        new.with_user_id,
        'meetup_invitation',
        'New meetup invitation',
        organizer_name || ' invited you to a meetup. Open the calendar to see it in your local time.',
        'MeetupCalendar.html'
      );
    end if;
    if new.with_user_id is null or captain_involved then
      for captain in
        select id from public.profiles where lower(rank) = 'captain'
          and id <> new.user_id and id is distinct from new.with_user_id
      loop
        insert into public.notifications (user_id, type, title, message, link)
        values (
          captain.id,
          'meetup_request',
          'New meetup request involving the Captain',
          organizer_name || ' requested a meetup' ||
            case when new.with_user_id is not null then ' with ' || invitee_name else '' end || '.',
          'CaptainPanel.html'
        );
      end loop;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.invitee_status is distinct from old.invitee_status then
      insert into public.notifications (user_id, type, title, message, link)
      values (
        new.user_id,
        'meetup_response',
        case
          when new.invitee_status = 'accepted' and new.status = 'approved' then 'Meetup confirmed'
          when new.invitee_status = 'accepted' then 'Meetup invitation accepted'
          else 'Meetup invitation declined'
        end,
        case
          when new.invitee_status = 'accepted' and new.status = 'approved'
            then invitee_name || ' accepted your invitation. Your meetup is confirmed.'
          else invitee_name || ' ' || new.invitee_status || ' your meetup invitation.'
        end,
        'MeetupCalendar.html'
      );
    end if;
    if new.status is distinct from old.status
       and new.status in ('approved', 'denied')
       and not (new.invitee_status = 'declined' and old.invitee_status is distinct from new.invitee_status) then
      insert into public.notifications (user_id, type, title, message, link)
      select recipient,
        'meetup_update',
        case when new.status = 'approved' then 'Meetup approved' else 'Meetup not approved' end,
        'Your meetup was ' || new.status || '. Open the calendar to see it in your local time.',
        'MeetupCalendar.html'
      from (
        select new.user_id recipient
        union
        select new.with_user_id where new.with_user_id is not null
      ) recipients
      where not (
        old.invitee_status is distinct from new.invitee_status
        and new.invitee_status = 'accepted'
        and recipient = new.user_id
      );
    end if;
  elsif tg_op = 'DELETE' and old.with_user_id is not null then
    insert into public.notifications (user_id, type, title, message, link)
    values (
      old.with_user_id,
      'meetup_update',
      'Meetup request canceled',
      organizer_name || ' canceled the meetup request.',
      'MeetupCalendar.html'
    );
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.notify_meetup_participants() from public, anon, authenticated;
