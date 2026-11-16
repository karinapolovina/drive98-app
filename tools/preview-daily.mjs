import {applyCalm,calmView} from '../server/drive98/calm-core.mjs';
// Local-only test adapter. It never talks to production or accepts real Telegram credentials.
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {applyDaily,dailyView} from '../server/drive98/daily-core.mjs';import {freshPet} from '../server/drive98/pet-core.mjs';
const dir=fileURLToPath(new URL('../',import.meta.url));const PORT=Number(process.env.DAILY_PREVIEW_PORT||8878);
let state={schema:1,pet:{...freshPet(),onboarded:true,name:'Буль',focus:'parking',avatar:{kind:'shark'}},career:{done:[],active:null,awards:[],equippedAward:null,week:{},lastDriveDay:null},garage:{wallet:150,owned:['paint:0','rims:0','neon:0'],equipped:{paint:0,rims:0,neon:0}},modes:{dragWins:0,dragBest:null,driftWins:0},circuit:{routes:[],selected:null,equipped:null},claims:{},roadStories:{version:1,completed:{},run:null},drag:null,drift:null};let revision=0;const receipts=new Map();
function view(extra={}){return {revision,profile:{nickname:'Локальная проверка',listed:false},access:{full:true,enforced:false,parking:false},parking:{access:false},state:{...state,daily:dailyView(state),parkingCalm:calmView(state)},...extra};}
const json=(res,value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/__api/api/me')return json(res,view());if(url.pathname==='/__api/api/action'){
 let raw='';for await(const chunk of req)raw+=chunk;const b=JSON.parse(raw);if(receipts.has(b.requestId))return json(res,view(receipts.get(b.requestId)));if(b.revision!==revision)return json(res,view({error:'Прогресс изменился. Повтори действие.'}),409);
 try{const result=b.event.startsWith('pet.calm.')?applyCalm(state,b.event,b.data):applyDaily(state,b.event,b.data);state=result.state;revision++;const summary={reward:0,feedback:result.feedback};receipts.set(b.requestId,summary);return json(res,view(summary));}catch(e){return json(res,{error:e.message},400);}
 }
 const name=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html',file=path.resolve(dir,name);if(!file.startsWith(dir))return json(res,{error:'Not found'},404);
 let body=await fs.readFile(file);if(name==='index.html')body=Buffer.from(body.toString().replace("window.D98_API='https://hhkblqrnuqmhibvhmwef.supabase.co/functions/v1/drive98'","window.D98_API='/__api'").replace('const init=tg?.initData;','const init="LOCAL_DAILY_PREVIEW";'));
 const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.ttf':'font/ttf','.svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch(e){res.writeHead(404);res.end('Not found');}}).listen(PORT,'127.0.0.1',()=>console.log('Local preview http://127.0.0.1:'+PORT));
