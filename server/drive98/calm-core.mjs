import {CALM_TASKS} from './calm-catalog.mjs';
import {petView,PetError} from './pet-core.mjs';
const initial=()=>({version:1,records:{},activeId:null,rewardAt:null});
const done=(p,t)=>p.records[t.id]?.status==='complete';
const unlocked=(p,i)=>i===0||done(p,CALM_TASKS[i-1]);
const fail=m=>{throw new PetError(m);};
const clip=(v,n=400)=>typeof v==='string'?v.trim().slice(0,n):'';
function publicTask(t,record,available){const {correct,explanation,takeaway,...task}=record?.task||t;return {...task,available,status:record?.status||'new',selected:record?.selected??null,completedAt:record?.completedAt||null,data:record?.data||{},...(record?.selected!==null&&record?.selected!==undefined?{correct,explanation,takeaway,right:record.selected===correct}:{}),clarityGain:record?.clarityGain||0};}
export function calmView(state){const p=state.parkingCalm||initial();const tasks=CALM_TASKS.map((t,i)=>publicTask(t,p.records[t.id],unlocked(p,i)));const completed=CALM_TASKS.filter(t=>done(p,t)).length;return {version:1,tasks,activeId:p.activeId,completed,total:9,stages:[1,2,3].map(stage=>({stage,completed:CALM_TASKS.filter(t=>t.stage===stage&&done(p,t)).length,total:3,available:tasks.find(t=>t.stage===stage).available})),finished:completed===9,reward:{id:'parking-plant',name:'Растение для комнаты',earned:!!p.rewardAt}};}
function complete(s,p,t,r,now){if(r.status==='complete')return;r.status='complete';r.completedAt=now;r.clarityGain=0;if(t.type==='quiz'){const n=s.pet.needs.clarity;s.pet.needs.clarity=Math.min(4,n+.5);r.clarityGain=s.pet.needs.clarity-n;}if(CALM_TASKS.every(t=>done(p,t))&&!p.rewardAt){p.rewardAt=now;s.pet.roomItems=[...new Set([...(s.pet.roomItems||[]),'parking-plant'])];}}
export function applyCalm(source,event,a={},now=Date.now()){
 const state=structuredClone(source);state.pet=petView(state.pet,now);if(!state.pet.onboarded)fail('Сначала заверши знакомство с героем');state.parkingCalm??=initial();const p=state.parkingCalm;
 const i=CALM_TASKS.findIndex(t=>t.id===a.id);if(i<0)fail('Задание не найдено');const t=CALM_TASKS[i];if(!unlocked(p,i))fail('Сначала заверши предыдущий шаг');
 if(event==='pet.calm.start'){p.activeId=t.id;p.records[t.id]??={status:'started',startedAt:now,selected:null,task:structuredClone(t),data:{}};return {state,reward:0,feedback:null};}
 const r=p.records[t.id];if(!r)fail('Сначала открой задание');const wasComplete=r.status==='complete';
 if(event==='pet.calm.answer'){
  if(t.type!=='quiz')fail('В этом задании нет вариантов ответа');
  if(r.selected===null){if(!Number.isInteger(a.choice)||a.choice<0||a.choice>=r.task.options.length)fail('Выбери вариант ответа');r.selected=a.choice;r.answeredAt=now;r.status='answered';}
 }else if(event==='pet.calm.complete'){
  if(t.type!=='quiz'||r.selected===null)fail('Сначала выбери ответ и прочитай разбор');complete(state,p,t,r,now);
 }else if(event==='pet.calm.complete'){
  if(t.type!=='quiz'||r.selected===null)fail('Сначала выбери ответ и прочитай разбор');complete(state,p,t,r,now);
 }else if(event==='pet.calm.prepare'){
  if(!['plan','approach'].includes(t.type))fail('Здесь нужна другая подготовка');
  if(r.status!=='complete'){
   if(t.type==='plan'){const primary=clip(a.primary),backup=clip(a.backup);if(primary.length<3||backup.length<3)fail('Запиши основное и запасное места');if(primary.toLowerCase()===backup.toLowerCase())fail('Запасной вариант должен отличаться от основного');r.data={primary,backup};}
   else{const approach=clip(a.approach,600);if(approach.length<5||a.entryChecked!==true||a.backupChecked!==true||a.beforeDeparture!==true)fail('Запиши подъезд и отметь три пункта подготовки');r.data={approach,entryChecked:true,backupChecked:true,beforeDeparture:true};}
   complete(state,p,t,r,now);
  }
 }else if(event==='pet.calm.review'){
  if(t.type!=='drive')fail('В этом шаге нет разбора поездки');
  if(r.status!=='complete'){
   if(a.stopped!==true||a.attempted!==true)fail('Разбираем опыт после остановки, когда попытка уже была');
   if(!['primary','backup','other','notparked'].includes(a.place)||!['solo','help','notyet'].includes(a.outcome))fail('Выбери место и результат попытки');
   if(a.place==='notparked'&&a.outcome!=='notyet')fail('Если не парковался, выбери «Пока не получилось»');
   r.data={place:a.place,outcome:a.outcome,note:clip(a.note,600),stopped:true,attempted:true,selfReported:true};complete(state,p,t,r,now);
  }
 }else if(event==='pet.calm.defer'){
  if(t.type!=='drive')fail('Отложить можно практическую попытку');if(r.status!=='complete'){r.deferredAt=now;r.status='deferred';}
 }else fail('Неизвестное действие задания');
 return {state,reward:0,completed:!wasComplete&&r.status==='complete',feedback:{kind:'calm',completed:r.status==='complete',clarityGain:r.clarityGain||0,courseFinished:CALM_TASKS.every(t=>done(p,t)),roomReward:!!p.rewardAt}};
}
