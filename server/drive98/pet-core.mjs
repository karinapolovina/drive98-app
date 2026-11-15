export const FOCUSES=['solo','parking','junction','lanes','route','return','basics'];
const clamp=n=>Math.max(0,Math.min(4,Number(n)||0));
export function freshPet(now=Date.now()){return {version:1,onboarded:false,avatar:{kind:'cat',sex:'f',coat:'ginger',hair:'brown',style:'bob',accessory:'none',outfit:'jacket'},name:'',focus:null,note:'',needs:{energy:4,mood:3,clarity:2,ready:1},at:now,sleepAt:null,lastCare:{},mistakes:[],solved:[],sessions:[],muted:false,playCount:0,toys:['ball']};}
export function petView(value,now=Date.now()){
 const p={...freshPet(now),...structuredClone(value||{})};p.needs={...freshPet(now).needs,...p.needs};
 if(p.sleepAt){const gain=Math.floor(Math.max(0,now-p.sleepAt)/300000);p.needs.energy=clamp(p.needs.energy+gain);if(gain&&p.needs.energy===4)p.sleepAt=null;else if(gain)p.sleepAt+=gain*300000;}
 return p;
}
export class PetError extends Error {constructor(message){super(message);this.status=400;}}
function reject(message){throw new PetError(message);}
function pick(value,options,def){return options.includes(value)?value:def;}
export function applyPet(source,event,data={},now=Date.now(),questions=[]){
 const s=structuredClone(source),p=petView(s.pet,now);s.pet=p;
 if(event==='pet.setup'){
  const a=data.avatar||{};p.avatar={kind:pick(a.kind,['human','cat','shark'],'cat'),sex:pick(a.sex,['m','f'],'f'),coat:pick(a.coat,['ginger','white','black'],'ginger'),hair:pick(a.hair,['brown','black','blonde','red'],'brown'),style:pick(a.style,['short','bob','long'],'bob'),accessory:pick(a.accessory,['none','glasses','sunglasses'],'none'),outfit:pick(a.outfit,['jacket','teal','leather'],'jacket')};
  p.name=String(data.name||'').trim().slice(0,24);if(!p.name)reject('Дай персонажу имя');
 }else if(event==='pet.focus'){
  p.focus=data.focus===null?null:pick(data.focus,FOCUSES,null);p.note=String(data.note||'').trim().slice(0,400);p.onboarded=true;
 }else if(event==='pet.settings'){p.muted=data.muted===true;}
 else if(event==='pet.care'){
  const action=data.action;if(!['pet','support','treat','play','sleep','wake'].includes(action))reject('Неизвестное действие');
  if(['support','treat'].includes(action)&&!['human','shark'].includes(p.avatar.kind))reject('Выбери доступную заботу для этого героя');
  if(action==='sleep'){if(!p.sleepAt)p.sleepAt=now;}
  else if(action==='wake')p.sleepAt=null;
  else {
   if(p.sleepAt)reject('Герой отдыхает. Сначала разбуди его');
   const group=['pet','support'].includes(action)?'affection':action;
   const delay=action==='play'?30000:action==='treat'?300000:10000;
   const last=group==='affection'?Math.max(p.lastCare.affection||0,p.lastCare.pet||0,p.lastCare.support||0):p.lastCare[group]||0;
   if(!last||now-last>=delay){
    p.lastCare[group]=now;p.lastCare[action]=now;
    p.needs.mood=clamp(p.needs.mood+(action==='treat'?.25:1));
    if(action==='treat')p.needs.energy=clamp(p.needs.energy+.5);
    if(action==='play'){p.needs.energy=clamp(p.needs.energy-.25);p.playCount=(p.playCount||0)+1;if(p.playCount>=3&&!p.toys?.includes('duck'))p.toys=[...(p.toys||['ball']),'duck'];}
   }
  }
 }else if(event==='pet.exam'){
  const answers=data.answers;if(!Array.isArray(answers)||!answers.length||answers.length>20)reject('Некорректная попытка');
  const map=new Map(questions.map(q=>[q.id,q]));const seen=new Set();let correct=0;
  for(const a of answers){const q=map.get(a.id);if(!q||seen.has(a.id)||!Number.isInteger(a.choice)||a.choice<0||a.choice>=q.a.length)reject('Некорректный ответ');seen.add(a.id);if(a.choice===q.ok){correct++;p.mistakes=p.mistakes.filter(id=>id!==a.id);if(!p.solved.includes(a.id))p.solved.push(a.id);}else if(!p.mistakes.includes(a.id))p.mistakes.push(a.id);}
  p.needs.clarity=clamp(p.needs.clarity+.5);p.needs.energy=clamp(p.needs.energy-.25);p.sessions=[{at:now,total:answers.length,correct},...p.sessions].slice(0,30);
 }else reject('Неизвестное действие персонажа');
 p.at=now;return {state:s,reward:0,feedback:null};
}
