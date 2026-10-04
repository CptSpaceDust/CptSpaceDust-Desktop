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
  requires_captain boolean;
begin
  if response not in ('accepted', 'declined') then
    raise exception 'Response must be accepted or declined.';
  end if;

  select exists (
    select 1
    from public.meetup_requests request
    join public.profiles invited on invited.id = request.with_user_id
    where request.id = target_meetup_id
      and lower(invited.rank) = 'captain'
  ) into requires_captain;

  update public.meetup_requests
  set invitee_status = response,
      status = case
        when response = 'declined' then 'denied'
        when requires_captain then status
        else 'approved'
      end,
      admin_reason = case
        when response = 'declined' then 'The invited member declined.'
        else admin_reason
      end
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
        organizer_name || ' invited you to a meetup on ' || to_char(new.meetup_date, 'Mon FMDD') || '.',
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
        'Your meetup on ' || to_char(new.meetup_date, 'Mon FMDD') || ' was ' || new.status || '.',
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
      organizer_name || ' canceled the meetup request for ' || to_char(old.meetup_date, 'Mon FMDD') || '.',
      'MeetupCalendar.html'
    );
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.notify_meetup_participants() from public, anon, authenticated;
