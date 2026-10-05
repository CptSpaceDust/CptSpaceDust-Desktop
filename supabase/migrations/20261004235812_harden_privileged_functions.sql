create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated, service_role;

-- Privileged implementations belong outside the exposed Data API schema. Their
-- public counterparts below are deliberately narrow, invoker-rights wrappers.
alter function public.create_collab_comment_notification(uuid) set schema private;
alter function public.create_dm_notification(uuid, uuid) set schema private;
alter function public.create_group_chat(uuid[], text, text) set schema private;
alter function public.create_idea_comment_notification(uuid) set schema private;
alter function public.create_notification(uuid, text, text, text, text) set schema private;
alter function public.edit_dm_message(text, text) set schema private;
alter function public.enforce_user_restriction() set schema private;
alter function public.is_captain() set schema private;
alter function public.is_group_member(uuid, uuid) set schema private;
alter function public.leave_group_chat(uuid, uuid) set schema private;
alter function public.manage_group_member(uuid, uuid, text) set schema private;
alter function public.manage_user_restriction(uuid, text, timestamptz) set schema private;
alter function public.reject_banned_email() set schema private;
alter function public.reject_banned_username() set schema private;
alter function public.respond_to_meetup_invitation(uuid, text) set schema private;
alter function public.rls_auto_enable() set schema private;
alter function public.set_user_restriction(uuid, text, timestamptz) set schema private;
alter function public.signup_identity_allowed(text, text) set schema private;
alter function public.touch_group_chat() set schema private;
alter function public.update_dm_conversation_timestamp() set schema private;
alter function public.update_music_updated_at() set schema private;
alter function public.update_shocker_presets_timestamp() set schema private;

alter function private.update_music_updated_at() set search_path = '';
alter function private.update_shocker_presets_timestamp() set search_path = '';

-- The generic notification endpoint previously let every signed-in user create
-- arbitrary notifications for any account. Keep the existing client contract,
-- but restrict it to real message requests, shared conversations and calls.
create or replace function private.create_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_message text,
  notification_link text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_name text;
  new_notification_id uuid;
  allowed boolean := false;
  group_key uuid;
  conversation_key uuid;
  group_name text;
  link_match text[];
  safe_title text;
  safe_message text;
  safe_link text;
begin
  if actor_id is null then
    raise exception 'Sign in to create a notification';
  end if;
  if target_user_id is null or target_user_id = actor_id then
    raise exception 'Choose another crew member';
  end if;
  if notification_type not in ('message', 'message_request', 'voice_call', 'voice_call_response') then
    raise exception 'Unsupported notification type';
  end if;
  if notification_link is null or char_length(notification_link) > 700 then
    raise exception 'Invalid notification link';
  end if;

  select coalesce(nullif(trim(p.username), ''), 'A crew member')
    into actor_name
  from public.profiles p
  where p.id = actor_id;

  if actor_name is null or not exists (select 1 from public.profiles p where p.id = target_user_id) then
    raise exception 'Crew member not found';
  end if;

  if notification_type = 'message_request' then
    allowed := exists (
      select 1 from public.dm_requests r
      where (r.sender_id = actor_id and r.recipient_id = target_user_id)
         or (r.sender_id = target_user_id and r.recipient_id = actor_id)
    );
    safe_link := 'Messages.html';
    if lower(coalesce(notification_title, '')) like '%declined%' then
      safe_title := 'Message Request Declined';
      safe_message := actor_name || ' declined your message request.';
    else
      safe_title := 'New Message Request';
      safe_message := actor_name || ' wants to start a conversation with you.';
    end if;
  else
    link_match := regexp_match(notification_link, 'group=([0-9a-fA-F-]{36})');
    if link_match is not null then
      group_key := link_match[1]::uuid;
      allowed := exists (
        select 1
        from public.group_members actor_member
        join public.group_members target_member
          on target_member.group_id = actor_member.group_id
        where actor_member.group_id = group_key
          and actor_member.user_id = actor_id
          and target_member.user_id = target_user_id
      );
      select g.name into group_name from public.group_conversations g where g.id = group_key;
    else
      link_match := regexp_match(notification_link, '(id|conversation)=([0-9a-fA-F-]{36})');
      if link_match is not null then
        conversation_key := link_match[2]::uuid;
        allowed := exists (
          select 1 from public.dm_conversations c
          where c.id = conversation_key
            and ((c.user_one = actor_id and c.user_two = target_user_id)
              or (c.user_two = actor_id and c.user_one = target_user_id))
        );
      end if;
    end if;

    safe_link := notification_link;
    if notification_type = 'message' then
      if group_key is null then
        raise exception 'Group notification link required';
      end if;
      if lower(coalesce(notification_title, '')) like 'added%' then
        safe_title := 'Added to a group conversation';
        safe_message := actor_name || ' added you to ' || coalesce(group_name, 'a group conversation') || '.';
      else
        safe_title := 'New group message in ' || coalesce(group_name, 'your group');
        safe_message := actor_name || ' sent a message.';
      end if;
    elsif notification_type = 'voice_call_response' then
      safe_title := 'Call declined';
      safe_message := actor_name || ' declined your voice call.';
    elsif lower(coalesce(notification_title, '')) = 'call ended' then
      safe_title := 'Call ended';
      safe_message := actor_name || ' ended the call.';
    else
      safe_title := 'Incoming voice call';
      safe_message := actor_name || ' wants to call you!';
    end if;
  end if;

  if not allowed then
    raise exception 'You cannot notify this crew member for that activity';
  end if;

  select n.id into new_notification_id
  from public.notifications n
  where n.user_id = target_user_id
    and n.type = notification_type
    and n.link is not distinct from safe_link
    and n.title = safe_title
    and n.created_at > now() - interval '10 seconds'
  order by n.created_at desc
  limit 1;

  if new_notification_id is not null then
    return new_notification_id;
  end if;

  insert into public.notifications (user_id, type, title, message, link)
  values (target_user_id, notification_type, safe_title, safe_message, safe_link)
  returning id into new_notification_id;

  return new_notification_id;
end;
$$;

drop policy if exists "Authenticated users can create notifications" on public.notifications;

-- Public API wrappers. These retain the names used by the website and desktop
-- app while the privileged implementation remains outside the exposed schema.
create function public.create_collab_comment_notification(target_post_id uuid)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_collab_comment_notification(target_post_id) $$;

create function public.create_dm_notification(target_user_id uuid, target_conversation_id uuid)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_dm_notification(target_user_id, target_conversation_id) $$;

create function public.create_group_chat(member_ids uuid[], group_name text, image_url text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_group_chat(member_ids, group_name, image_url) $$;

create function public.create_idea_comment_notification(target_idea_id uuid)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_idea_comment_notification(target_idea_id) $$;

create function public.create_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_message text,
  notification_link text default null
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_notification(target_user_id, notification_type, notification_title, notification_message, notification_link) $$;

create function public.edit_dm_message(message_key text, new_content text)
returns boolean language sql security invoker set search_path = ''
as $$ select private.edit_dm_message(message_key, new_content) $$;

create function public.is_captain()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_captain() $$;

create function public.is_group_member(group_key uuid, member_key uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_group_member(group_key, member_key) $$;

create function public.leave_group_chat(group_key uuid, new_owner uuid default null)
returns void language sql security invoker set search_path = ''
as $$ select private.leave_group_chat(group_key, new_owner) $$;

create function public.manage_group_member(group_key uuid, target_user uuid, operation text)
returns void language sql security invoker set search_path = ''
as $$ select private.manage_group_member(group_key, target_user, operation) $$;

create function public.manage_user_restriction(target_user uuid, restricted_action text, until_at timestamptz)
returns void language sql security invoker set search_path = ''
as $$ select private.manage_user_restriction(target_user, restricted_action, until_at) $$;

create function public.respond_to_meetup_invitation(target_meetup_id uuid, response text)
returns public.meetup_requests language sql security invoker set search_path = ''
as $$ select private.respond_to_meetup_invitation(target_meetup_id, response) $$;

create function public.set_user_restriction(target_user uuid, restricted_action text, until_at timestamptz)
returns void language sql security invoker set search_path = ''
as $$ select private.set_user_restriction(target_user, restricted_action, until_at) $$;

create function public.signup_identity_allowed(candidate_email text, candidate_username text)
returns boolean language sql security invoker set search_path = ''
as $$ select private.signup_identity_allowed(candidate_email, candidate_username) $$;

-- Remove inherited PUBLIC execution, then grant only the intended callers.
revoke all on function private.create_collab_comment_notification(uuid) from public, anon, authenticated;
revoke all on function private.create_dm_notification(uuid, uuid) from public, anon, authenticated;
revoke all on function private.create_group_chat(uuid[], text, text) from public, anon, authenticated;
revoke all on function private.create_idea_comment_notification(uuid) from public, anon, authenticated;
revoke all on function private.create_notification(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function private.edit_dm_message(text, text) from public, anon, authenticated;
revoke all on function private.enforce_user_restriction() from public, anon, authenticated;
revoke all on function private.is_captain() from public, anon, authenticated;
revoke all on function private.is_group_member(uuid, uuid) from public, anon, authenticated;
revoke all on function private.leave_group_chat(uuid, uuid) from public, anon, authenticated;
revoke all on function private.manage_group_member(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.manage_user_restriction(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function private.reject_banned_email() from public, anon, authenticated;
revoke all on function private.reject_banned_username() from public, anon, authenticated;
revoke all on function private.respond_to_meetup_invitation(uuid, text) from public, anon, authenticated;
revoke all on function private.rls_auto_enable() from public, anon, authenticated;
revoke all on function private.set_user_restriction(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function private.signup_identity_allowed(text, text) from public, anon, authenticated;
revoke all on function private.touch_group_chat() from public, anon, authenticated;
revoke all on function private.update_dm_conversation_timestamp() from public, anon, authenticated;
revoke all on function private.update_music_updated_at() from public, anon, authenticated;
revoke all on function private.update_shocker_presets_timestamp() from public, anon, authenticated;
grant execute on function private.create_collab_comment_notification(uuid) to authenticated, service_role;
grant execute on function private.create_dm_notification(uuid, uuid) to authenticated, service_role;
grant execute on function private.create_group_chat(uuid[], text, text) to authenticated, service_role;
grant execute on function private.create_idea_comment_notification(uuid) to authenticated, service_role;
grant execute on function private.create_notification(uuid, text, text, text, text) to authenticated, service_role;
grant execute on function private.edit_dm_message(text, text) to authenticated, service_role;
grant execute on function private.is_captain() to authenticated, service_role;
grant execute on function private.is_group_member(uuid, uuid) to authenticated, service_role;
grant execute on function private.leave_group_chat(uuid, uuid) to authenticated, service_role;
grant execute on function private.manage_group_member(uuid, uuid, text) to authenticated, service_role;
grant execute on function private.manage_user_restriction(uuid, text, timestamptz) to authenticated, service_role;
grant execute on function private.respond_to_meetup_invitation(uuid, text) to authenticated, service_role;
grant execute on function private.set_user_restriction(uuid, text, timestamptz) to authenticated, service_role;
grant execute on function private.signup_identity_allowed(text, text) to anon, authenticated, service_role;

revoke all on function public.create_collab_comment_notification(uuid) from public, anon, authenticated;
revoke all on function public.create_dm_notification(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_group_chat(uuid[], text, text) from public, anon, authenticated;
revoke all on function public.create_idea_comment_notification(uuid) from public, anon, authenticated;
revoke all on function public.create_notification(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.edit_dm_message(text, text) from public, anon, authenticated;
revoke all on function public.is_captain() from public, anon, authenticated;
revoke all on function public.is_group_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.leave_group_chat(uuid, uuid) from public, anon, authenticated;
revoke all on function public.manage_group_member(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.manage_user_restriction(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.respond_to_meetup_invitation(uuid, text) from public, anon, authenticated;
revoke all on function public.set_user_restriction(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.signup_identity_allowed(text, text) from public, anon, authenticated;
grant execute on function public.create_collab_comment_notification(uuid) to authenticated, service_role;
grant execute on function public.create_dm_notification(uuid, uuid) to authenticated, service_role;
grant execute on function public.create_group_chat(uuid[], text, text) to authenticated, service_role;
grant execute on function public.create_idea_comment_notification(uuid) to authenticated, service_role;
grant execute on function public.create_notification(uuid, text, text, text, text) to authenticated, service_role;
grant execute on function public.edit_dm_message(text, text) to authenticated, service_role;
grant execute on function public.is_captain() to authenticated, service_role;
grant execute on function public.is_group_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.leave_group_chat(uuid, uuid) to authenticated, service_role;
grant execute on function public.manage_group_member(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.manage_user_restriction(uuid, text, timestamptz) to authenticated, service_role;
grant execute on function public.respond_to_meetup_invitation(uuid, text) to authenticated, service_role;
grant execute on function public.set_user_restriction(uuid, text, timestamptz) to authenticated, service_role;
grant execute on function public.signup_identity_allowed(text, text) to anon, authenticated, service_role;

-- New functions should not become public RPC endpoints by default.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
