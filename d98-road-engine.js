(function(){
function begin(route){return {routeId:route.id,index:0,status:'question',selected:null,log:[]};}
function answer(state,route,task,number){
 if(state.status!=='question')return state;
 if(task.id!==route.task_ids[state.index])throw new Error('Scene does not match route');
 const choice=task.options.find(o=>o.number===number);
 if(!choice)throw new Error('Unknown answer');
 const correct=number===task.correct;
 return {...state,selected:number,status:correct?'feedback':'failed',log:[...state.log,{id:task.id,number,correct}]};
}
function advance(state,route){
 if(state.status!=='feedback')return state;
 return {...state,index:state.index+1,status:state.index+1===route.task_ids.length?'complete':'question',selected:null};
}

window.D98RoadEngine={begin,answer,advance};
})();

/* DRIVE98 learning menu; initialized after the page UI scripts. */
(function(){
 function installLearning(){
  if(window.D98LearningInstalled||typeof render!=='function')return;
  window.D98LearningInstalled=true;
  const previousRender=render;
  window.openDrive98Courses=function(){
   const url='https://t.me/Drive98_courses_bot';
   if(window.Telegram?.WebApp?.openTelegramLink)window.Telegram.WebApp.openTelegramLink(url);
   else window.open(url,'_blank','noopener,noreferrer');
  };
  render=function(){
   previousRender();
   if(state.tab==='home'){
    const menu=document.querySelector('.console-menu');
    const rank=menu?.querySelector('[onclick="go(\'rank\')"]');
    if(rank&&!menu.querySelector('[data-drive98-learning]')){
     const button=document.createElement('button');
     button.className='console-item';button.dataset.drive98Learning='true';
     button.innerHTML='Обучение DRIVE98<small>КУРСЫ И ГАЙДЫ ДЛЯ ТВОИХ ПОЕЗДОК</small>';
     button.onclick=()=>go('learning');rank.before(button);
    }
   }
   if(state.tab!=='learning')return;
   document.querySelector('.app').classList.add('game-screen','screen-learning');
   document.getElementById('content').innerHTML=screenHead('DRIVE98 / ОБУЧЕНИЕ','Из игры —<br>за руль.','Курсы и гайды для твоих настоящих поездок.')+
   '<div class="card"><div class="tag">01 / ПАРКОВКА</div><h2>Парковаться увереннее</h2><p>«Красивая парковка», материалы по параллельной парковке и коррекции положения машины.</p><button class="primary" onclick="openDrive98Courses()">Выбрать обучение по парковке ↗</button></div>'+
   '<div class="card"><div class="tag">02 / САМОСТОЯТЕЛЬНЫЕ ПОЕЗДКИ</div><h2>Начать ездить самостоятельно</h2><p>«7 свиданий» и гайд по уверенности за рулём. Выбери подходящий следующий шаг.</p><button class="primary" onclick="openDrive98Courses()">Посмотреть программы ↗</button></div>'+
   '<div class="card"><div class="tag">03 / МОЯ МАШИНА</div><h2>Разобраться со своей машиной</h2><p>Гайд по обслуживанию автомобиля: познакомься с материалом в каталоге DRIVE98.</p><button class="primary" onclick="openDrive98Courses()">Посмотреть гайд ↗</button></div>'+
   '<button class="secondary" onclick="go(\'home\')">Вернуться в меню</button>';
  };
  render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installLearning,{once:true});
 else installLearning();
})();

/* Contextual course offers: UI only, no changes to game rewards or progress. */
(function(){
function install(){
 if(window.D98OffersInstalled||typeof render!=='function')return;
 window.D98OffersInstalled=true;
 const products={
 parking:{title:'Парковаться увереннее',text:'«Красивая парковка» и материалы по параллельной парковке: выбери обучение для своей задачи.',cta:'Посмотреть обучение по парковке'},
 solo:{title:'Твой следующий самостоятельный выезд',text:'«7 свиданий» — программа для следующего шага к самостоятельным поездкам.',cta:'Посмотреть «7 свиданий»'},
 confidence:{title:'Больше уверенности за рулём',text:'Посмотри гайд по уверенности и программы DRIVE98 для настоящих поездок.',cta:'Подобрать материал'},
 maintenance:{title:'Разобраться со своей машиной',text:'Гайд по обслуживанию автомобиля и регламент ТО — в каталоге DRIVE98.',cta:'Посмотреть материалы по машине'}
 };
 const dismissed={};let lastTrip=null,report=null;
 try{Object.assign(dismissed,JSON.parse(sessionStorage.getItem('d98-offers-dismissed-v1')||'{}'))}catch{}
 function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function offer(key,product,lead){
  if(dismissed[key]||!products[product])return '';
  const p=products[product];
  return `<aside class="d98-context-offer" data-offer-key="${esc(key)}" aria-label="Обучение DRIVE98"><button class="d98-offer-close" data-offer-dismiss="${esc(key)}" aria-label="Скрыть предложение">×</button><div class="tag">ОБУЧЕНИЕ DRIVE98</div><p class="d98-offer-lead">${esc(lead)}</p><h2>${esc(p.title)}</h2><p>${esc(p.text)}</p><button class="primary" data-offer-open="${esc(product)}">${esc(p.cta)} ↗</button><button class="secondary" data-offer-catalog>Все курсы и гайды</button></aside>`;
 }
 function mount(root,key,product,lead){if(!root||root.querySelector('[data-offer-key]'))return;root.insertAdjacentHTML('beforeend',offer(key,product,lead))}
 function focusProduct(){const r=typeof currentRing==='function'?currentRing():null;return r?.focus==='Парковка'?'parking':r?.focus==='Самостоятельный выезд'?'solo':'confidence'}
 function roadProduct(){return lastTrip?.type==='garage'?'maintenance':['r01','r05','r06'].includes(lastTrip?.id)?'parking':'solo'}
 const style=document.createElement('style');style.textContent='.d98-context-offer{position:relative;margin:22px 0;padding:22px;border:1px solid #6d8746;border-left:3px solid #c8ef57;background:linear-gradient(130deg,#18251d,#101b24);color:#eef5f0;border-radius:6px;text-align:left}.d98-context-offer h2{font-size:26px;line-height:1.15;margin:10px 0}.d98-context-offer p{line-height:1.55;color:#c6d3cc}.d98-context-offer .tag{color:#c8ef57;padding-right:25px}.d98-context-offer .d98-offer-lead{font-size:13px;margin:12px 0 4px}.d98-context-offer .primary,.d98-context-offer .secondary{width:100%;white-space:normal}.d98-offer-close{position:absolute;right:10px;top:9px;background:transparent;border:0;color:#c6d3cc;font-size:25px;width:32px;height:32px;cursor:pointer}';document.head.append(style);
 document.addEventListener('click',event=>{
  const dismiss=event.target.closest('[data-offer-dismiss]');
  if(dismiss){dismissed[dismiss.dataset.offerDismiss]=true;try{sessionStorage.setItem('d98-offers-dismissed-v1',JSON.stringify(dismissed))}catch{}dismiss.closest('[data-offer-key]')?.remove();return}
  if(event.target.closest('[data-offer-open]')){window.openDrive98Courses();return}
  if(event.target.closest('[data-offer-catalog]')){if(typeof closeModal==='function')closeModal();go('learning');return}
  const start=event.target.closest('[data-road-action="start"]');
  if(start){lastTrip=window.D98_ROAD_STORIES?.routes.find(r=>r.id===start.dataset.roadValue)||null}
 },true);
 const before=render;
 render=function(){
  before();const root=document.getElementById('content');if(!root)return;
  if(state.tab==='home')mount(root,'home','solo','Игра помогает разбирать ситуации. Продолжи обучение для своих поездок.');
  else if(state.tab==='roadstories'){
   if(root.querySelector('.road-picker')){
    const garage=!!root.querySelector('[data-road-action="start"][data-road-value^="g"]');
    mount(root,'career-list-'+(garage?'garage':'route'),garage?'maintenance':'parking','Выбери материал для следующей поездки.');
   }else if(root.querySelector('.is-wasted'))mount(root.querySelector('.is-wasted'),'road-review-'+(lastTrip?.id||'trip'),roadProduct(),'Разбор выше поможет исправить ответ. Здесь — обучение для практики за рулём.');
   else if((root.querySelector('.screen-code')?.textContent||'').includes('TRIP COMPLETE')){
    if(!root.querySelector('.garage-pdf-context'))mount(root,'road-finish-'+(lastTrip?.id||'trip'),roadProduct(),'Маршрут пройден. Что хочешь освоить в своей машине?');
   }
  }else if(state.tab==='drag'){
   if(typeof drag!=='undefined'&&drag.phase==='finish')mount(root,'drag-finish','confidence','Заезд завершён. Следующий шаг — твои настоящие поездки.');
  }else if(state.tab==='circuit'){
   const r=typeof currentRing==='function'?currentRing():null;
   const done=r&&typeof ringComplete==='function'&&ringComplete(r);
   const product=report?.product||focusProduct();
   mount(root,report?'trip-report':done?'route-complete':'route-preparation',product,report?'Поездка сохранена. Выбери поддержку для следующего выезда.':done?'Три круга позади. Подготовься к следующему маршруту.':'Готовишь маршрут? Подбери обучение под свой фокус.');report=null;
  }else if(state.tab==='garage'){
   if(!root.querySelector('.garage-pdf-context'))mount(root,'garage','maintenance','Игровой гараж настроен. А что нужно твоему автомобилю?');
  }else if(state.tab==='tasks')mount(root,'missions','solo','Перед самостоятельной поездкой можно подготовиться с DRIVE98.');
  else if(state.tab==='map')mount(root,'city-map','solo','Открывай новые направления и в своих настоящих поездках.');
  else if(state.tab==='drift'&&typeof drift!=='undefined'&&drift.done)mount(root,'drift','confidence','Хочешь перенести разобранные ситуации в практику?');
 };
 function wrap(name,after){const original=window[name];if(typeof original!=='function')return;window[name]=function(...args){const result=original.apply(this,args);after();return result}}
 wrap('openRoutePlanner',()=>mount(document.querySelector('.sheet'),'planner',focusProduct(),'Маршрут, въезд и парковка: подготовься до выезда.'));
 wrap('ringHistory',()=>mount(document.querySelector('.sheet'),'route-journal',focusProduct(),'Выбери материал для своего следующего шага.'));
 wrap('openCareerMission',()=>{const sheet=document.querySelector('.sheet');if(sheet&&!sheet.querySelector('.quiz-options'))mount(sheet,'mission-brief','solo','Подготовка к реальной поездке — отдельный навык.')});
 const finishLap=window.finishRingLap;
 if(typeof finishLap==='function')window.finishRingLap=function(...args){
  const outcome=document.getElementById('ring-outcome')?.value;
  const confidence=Number(document.getElementById('ring-confidence')?.value);
  const stopped=document.getElementById('ring-stopped')?.checked;
  if(outcome&&outcome!=='postpone'&&stopped&&confidence>=1&&confidence<=5)report={product:confidence<=2?'confidence':focusProduct()};
  try{const result=finishLap.apply(this,args);if(result&&typeof result.then==='function')return result.finally(()=>{report=null});if(document.getElementById('ring-outcome'))report=null;return result}catch(error){report=null;throw error}
 };
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
