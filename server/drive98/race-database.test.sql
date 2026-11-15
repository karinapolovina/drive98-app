-- Synthetic, isolated fixtures; transaction always rolls back. Never touches real players.
begin;
do $$ begin
 if exists(select 1 from drive98_private.players where user_id in ('tg:999000001100001','tg:999000001100002','tg:999000001100003')) then raise exception 'Test IDs already exist; abort';end if;
end $$;
set local role service_role;
insert into drive98_private.players(user_id,nickname,listed,state_json,revision,week_key,week_rep) values
 ('tg:999000001100001','Race test host',false,'{"pet":{"sessions":[{"total":1,"correct":1}]}}',0,current_date,0),
 ('tg:999000001100002','Race test guest',false,'{}',0,current_date,0),
 ('tg:999000001100003','Race outsider',false,'{}',0,current_date,0);
insert into drive98_private.social_players(user_id,code,first_seen_day,last_seen_day) values
 ('tg:999000001100001','fa999000001100000001',current_date,current_date),
 ('tg:999000001100002','fa999000001100000002',current_date,current_date),
 ('tg:999000001100003','fa999000001100000003',current_date,current_date);
insert into drive98_private.invite_arrivals(user_id,inviter_id) values('tg:999000001100002','tg:999000001100001');
do $$
declare s jsonb; x jsonb; r jsonb; rid uuid; total integer;
begin
 if has_function_privilege('anon','public.drive98_race(text,text,uuid,bigint,jsonb,text)','EXECUTE') or has_function_privilege('authenticated','public.drive98_race(text,text,uuid,bigint,jsonb,text)','EXECUTE') then raise exception 'Public execute permission';end if;
 if has_table_privilege('anon','drive98_private.race_rooms','SELECT') or has_table_privilege('authenticated','drive98_private.race_rooms','SELECT') then raise exception 'Public table permission';end if;
 select jsonb_build_object('version',1,'status','waiting','ids',jsonb_agg('1-'||i),'players','[]'::jsonb) into s from generate_series(1,20)i;
 x=public.drive98_race('tg:999000001100001','create',p_state=>s,p_guest=>'fa999000001100000003');if (x->>'status')::integer<>403 then raise exception 'Uninvited guest accepted';end if;
 x=public.drive98_race('tg:999000001100001','create',p_state=>s,p_guest=>'fa999000001100000002');if (x->>'status')::integer<>409 then raise exception 'Inactive guest accepted';end if;
 update drive98_private.players set state_json='{"pet":{"sessions":[{"total":1,"correct":1}]}}' where user_id='tg:999000001100002';
 x=public.drive98_race('tg:999000001100001','create',p_state=>s,p_guest=>'fa999000001100000002');rid=(x#>>'{room,id}')::uuid;if rid is null then raise exception 'Eligible room not created: %',x;end if;
 x=public.drive98_race('tg:999000001100001','create',p_state=>s,p_guest=>'fa999000001100000002');if (x#>>'{room,id}')::uuid<>rid then raise exception 'Duplicate room created';end if;
 select count(*) into total from drive98_private.race_slots where room_id=rid;if total<>2 then raise exception 'Missing reservations';end if;
 x=public.drive98_race('tg:999000001100003','load',p_room=>rid);if (x->>'status')::integer<>404 then raise exception 'Third-party read accepted';end if;
 x=public.drive98_race('tg:999000001100001','commit',p_room=>rid,p_revision=>99,p_state=>s);if not (x->>'conflict')::boolean then raise exception 'Stale revision accepted';end if;
 x=public.drive98_race('tg:999000001100002','commit',p_room=>rid,p_revision=>0,p_state=>jsonb_set(s,'{status}','"cancelled"'));if x#>>'{room,state_json,status}'<>'cancelled' then raise exception 'Cancel failed';end if;
 select count(*) into total from drive98_private.race_slots where room_id=rid;if total<>0 then raise exception 'Reservations not released';end if;
 x=public.drive98_race('tg:999000001100001','create',p_state=>s,p_guest=>'fa999000001100000002');rid=(x#>>'{room,id}')::uuid;
 update drive98_private.race_rooms set expires_at=now()-interval '1 second' where id=rid;
 x=public.drive98_race('tg:999000001100002','load',p_room=>rid);if x#>>'{room,state_json,status}'<>'expired' then raise exception 'Room did not expire';end if;
 x=public.drive98_race('tg:999000001100001','list');if jsonb_array_length(x->'friends')<>1 or not (x#>>'{friends,0,active}')::boolean then raise exception 'Invitee list wrong';end if;
end $$;
rollback;
select 'passed' as database_checks,(select count(*) from drive98_private.players where user_id in ('tg:999000001100001','tg:999000001100002','tg:999000001100003')) as remaining_test_players;
