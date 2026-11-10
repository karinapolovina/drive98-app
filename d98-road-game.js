/* Native game integration. Uses existing REP/CR economy; stores only new story completions. */
(function(){
 'use strict';
 const data=window.D98_ROAD_STORIES,engine=window.D98RoadEngine;
 if(!data||!engine)return;
 const tasks=Object.fromEntries(data.tasks.map(t=>[t.id,t]));
 const storageKey='d98-road-stories-v1';
 const remote=window.D98_ROAD_CLOUD;
 let progress={version:1,completed:{}};
 try{
  const loaded=JSON.parse(localStorage.getItem(storageKey)||'null');
  if(loaded?.version===1&&loaded.completed&&typeof loaded.completed==='object'&&!Array.isArray(loaded.completed)){
   for(const r of data.routes)if(loaded.completed[r.id])progress.completed[r.id]=loaded.completed[r.id];
  }
 }catch{}
 if(remote)progress=remote.read();
 let current=null,run=null,group='route',earned=0;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const done=r=>Object.prototype.hasOwnProperty.call(progress.completed,r.id);
 const unlocked=r=>!r.unlock_after||!!progress.completed[r.unlock_after];
 const action=(label,kind,value='',secondary=false,disabled=false)=>`<button class="${secondary?'secondary':'primary'}" data-road-action="${kind}" data-road-value="${escape(value)}" ${disabled?'disabled':''}>${label}</button>`;
 const titleFor=id=>data.routes.find(r=>r.id===id)?.title||'';
 function persist(){try{localStorage.setItem(storageKey,JSON.stringify(progress));}catch{toast('Не удалось сохранить прохождение на устройстве.')}}
 function open(filter='route'){
  group=['route','professional','garage','elective'].includes(filter)?filter:'route';
  current=null;run=null;earned=0;go('roadstories');
 }
 window.openRoadStories=open;
 async function start(id){
  const route=data.routes.find(r=>r.id===id);
  if(!route||!unlocked(route))return;
  if(remote){const result=await remote.call('road.start',{trip:id});if(!result)return;progress=remote.read();run=result.state.roadStories.run;}
  else run=engine.begin(route);
  current=route;earned=0;render();window.scrollTo(0,0);
 }
 function finish(){
  if(!done(current)){
   // Native modeAward also guards duplicate rewards and the existing weekly limit.
   earned=modeAward('road-story-'+current.id);saveModes();
   progress.completed[current.id]={at:new Date().toISOString()};persist();
  }
 }
 function explanation(task){
  const correct=task.options.find(o=>o.number===task.correct);
  return `<div class="road-correct"><b>Ответ источника</b><p>${escape(correct.text)}</p></div>${task.explanation?`<p>${escape(task.explanation)}</p>`:''}<a href="${escape(task.source)}?page=2" target="_blank" rel="noopener">Разбор «За рулём» ↗</a>`;
 }
 function list(){
  const visible=data.routes.filter(r=>r.type===group);
  return `<div class="screen-code">DRIFT / ДОРОЖНЫЕ ИСТОРИИ</div><h1>Поездка<br>с целью.</h1><p>Решай ситуации по порядку. Первая ошибка завершает всю попытку; после разбора можно начать заново.</p><div class="road-stat">${data.routes.filter(done).length} / ${data.routes.length} ИСТОРИЙ ПРОЙДЕНО</div><div class="game-tabs road-tabs">${[['route','Поездки'],['professional','Дополнительно'],['garage','Гараж'],['elective','Зима']].map(([id,label])=>`<button class="${group===id?'on':''}" data-road-action="group" data-road-value="${id}">${label}</button>`).join('')}</div><div class="road-picker">${visible.map(r=>{
   const available=unlocked(r),complete=done(r);
   return `<section class="road-card ${available?'':'road-locked'}"><small>${complete?'✓ ПРОЙДЕНО':available?'ДОСТУПНО':'ЗАКРЫТО'} · ${r.task_ids.length} ЗАДАЧ</small><h2>${escape(r.title)}</h2><p>${escape(r.goal)}</p>${!available?`<p class="road-unlock">Сначала заверши «${escape(titleFor(r.unlock_after))}».</p>`:''}${action(complete?'Пройти ещё раз →':available?'Начать поездку →':'Пока закрыто','start',r.id,false,!available)}</section>`;
  }).join('')}</div><p class="hud-caption">За первое завершение — до 5 REP / CR по общему недельному лимиту. Повтор — тренировка. Решения принимаются только вне движения.</p>${action('‹ Другие сюжетные поездки','legacy','',true)}`;
 }
 function completed(){
  const next=data.routes.filter(r=>r.unlock_after===current.id);
  return `<div class="screen-code">TRIP COMPLETE / ${run.log.length} ИЗ ${current.task_ids.length}</div><h1>Маршрут<br>пройден.</h1><h2>${escape(current.title)}</h2><p>${escape(current.finish)}</p><div class="road-correct">Все задания решены верно за одну попытку.</div><div class="brief-grid"><div>НАГРАДА<strong>+${earned} REP / CR</strong></div><div>ГАРАЖ<strong>${wallet} CR</strong></div></div>${earned?'':'<p>Повторное прохождение или недельный лимит: новая награда не начислена.</p>'}${next.length?`<div class="road-card"><b>Открылись истории</b>${next.map(r=>`<p>${escape(r.title)}</p>`).join('')}</div>`:''}${action('К выбору поездки','list')}${action('Пройти заново','restart','',true)}`;
 }
 function failure(task,scene){
  const choice=task.options.find(o=>o.number===run.selected),f=choice.failure;
  // CSS variables consumed from an external stylesheet otherwise rebase relative URLs.
  const imageURL=new URL(f.image,document.baseURI).href;
  return `<section class="shopping-failure road-failure" style="--failure-image:url('${escape(imageURL)}')"><div class="failure-cover"></div><div class="failure-panel"><div class="failure-code">ПОЕЗДКА ПРЕРВАНА · СЦЕНА ${run.index+1}/${current.task_ids.length}</div><h1>WASTED</h1><h2>${escape(f.caption)}</h2><p>${escape(scene.title)}</p><div class="road-choice"><b>Твой ответ</b><p>${escape(choice.text)}</p></div><div class="failure-explain"><h2>Разбор ошибки</h2>${explanation(task)}<details><summary>Посмотреть исходную схему</summary><img class="road-scene" src="${escape(task.original)}" alt="Исходная схема задачи"></details></div><p class="road-image-note">${escape(f.illustration)}</p><p class="failure-reward">Попытка завершена без награды. Ранее заработанные REP, CR, детали гаража и завершённые истории сохранены.</p>${action('Начать поездку заново →','restart')}${action('К выбору поездки','list','',true)}</div></section>`;
 }
 function question(){
  const task=tasks[current.task_ids[run.index]],scene=current.scenes[run.index];
  if(run.status==='failed')return failure(task,scene);
  const ep=current.episodes.find(e=>e.task_ids.includes(task.id));
  return `<button class="trip-back" data-road-action="list">‹ К поездкам</button><div class="screen-code">${escape(current.title)} / ${run.index+1} ИЗ ${current.task_ids.length}</div><div class="road-progress"><i style="width:${run.index/current.task_ids.length*100}%"></i></div><h1>${escape(scene.title)}</h1><p>${escape(scene.transition)}</p><div class="story-scene"><img class="road-scene" src="${escape(task.preview)}" alt="Дорожная ситуация: ${escape(scene.title)}"><div class="scene-footer"><span>ЭПИЗОД ${ep.number} · РОЛИ МАШИН — ПО ИСХОДНОЙ СХЕМЕ</span></div></div><details class="road-original"><summary>Сверить с исходной схемой</summary><img class="road-scene" src="${escape(task.original)}" alt="Исходная схема «За рулём»"></details><h2 class="road-question">${escape(task.source_question)}</h2>${run.status==='question'?`<div class="race-answers">${task.options.map(o=>`<button data-road-action="answer" data-road-value="${o.number}"><span>${escape(o.text)}</span></button>`).join('')}</div><p class="hud-caption">Одна ошибка завершает всю поездку.</p>`:`<section class="road-explanation"><div class="screen-code">ВЕРНО / ПУТЬ ПРОДОЛЖАЕТСЯ</div>${explanation(task)}${action(run.index+1===current.task_ids.length?'Завершить поездку →':'Следующая сцена →','next')}</section>`}`;
 }
 const nativeRender=render;
 render=function(){
  if(remote)progress=remote.read();
  nativeRender();
  const content=document.getElementById('content');
  if(state.tab==='roadstories'){
   document.querySelector('.app').classList.add('game-screen','district-story','road-stories-screen');
   content.innerHTML=`<section class="road-stories">${!current?list():run.status==='complete'?completed():question()}</section>`;
  }else if(state.tab==='home'){
   const menu=document.querySelector('.console-menu');
   if(menu&&!menu.querySelector('[data-road-action]'))menu.insertAdjacentHTML('afterbegin','<button class="console-item" data-road-action="open">Дорожные истории<small>7 ПОЕЗДОК · ОШИБКА ПРЕРЫВАЕТ МАРШРУТ</small></button>');
  }else if(state.tab==='drift'&&!selectedDriftTrip){
   content.insertAdjacentHTML('afterbegin',`<section class="road-stories road-entry"><div class="screen-code">НОВЫЕ ДОРОЖНЫЕ ИСТОРИИ</div><h2>От выезда — до прибытия.</h2><p>7 основных поездок, дополнительные ситуации и гараж. 110 заданий с разбором и Wasted.</p>${action('Выбрать новый маршрут →','open')}</section>`);
  }else if(state.tab==='garage'){
   content.insertAdjacentHTML('beforeend',`<section class="road-stories road-entry"><h2>Проверить машину</h2><p>Освещение, индикаторы, колёса и доработки: 16 задач перед поездкой.</p>${action('Задания гаража →','open','garage')}</section>`);
  }else if(state.tab==='tasks'){
   content.insertAdjacentHTML('afterbegin',`<section class="road-stories road-entry"><b>Сначала разберись с дорогой</b><p>Сюжетные поездки с ситуациями, выбором действий и разбором ошибок.</p>${action('Открыть дорожные истории →','open')}</section>`);
  }
 };
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-road-action]');if(!button||button.disabled)return;
  const type=button.dataset.roadAction,value=button.dataset.roadValue;
  if(type==='open')return open(value||'route');
  if(state.tab!=='roadstories')return;
  if(type==='group'){group=value;current=null;run=null;render();return;}
  if(type==='start')return start(value);
  if(type==='list'){current=null;run=null;earned=0;render();window.scrollTo(0,0);return;}
  if(type==='legacy'){current=null;run=null;selectedDriftTrip=null;go('drift');return;}
  if(!current||!run)return;
  if(type==='restart')return start(current.id);
  if(type==='answer'){
   if(run.status!=='question')return;
   if(remote){const result=await remote.call('road.answer',{attemptId:run.attemptId,index:run.index,answer:Number(value)});if(!result)return;run=result.state.roadStories.run;}
   else run=engine.answer(run,current,tasks[current.task_ids[run.index]],Number(value));
   render();window.scrollTo(0,0);return;
  }
  if(type==='next'){
   if(run.status!=='feedback')return;
   if(remote){const result=await remote.call('road.next',{attemptId:run.attemptId,index:run.index});if(!result)return;run=result.state.roadStories.run;earned=result.reward||0;progress=remote.read();}
   else{run=engine.advance(run,current);if(run.status==='complete')finish();}
   render();window.scrollTo(0,0);
  }
 });
 render();
})();
