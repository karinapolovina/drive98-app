import {DAILY_TASKS} from './daily-catalog.mjs';
import {petView,PetError} from './pet-core.mjs';
const DAY=86400000;
export const moscowDay=now=>new Date(Number(now)+3*3600000).toISOString().slice(0,10);
const addDays=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*DAY).toISOString().slice(0,10);
const initial=()=>({version:1,days:{},reviews:{},practice:null});
const unfinished=d=>Object.values(d.days).filter(r=>r.status!=='complete').sort((a,b)=>a.day.localeCompare(b.day))[0];
function choose(d,focus,day,tasks){
 const due=tasks.filter(t=>d.reviews[t.id]?.due<=day).sort((a,b)=>d.reviews[a.id].due.localeCompare(d.reviews[b.id].due)||((d.reviews[a.id].lastSeen||'').localeCompare(d.reviews[b.id].lastSeen||''))||a.level-b.level);
 if(due.length)return due[0];
 const fresh=tasks.filter(t=>!d.reviews[t.id]);
 const preferred=fresh.filter(t=>t.focus.includes(focus));
 const pool=preferred.length?preferred:fresh.length?fresh:tasks;
 return [...pool].sort((a,b)=>(d.reviews[a.id]?.lastSeenAt||0)-(d.reviews[b.id]?.lastSeenAt||0)||a.level-b.level||a.id.localeCompare(b.id))[0];
}
function record(task,day,now){return {day,status:'assigned',task:structuredClone(task),assignedAt:now,selected:null,completedAt:null,rewardGranted:false};}
function publicRecord(r){if(!r)return null;const {correct,explanation,takeaway,...task}=r.task;const out={...r,task};if(r.selected!==null){out.correct=correct;out.explanation=explanation;out.task.takeaway=takeaway;out.right=r.selected===correct;}return out;}
export function dailyView(state,now=Date.now()){
 const d=state.daily||initial(),day=moscowDay(now),active=unfinished(d)||d.days[day]||null;
 const completed=Object.values(d.days).filter(r=>r.status==='complete');
 return {serverNow:now,serverDay:day,active:publicRecord(active),practice:publicRecord(d.practice),progress:{completed:completed.length,unique:new Set(completed.map(r=>r.task.id)).size,firstCorrect:completed.filter(r=>r.selected===r.task.correct).length,needsRepeat:Object.values(d.reviews).filter(r=>r.wrong).length},history:completed.sort((a,b)=>b.day.localeCompare(a.day)).map(r=>({day:r.day,title:r.task.title,right:r.selected===r.task.correct})).slice(0,30)};
}
export function applyDaily(source,event,data={},now=Date.now(),tasks=DAILY_TASKS){
 const s=structuredClone(source);s.pet=petView(s.pet,now);s.daily??=initial();const d=s.daily,day=moscowDay(now);let feedback=null;
 if(!s.pet.onboarded)throw new PetError('Сначала выбери героя и заверши знакомство');
 if(event==='pet.daily.ensure'){
  if(!unfinished(d)&&!d.days[day]){const task=choose(d,s.pet.focus,day,tasks);if(!task)throw new PetError('Задания пока недоступны');d.days[day]=record(task,day,now);}
 }else if(event==='pet.daily.practice'){
  if(!d.practice||d.practice.status==='complete'){
   const repeats=tasks.filter(t=>d.reviews[t.id]?.wrong);const task=choose(d,s.pet.focus,day,data.repeatOnly&&repeats.length?repeats:tasks);d.practice={...record(task,day,now),id:crypto.randomUUID()};
  }
 }else{
  const practice=data.key==='practice',r=practice?d.practice:d.days[data.key];
  if(!r||r.task.id!==data.taskId||r.task.version!==data.version||(practice&&r.id!==data.attemptId))throw new PetError('Задание изменилось. Открой его ещё раз');
  if(event==='pet.daily.start'){if(r.status==='assigned'){r.status='started';r.startedAt=now;}}
  else if(event==='pet.daily.answer'){
   if(r.status==='assigned')throw new PetError('Сначала открой задание');
   if(r.status==='started'){
    if(!Number.isInteger(data.answer)||!r.task.options.some(o=>o.number===data.answer))throw new PetError('Выбери вариант ответа');
    r.selected=data.answer;r.answeredAt=now;r.status='answered';
   } // A retry never overwrites the first answer.
  }else if(event==='pet.daily.complete'){
   if(!['answered','complete'].includes(r.status))throw new PetError('Сначала выбери ответ и прочитай разбор');
   if(r.status!=='complete'){
    r.status='complete';r.completedAt=now;
    if(!practice&&!r.rewardGranted){
     const before=s.pet.needs.clarity;s.pet.needs.clarity=Math.min(4,before+1);r.clarityGain=s.pet.needs.clarity-before;r.rewardGranted=true;
    }else r.clarityGain=0;
    const old=d.reviews[r.task.id],right=r.selected===r.task.correct,streak=right?(old?.streak||0)+1:0;
    d.reviews[r.task.id]={streak,wrong:!right,lastSeen:day,lastSeenAt:now,due:addDays(day,right?[3,7,14][Math.min(streak-1,2)]:1)};
   }
   feedback={kind:'daily',completed:true,clarityGain:r.clarityGain||0,practice};
  }else throw new PetError('Неизвестное действие задания');
 }
 return {state:s,reward:0,feedback};
}
