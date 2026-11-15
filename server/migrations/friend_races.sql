-- All access is through the existing Telegram-authenticated Edge Function.
create table drive98_private.race_rooms (
 id uuid primary key default gen_random_uuid(),host_id text not null references drive98_private.players(user_id),guest_id text not null references drive98_private.players(user_id),
 state_json jsonb not null,revision bigint not null default 0,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 minutes',check(host_id<>guest_id)
);
create index race_rooms_host_created on drive98_private.race_rooms(host_id,created_at desc);
create index race_rooms_guest_created on drive98_private.race_rooms(guest_id,created_at desc);
create table drive98_private.race_slots(user_id text primary key references drive98_private.players(user_id),room_id uuid not null references drive98_private.race_rooms(id));
alter table drive98_private.race_rooms enable row level security;
alter table drive98_private.race_slots enable row level security;
revoke all on drive98_private.race_rooms,drive98_private.race_slots from public,anon,authenticated;
grant select,insert,update on drive98_private.race_rooms to service_role;
grant select,insert,update,delete on drive98_private.race_slots to service_role;

create function drive98_private.race_active(p_uid text) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from drive98_private.players p where p.user_id=p_uid and (
 exists(select 1 from drive98_private.activity_days d where d.user_id=p_uid) or
 jsonb_array_length(coalesce(p.state_json#>'{pet,sessions}','[]'::jsonb))>0 or
 exists(select 1 from jsonb_each(coalesce(p.state_json#>'{daily,days}','{}'::jsonb)) d where d.value->>'status'='complete') or
 exists(select 1 from jsonb_each(coalesce(p.state_json#>'{roadStories,completed}','{}'::jsonb)))
 ));
$$;
revoke all on function drive98_private.race_active(text) from public,anon,authenticated;
grant execute on function drive98_private.race_active(text) to service_role;

create function public.drive98_race(p_uid text,p_action text,p_room uuid default null,p_revision bigint default null,p_state jsonb default null,p_guest text default null)
returns jsonb language plpgsql set search_path='' as $$
declare r drive98_private.race_rooms; guest text; result jsonb; friends jsonb; own_code text; slot uuid; n integer;
begin
 if p_uid!~'^tg:[0-9]{1,16}$' or not exists(select 1 from drive98_private.players where user_id=p_uid) then raise exception 'Unknown player';end if;
 if p_action='list' then
  select code into own_code from drive98_private.social_players where user_id=p_uid;
  select coalesce(jsonb_agg(x.item order by x.arrived_at desc),'[]'::jsonb) into friends from (
   select a.arrived_at,jsonb_build_object('code',sp.code,'name',coalesce(nullif(p.nickname,''),'Друг'),'active',drive98_private.race_active(a.user_id)) as item
   from drive98_private.invite_arrivals a join drive98_private.players p on p.user_id=a.user_id join drive98_private.social_players sp on sp.user_id=a.user_id
   where a.inviter_id=p_uid and a.user_id<>p_uid order by a.arrived_at desc limit 100
  ) x;
  select * into r from drive98_private.race_rooms where (host_id=p_uid or guest_id=p_uid) and expires_at>now() and state_json->>'status' in ('waiting','running') order by created_at desc limit 1;
  if found then
   select case when p.user_id=p_uid then null else coalesce(nullif(p.nickname,''),'Друг') end into guest from drive98_private.players p where p.user_id=case when r.host_id=p_uid then r.guest_id else r.host_id end;
   result=to_jsonb(r)||jsonb_build_object('other_name',coalesce(guest,'Друг'));
  end if;
  return jsonb_build_object('friends',friends,'code',own_code,'room',result,'active',drive98_private.race_active(p_uid));
 end if;
 if p_action='create' then
  select sp.user_id into guest from drive98_private.social_players sp join drive98_private.invite_arrivals a on a.user_id=sp.user_id where sp.code=p_guest and a.inviter_id=p_uid and sp.user_id<>p_uid;
  if guest is null then return jsonb_build_object('error','Можно вызвать только друга, пришедшего по твоему приглашению.','status',403);end if;
  if not drive98_private.race_active(guest) then return jsonb_build_object('error','Друг должен сначала завершить одно задание или билет.','status',409);end if;
  if not drive98_private.race_active(p_uid) then return jsonb_build_object('error','Сначала заверши одно задание или билет.','status',409);end if;
  -- Lock the pair in stable order; reservations prevent two simultaneous rooms per person.
  perform pg_advisory_xact_lock(hashtextextended('race:'||least(p_uid,guest),0));
  perform pg_advisory_xact_lock(hashtextextended('race:'||greatest(p_uid,guest),0));
  delete from drive98_private.race_slots s using drive98_private.race_rooms t where s.room_id=t.id and s.user_id in (p_uid,guest) and (t.expires_at<=now() or t.state_json->>'status' in ('done','cancelled','expired'));
  select room_id into slot from drive98_private.race_slots where user_id in (p_uid,guest) limit 1;
  if slot is not null then
   select * into r from drive98_private.race_rooms where id=slot;
   if r.host_id<>p_uid or r.guest_id<>guest then return jsonb_build_object('error','У тебя или друга уже есть незавершённая игра.','status',409);end if;
  else
   select count(*) into n from drive98_private.race_rooms where host_id=p_uid and created_at>now()-interval '1 hour';
   if n>=30 then return jsonb_build_object('error','Слишком много новых игр. Попробуй позже.','status',429);end if;
   if p_state->>'status'<>'waiting' or jsonb_array_length(p_state->'ids')<>20 then raise exception 'Invalid race';end if;
   insert into drive98_private.race_rooms(host_id,guest_id,state_json) values(p_uid,guest,p_state) returning * into r;
   insert into drive98_private.race_slots(user_id,room_id) values(p_uid,r.id),(guest,r.id);
  end if;
 elsif p_action in ('load','commit') then
  select * into r from drive98_private.race_rooms where id=p_room and (host_id=p_uid or guest_id=p_uid) for update;
  if not found then return jsonb_build_object('error','Соревнование не найдено.','status',404);end if;
  if r.expires_at<=now() and r.state_json->>'status' not in ('done','cancelled','expired') then
   update drive98_private.race_rooms set state_json=jsonb_set(state_json,'{status}','"expired"'::jsonb),revision=revision+1 where id=r.id returning * into r;
  end if;
  if p_action='commit' then
   if r.revision<>p_revision then return jsonb_build_object('conflict',true);end if;
   if r.state_json->>'status' in ('done','cancelled','expired') then return jsonb_build_object('error','Соревнование завершено.','status',409);end if;
   update drive98_private.race_rooms set state_json=p_state,revision=revision+1 where id=r.id returning * into r;
  end if;
 else raise exception 'Invalid action';end if;
 if r.state_json->>'status' in ('done','cancelled','expired') then delete from drive98_private.race_slots where room_id=r.id;end if;
 select coalesce(nullif(nickname,''),'Друг') into guest from drive98_private.players where user_id=case when r.host_id=p_uid then r.guest_id else r.host_id end;
 return jsonb_build_object('room',to_jsonb(r)||jsonb_build_object('other_name',guest));
end $$;
revoke all on function public.drive98_race(text,text,uuid,bigint,jsonb,text) from public,anon,authenticated;
grant execute on function public.drive98_race(text,text,uuid,bigint,jsonb,text) to service_role;
