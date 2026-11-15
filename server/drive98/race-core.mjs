export class RaceError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const fail=(message,status=409)=>{throw new RaceError(message,status);};
export function newRace(questions,now=Date.now(),random=Math.random){
 const tickets=[...new Set(questions.map(q=>q.id.split('-')[0]))];const ticket=tickets[Math.floor(random()*tickets.length)];
 const bank=questions.filter(q=>q.id.split('-')[0]===ticket).sort((a,b)=>Number(a.id.split('-')[1])-Number(b.id.split('-')[1]));
 if(bank.length!==20)fail('Билет пока недоступен',503);
 return {version:1,status:'waiting',ticket,ids:bank.map(q=>q.id),createdAt:now,startAt:null,players:[{joined:true,ready:false,answers:[],finishedAt:null},{joined:false,ready:false,answers:[],finishedAt:null}]};
}
export function applyRace(source,side,event,data={},questions=[],now=Date.now()){
 const s=structuredClone(source),p=s.players[side];if(!p)fail('Нет доступа к соревнованию',403);
 if(event==='cancel'){if(!['done','cancelled','expired'].includes(s.status))s.status='cancelled';return s;}
 if(['done','cancelled','expired'].includes(s.status)){if(event==='answer'&&Number.isInteger(data.index)&&p.answers[data.index]?.choice===data.choice)return s;fail('Соревнование завершено');}
 if(event==='join'){if(s.status!=='waiting')return s;p.joined=true;return s;}
 if(event==='ready'){
  if(!p.joined)fail('Сначала присоединись к игре');if(s.startAt)return s;p.ready=data.ready===true;
  if(s.players.every(p=>p.joined&&p.ready)){s.startAt=now+3000;s.status='running';}
  return s;
 }
 if(event!=='answer')fail('Неизвестное действие',400);
 if(!s.startAt||now<s.startAt)fail('Дождись общего старта');
 if(!Number.isInteger(data.index)||data.index<0||data.index>=20)fail('Некорректный номер вопроса',400);
 if(data.index<p.answers.length){if(p.answers[data.index].choice===data.choice)return s;fail('Первый ответ уже сохранён');}
 if(data.index!==p.answers.length)fail('Сначала ответь на предыдущий вопрос');
 const q=questions.find(q=>q.id===s.ids[data.index]);if(!q||!Number.isInteger(data.choice)||data.choice<0||data.choice>=q.a.length)fail('Выбери вариант ответа',400);
 p.answers.push({id:q.id,choice:data.choice,right:data.choice===q.ok,at:now});
 if(p.answers.length===20)p.finishedAt=now;
 if(s.players.every(p=>p.finishedAt!==null))s.status='done';return s;
}
export function raceView(room,uid,now=Date.now()){
 const side=room.host_id===uid?0:room.guest_id===uid?1:-1;if(side<0)fail('Нет доступа к соревнованию',403);
 const s=room.state_json,ended=['done','cancelled','expired'].includes(s.status),me=s.players[side],other=s.players[1-side];
 const stats=p=>({errors:p.answers.filter(a=>!a.right).length,elapsedMs:p.finishedAt===null?null:Math.max(0,p.finishedAt-s.startAt)});
 let winner=null;if(s.status==='done'){const a=stats(s.players[0]),b=stats(s.players[1]);winner=a.errors!==b.errors?(a.errors<b.errors?0:1):a.elapsedMs!==b.elapsedMs?(a.elapsedMs<b.elapsedMs?0:1):'tie';}
 return {id:room.id,revision:room.revision,status:s.status,serverNow:now,expiresAt:room.expires_at,ticket:s.ticket,startAt:s.startAt,side,isHost:side===0,me:{joined:me.joined,ready:me.ready,count:me.answers.length,elapsedMs:me.finishedAt===null?null:Math.max(0,me.finishedAt-s.startAt),...(ended?stats(me):{}),finished:me.finishedAt!==null},friend:{name:room.other_name||'Друг',avatar:room.other_avatar||null,joined:other.joined,ready:other.ready,count:other.answers.length,finished:other.finishedAt!==null,...(ended?stats(other):{})},questionId:!ended&&s.startAt&&now>=s.startAt&&!me.finishedAt?s.ids[me.answers.length]:null,winner:winner==='tie'?'tie':winner===null?null:winner===side?'me':'friend',review:s.status==='done'?me.answers.map(a=>({id:a.id,choice:a.choice,right:a.right})):[]};
}
