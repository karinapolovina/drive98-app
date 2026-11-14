import {VERSION,MOVE_LENGTH,SCENARIOS,scenario,simulate,inGoal,maneuverView} from './maneuver-engine.mjs';
export const PARKING_PRODUCT='beautiful-parking-v1';
export class ParkingError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const fail=(message,status=409)=>{throw new ParkingError(message,status)};
function progress(s){return s.courseChapters?.parking||{};}
export function parkingView(state,access=false,ready=false){const p=progress(state),m=p.maneuvers||{},r=m.run;return {product:PARKING_PRODUCT,version:VERSION,access:!!access,verificationReady:!!ready,trips:SCENARIOS.map((s,i)=>({id:s.id,title:s.title,description:s.description,available:!!access&&(i===0||!!m.completed?.[SCENARIOS[i-1].id]),completed:!!m.completed?.[s.id]})),run:r?.version===VERSION&&(access||r.preview)?maneuverView(scenario(r.trip),r):null};}
export function applyParking(source,event,a={},access=false,now=new Date(),award){const state=structuredClone(source);state.courseChapters??={};state.courseChapters.parking??={};const p=state.courseChapters.parking;p.completed??={};p.maneuvers??={completed:{},run:null};const m=p.maneuvers;let reward=0,completed=false;
 if(event==='parking.start'){const preview=a.trip==='preview',s=scenario(preview?'place':a.trip);if(!s)fail('Манёвр не найден',404);if(!preview&&!access)fail('Полные манёвры открываются участникам каналов по парковке.',402);const i=SCENARIOS.indexOf(s);if(!preview&&i>0&&!m.completed[SCENARIOS[i-1].id])fail('Сначала заверши предыдущий манёвр.');m.run={version:VERSION,trip:s.id,preview,pose:{...s.start},status:'driving',moves:0,seq:0,attemptId:crypto.randomUUID(),history:[],frames:[],feedback:null};return {state,reward,completed};}
 const r=m.run;if(!r||r.version!==VERSION||r.attemptId!==a.attemptId||r.seq!==a.seq)fail('Шаг уже изменился. Открой манёвр заново.');if(!r.preview&&!access)fail('Участие в канале не подтверждено. Проверь доступ.',402);const s=scenario(r.trip);
 if(event==='parking.move'){if(!['driving','result','blocked'].includes(r.status))fail('Манёвр завершён. Начни новую попытку.');if(![1,-1].includes(a.gear)||![-1,0,1].includes(a.turn))fail('Выбери передачу и положение руля.',400);
  r.history.push({pose:{...r.pose},status:r.status});r.history=r.history.slice(-30);const next=simulate(s,r.pose,a.gear,a.turn,MOVE_LENGTH);r.pose=next.pose;r.frames=next.frames;r.moves++;r.feedback={gear:a.gear,turn:a.turn,hit:next.hit};r.status=next.hit?'blocked':'result';
  if(!next.hit&&inGoal(s,r.pose)){r.status=r.preview?'previewComplete':'complete';if(!r.preview&&!m.completed[s.id]){m.completed[s.id]={at:now.toISOString(),moves:r.moves};if(!p.completed[s.id]){reward=award?award(state,'course:parking:'+s.id,5,false,now):0;p.completed[s.id]={at:now.toISOString()};}completed=true;}}
  if(r.preview&&r.moves>=6&&r.status!=='previewComplete')r.status='previewComplete';
 }else if(event==='parking.continue'){if(!['result','blocked'].includes(r.status))fail('Сейчас нечего продолжать.');r.status='driving';r.feedback=null;r.frames=[];
 }else if(event==='parking.undo'){if(['complete','previewComplete'].includes(r.status)||!r.history.length)fail('Нет движения для отмены.');const prev=r.history.pop();r.frames=[r.pose,prev.pose];r.pose=prev.pose;r.status='driving';r.feedback=null;
 }else fail('Эта версия главы использует движения, а не ответы на вопросы.',400);
 r.seq++;return {state,reward,completed};
}


