import {newRace,applyRace,raceView,RaceError} from './race-core.mjs';
export async function raceApi(request,uid,path,origin,{rpc,questions,allowedOrigin}){
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowedOrigin,'Vary':'Origin'}});
 const call=async(action,extra={})=>{const r=await rpc('drive98_race',{p_uid:uid,p_action:action,...extra});if(r.error)throw new RaceError(r.error,r.status||400);return r;};
 try{
  if(request.method==='GET'&&path==='/api/race'){
   const r=await call('list');return reply({serverNow:Date.now(),friends:r.friends,code:r.code,active:r.active,room:r.room?raceView(r.room,uid):null});
  }
  if(request.method==='GET'&&/^\/api\/race\/[0-9a-f-]{36}$/.test(path)){const r=await call('load',{p_room:path.split('/').at(-1)});return reply({room:raceView(r.room,uid),serverNow:Date.now()});}
  if(request.method!=='POST'||path!=='/api/race')return reply({error:'Не найдено'},404);
  if(origin!==allowedOrigin||!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'Запрос отклонён'},403);
  const raw=await request.text();if(raw.length>3000)return reply({error:'Слишком большой запрос'},413);let b;try{b=JSON.parse(raw);}catch{return reply({error:'Некорректный запрос'},400);}
  if(!b||typeof b!=='object'||Array.isArray(b))return reply({error:'Некорректный запрос'},400);
  if(b.action==='create'){
   if(typeof b.friendCode!=='string'||!/^\w{20}$/.test(b.friendCode))throw new RaceError('Выбери приглашённого друга');
   const r=await call('create',{p_guest:b.friendCode,p_state:newRace(questions)});return reply({room:raceView(r.room,uid),serverNow:Date.now()});
  }
  if(!['join','ready','answer','cancel'].includes(b.action)||typeof b.roomId!=='string'||!/^[0-9a-f-]{36}$/.test(b.roomId))throw new RaceError('Некорректное действие');
  for(let i=0;i<3;i++){
   const {room}=await call('load',{p_room:b.roomId});
   const side=room.host_id===uid?0:room.guest_id===uid?1:-1;if(side<0)throw new RaceError('Нет доступа к соревнованию',403);
   const next=applyRace(room.state_json,side,b.action,b,questions,Date.now());
   if(JSON.stringify(next)===JSON.stringify(room.state_json))return reply({room:raceView(room,uid),serverNow:Date.now()});
   const r=await call('commit',{p_room:b.roomId,p_revision:room.revision,p_state:next});
   if(!r.conflict)return reply({room:raceView(r.room,uid),serverNow:Date.now()});
  }
  return reply({error:'Состояние изменилось. Повтори действие.'},409);
 }catch(e){if(e instanceof RaceError)return reply({error:e.message},e.status);console.error('RACE_ERROR',e?.name);return reply({error:'Не удалось сохранить соревнование. Повтори попытку.'},503);}
}
