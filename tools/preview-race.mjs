// Isolated two-player adapter for local UI checks. No production calls or credentials.
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import vm from 'node:vm';import {fileURLToPath} from 'node:url';
import {freshPet} from '../server/drive98/pet-core.mjs';import {dailyView,applyDaily} from '../server/drive98/daily-core.mjs';import {raceApi} from '../server/drive98/race-api.mjs';
const dir=fileURLToPath(new URL('../',import.meta.url)),port=8879;
const questions=vm.runInNewContext((await fs.readFile(path.join(dir,'d98-pdd-bank-dece79312c40.js'),'utf8'))+';PDD_BANK');
const ids={host:'tg:101',guest:'tg:102'},names={'tg:101':'Тестовый игрок','tg:102':'Тестовый друг'};
function state(){return {schema:1,pet:{...freshPet(),onboarded:true,name:'Буль',focus:'parking',avatar:{kind:'shark'},sessions:[{at:Date.now(),total:1,correct:1}]},career:{done:[],active:null,awards:[],equippedAward:null,week:{},lastDriveDay:null},garage:{wallet:150,owned:['paint:0','rims:0','neon:0'],equipped:{paint:0,rims:0,neon:0}},modes:{dragWins:0,dragBest:null,driftWins:0},circuit:{routes:[],selected:null,equipped:null},claims:{},roadStories:{version:1,completed:{},run:null},drag:null,drift:null};}
const states={host:state(),guest:state()},revisions={host:0,guest:0},rooms=new Map();
const codeHost='aaaaaaaaaaaaaaaaaaaa',codeGuest='bbbbbbbbbbbbbbbbbbbb';
const enriched=(r,uid)=>({...structuredClone(r),other_name:names[r.host_id===uid?r.guest_id:r.host_id]});
async function rpc(name,p){if(name!=='drive98_race')throw Error('Unsupported local RPC');const uid=p.p_uid;
 if(p.p_action==='list'){const room=[...rooms.values()].find(r=>[r.host_id,r.guest_id].includes(uid)&&!['done','cancelled','expired'].includes(r.state_json.status));return {friends:uid===ids.host?[{code:codeGuest,name:names[ids.guest],active:true}]:[],code:uid===ids.host?codeHost:codeGuest,active:true,room:room?enriched(room,uid):null};}
 if(p.p_action==='create'){
  if(uid!==ids.host||p.p_guest!==codeGuest)return {error:'Можно вызвать только приглашённого друга.',status:403};
  let r=[...rooms.values()].find(r=>!['done','cancelled','expired'].includes(r.state_json.status));if(!r){r={id:crypto.randomUUID(),host_id:ids.host,guest_id:ids.guest,state_json:p.p_state,revision:0,expires_at:new Date(Date.now()+1800000).toISOString()};rooms.set(r.id,r);}return {room:enriched(r,uid)};
 }
 const r=rooms.get(p.p_room);if(!r||![r.host_id,r.guest_id].includes(uid))return {error:'Соревнование не найдено.',status:404};
 if(p.p_action==='commit'){if(r.revision!==p.p_revision)return {conflict:true};r.state_json=structuredClone(p.p_state);r.revision++;}
 return {room:enriched(r,uid)};
}
const json=(res,value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1:'+port),parts=u.pathname.split('/');
 if(parts[1]==='__api'){
  const player=parts[2]==='guest'?'guest':'host',uid=ids[player],api='/'+parts.slice(3).join('/');
  let raw='';for await(const chunk of req)raw+=chunk;
  if(api.startsWith('/api/race')){const request=new Request('http://127.0.0.1:'+port+api,{method:req.method,headers:{Origin:'http://127.0.0.1:'+port,'Content-Type':'application/json'},...(req.method==='POST'?{body:raw}:{})});const response=await raceApi(request,uid,api,'http://127.0.0.1:'+port,{rpc,questions,allowedOrigin:'http://127.0.0.1:'+port});res.writeHead(response.status,{'Content-Type':'application/json'});return res.end(await response.text());}
  const view=()=>({revision:revisions[player],profile:{nickname:names[uid],listed:false},access:{full:true,enforced:false,parking:false},parking:{access:false},state:{...states[player],daily:dailyView(states[player])}});
  if(api==='/api/me')return json(res,view());if(api==='/api/action'){const b=JSON.parse(raw),r=applyDaily(states[player],b.event,b.data);states[player]=r.state;revisions[player]++;return json(res,{...view(),feedback:r.feedback,reward:0});}
  return json(res,{error:'Unknown local API'},404);
 }
 const rel=decodeURIComponent(u.pathname).replace(/^\//,'')||'index.html',file=path.resolve(dir,rel);if(!file.startsWith(dir))throw Error('Invalid path');let body=await fs.readFile(file);
 if(rel==='index.html'){const player=u.searchParams.get('player')==='guest'?'guest':'host';body=Buffer.from(body.toString().replace("window.D98_API='https://hhkblqrnuqmhibvhmwef.supabase.co/functions/v1/drive98'","window.D98_API='/__api/"+player+"'").replace('const init=tg?.initData;','const init="LOCAL_RACE_PREVIEW";'));}
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.ttf':'font/ttf'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch(e){res.writeHead(404);res.end(e.message);}}).listen(port,'127.0.0.1',()=>console.log('Local two-player preview http://127.0.0.1:'+port+'/?player=host and ?player=guest'));
