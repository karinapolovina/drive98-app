/* First-visit guide. Profile changes use the existing authenticated save action. */
(function(){
function install(){
 if(window.D98OnboardingInstalled)return;
 if(typeof render!=='function'||typeof cloud==='undefined'){
  const observer=new MutationObserver(()=>{if(typeof render==='function'&&typeof cloud!=='undefined'){observer.disconnect();install()}});
  observer.observe(document.documentElement,{childList:true,subtree:true});return;
 }
 window.D98OnboardingInstalled=true;
 const uid=window.Telegram?.WebApp?.initDataUnsafe?.user?.id||'device';
 const storageKey='d98-onboarding-v1:'+uid;
 const steps=[
  {title:'Давай познакомимся',screen:'home',body:'Выбери ник — так ты будешь называться в игре. Если хочешь участвовать в общем рейтинге, поставь галочку. Это необязательно: играть и сохранять прогресс можно и без рейтинга.'},
  {title:'Мой маршрут',screen:'circuit',body:'Здесь ты готовишь настоящую поездку: например, до работы или магазина. Добавь маршрут, отметь сложные места, основную и запасную парковку. Затем повтори поездку трижды в разные дни и записывай, что получилось.',note:'Начни со знакомого пути. Заполняй отчёт только после остановки.'},
  {title:'Карьера',screen:'roadstories',body:'Это виртуальные поездки с дорожными ситуациями. Смотри на схему и выбирай действие. Проходи истории по порядку, чтобы открывать следующие.',note:'В водительских сценах ошибка показывает WASTED и разбор. Пока лимит не превышен, можно продолжить: одна ошибка на 6–9 вопросов, две на 10–12. В коротких историях до 5 вопросов ошибок нет. В пассажирских сценах ответ можно исправить на месте.'},
  {title:'Быстрая игра',screen:'drag',body:'Драг — короткий заезд из 10 случайных вопросов ПДД на время. Правильный ответ двигает машину вперёд. После ошибки прочитай объяснение и попробуй ещё раз.',note:'Рекорд сохраняется за заезд без ошибок. Сначала дождись загрузки схемы и внимательно её рассмотри.'},
  {title:'Гараж',screen:'garage',body:'Здесь твоя игровая машина. Меняй цвет, диски и подсветку за игровые кредиты CR. Во вкладке «ТО и обслуживание» разбирай ситуации по исправности машины, колёсам и оборудованию.',note:'REP — баллы для рейтинга. CR — игровые кредиты для гаража; это не рубли.'},
  {title:'Обучение DRIVE98',screen:'learning',body:'В этом разделе собраны твои следующие шаги за рулём: парковка, самостоятельные поездки и уход за машиной. Кнопки открывают каталог курсов и гайдов DRIVE98.',note:'Курсы и гайды — отдельные платные материалы. Их покупка не даёт преимущество в рейтинге.'},
  {title:'Рейтинг и друзья',screen:'rank',body:'Здесь можно сравнить свои REP с результатами участников за неделю. Чтобы твой ник появился в списке, включи «Участвовать в рейтинге» в профиле.',note:'Нажми на свой ник вверху экрана, чтобы изменить его или участие. В рейтинге видны ник и баллы; личные маршруты и разборы другим игрокам не показываются.'},
  {title:'Теперь можно начинать',screen:'home',body:'Для настоящей поездки начни с «Моего маршрута». Для тренировки решений — с «Карьеры» или «Быстрой игры». В строке под меню есть «Задания на практике», «Поделиться прогрессом» и «Как играть?». Постер сохраняется с твоим ником и результатами.',note:'Пользуйся игрой только вне движения. Это обучение можно открыть снова кнопкой «Как играть?» в главном меню.'}
 ];
 let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{}}catch{}
 let active=false,index=0,saving=false,dialog=null,draft=null,previousFocus=null,oldOverflow='';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function persist(done){saved={step:index,done};try{localStorage.setItem(storageKey,JSON.stringify(saved))}catch{}}
 function rememberDraft(){if(index===0&&dialog){const nick=dialog.querySelector('#d98-tour-nick'),listed=dialog.querySelector('#d98-tour-listed');if(nick&&listed)draft={nickname:nick.value,listed:listed.checked}}}
 function navigate(){const step=steps[index];if(typeof closeModal==='function')closeModal();if(step.screen==='roadstories'&&typeof openRoadStories==='function')openRoadStories('route');else go(step.screen)}
 function finish(destination='home'){
  if(saving)return;active=false;persist(true);dialog?.remove();dialog=null;
  const app=document.querySelector('.app');if(app)app.inert=false;document.body.style.overflow=oldOverflow;
  go(destination);const button=document.querySelector('[data-d98-tour-replay]');if(button)button.focus();else if(previousFocus?.isConnected)previousFocus.focus();
 }
 function draw(){
  if(!active)return;
  const step=steps[index];
  if(!dialog){dialog=document.createElement('div');dialog.className='d98-tour-backdrop';dialog.setAttribute('role','presentation');document.body.append(dialog)}
  const profile=cloud.profile;
  const nick=draft?.nickname??(/^DRIVER\s+[A-F0-9]+$/i.test(profile.nickname)?'':profile.nickname);
  const listed=draft?.listed??!!profile.listed;
  dialog.innerHTML=`<section class="d98-tour-dialog" role="dialog" aria-modal="true" aria-labelledby="d98-tour-title" aria-describedby="d98-tour-description" tabindex="-1"><div class="d98-tour-top"><span>КАК ИГРАТЬ · ${index+1} / ${steps.length}</span><button type="button" data-tour-skip aria-label="Пропустить обучение">Пропустить</button></div><div class="d98-tour-progress" aria-hidden="true">${steps.map((_,i)=>`<i class="${i<=index?'on':''}"></i>`).join('')}</div><h2 id="d98-tour-title">${escape(step.title)}</h2><p id="d98-tour-description">${escape(step.body)}</p>${index===0?`<form id="d98-tour-profile"><label for="d98-tour-nick">Твой ник</label><input id="d98-tour-nick" name="nickname" type="text" minlength="2" maxlength="24" autocomplete="nickname" placeholder="Например, Карина98" value="${escape(nick)}"><small>2–24 символа: буквы, цифры, пробел, дефис или _.</small><label class="d98-tour-checkbox"><input id="d98-tour-listed" type="checkbox" ${listed?'checked':''}><span>Участвовать в общем рейтинге</span></label><small>В рейтинге будут видны твой ник и баллы. Выбор можно изменить в профиле.</small></form>`:''}${step.note?`<p class="d98-tour-note">${escape(step.note)}</p>`:''}<p id="d98-tour-error" role="alert"></p><div class="d98-tour-actions">${index>0?'<button class="secondary" data-tour-back>Назад</button>':''}<button class="primary" data-tour-next>${index===0?'Сохранить и продолжить':index===steps.length-1?'Начать с моего маршрута':'Далее'}</button></div>${index===0?'<button class="d98-tour-link" data-tour-unchanged>Продолжить без изменений</button>':''}${index===steps.length-1?'<button class="d98-tour-link" data-tour-menu>Остаться в меню</button>':''}</section>`;
  dialog.querySelector('[data-tour-skip]').onclick=()=>finish();
  dialog.querySelector('[data-tour-next]').onclick=next;
  const back=dialog.querySelector('[data-tour-back]');if(back)back.onclick=()=>{if(saving)return;rememberDraft();index--;persist(false);navigate();draw()};
  const unchanged=dialog.querySelector('[data-tour-unchanged]');if(unchanged)unchanged.onclick=()=>{rememberDraft();advance()};
  const menu=dialog.querySelector('[data-tour-menu]');if(menu)menu.onclick=()=>finish();
  const form=dialog.querySelector('form');if(form)form.onsubmit=e=>{e.preventDefault();next()};
  dialog.querySelector('.d98-tour-dialog').focus();
 }
 function advance(){if(saving)return;if(index===steps.length-1){finish('circuit');return}index++;persist(false);navigate();draw()}
 async function next(){
  if(saving)return;
  if(index!==0){advance();return}
  rememberDraft();const nickname=draft.nickname.trim();const error=dialog.querySelector('#d98-tour-error');
  if(nickname.length<2||nickname.length>24||!/^[-\p{L}\p{N} _]+$/u.test(nickname)){error.textContent='Ник должен содержать 2–24 символа: буквы, цифры, пробел, дефис или _.';dialog.querySelector('#d98-tour-nick').focus();return}
  saving=true;dialog.querySelectorAll('button,input').forEach(el=>el.disabled=true);dialog.querySelector('[data-tour-next]').textContent='Сохраняю…';
  try{const result=await cloudAction('profile.save',{nickname,listed:draft.listed},()=>{});if(!result){error.textContent='Не удалось сохранить профиль. Попробуй ещё раз или продолжи без изменений.';return}render();saving=false;advance()}
  catch(e){error.textContent='Не удалось сохранить профиль. Попробуй ещё раз.'}
  finally{saving=false;if(dialog){dialog.querySelectorAll('button,input').forEach(el=>el.disabled=false);const button=dialog.querySelector('[data-tour-next]');if(index===0&&button)button.textContent='Сохранить и продолжить'}}
 }
 function start(resume=false){if(active||saving)return;previousFocus=document.activeElement;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';active=true;index=resume&&Number.isInteger(saved.step)?Math.max(0,Math.min(saved.step,steps.length-1)):0;draft=null;persist(false);const app=document.querySelector('.app');if(app)app.inert=true;navigate();draw()}
 window.d98StartTutorial=()=>start(false);
 document.addEventListener('keydown',e=>{
  if(!active||!dialog)return;
  if(e.key==='Escape'){e.preventDefault();finish();return}
  if(e.key!=='Tab')return;
  const elements=Array.from(dialog.querySelectorAll('button:not([disabled]),input:not([disabled])'));if(!elements.length){e.preventDefault();return}
  const first=elements[0],last=elements[elements.length-1];
  if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.querySelector('.d98-tour-dialog'))){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus()}
 });
 const style=document.createElement('style');style.textContent='.d98-tour-backdrop{position:fixed;inset:0;z-index:100000;background:#020812c9;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}.d98-tour-dialog{width:100%;max-width:490px;max-height:calc(100dvh - 36px);overflow:auto;box-sizing:border-box;background:linear-gradient(145deg,#142637,#0b151f);border:1px solid #4986a0;border-radius:12px;padding:24px;color:#e8f4fb;box-shadow:0 20px 90px #0009;font-family:"Exo 2",sans-serif}.d98-tour-dialog:focus{outline:none}.d98-tour-top{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px;letter-spacing:1px;color:#9dc9db}.d98-tour-top button,.d98-tour-link{font:inherit;background:transparent;border:0;color:#b9ced8;cursor:pointer;text-decoration:underline;text-underline-offset:4px;padding:8px 0}.d98-tour-progress{display:flex;gap:5px;margin:15px 0 20px}.d98-tour-progress i{height:3px;flex:1;background:#294253}.d98-tour-progress .on{background:#86ddf4}.d98-tour-dialog h2{font-family:Oswald,sans-serif;font-size:32px;line-height:1.15;margin:0 0 16px;color:#effaff}.d98-tour-dialog p{font-size:15px;line-height:1.6;margin:0 0 16px;color:#d2e3eb}.d98-tour-dialog .d98-tour-note{padding:12px 14px;background:#0a1119;border-left:2px solid #8bcadf;font-size:13px}.d98-tour-dialog label{display:block;font-size:14px;margin:12px 0 7px}.d98-tour-dialog input[type=text]{width:100%;box-sizing:border-box;background:#07111b;border:1px solid #527388;border-radius:5px;color:#effaff;padding:12px;font:inherit;font-size:16px}.d98-tour-dialog small{display:block;color:#a7c0cf;font-size:12px;line-height:1.5;margin-top:6px}.d98-tour-dialog .d98-tour-checkbox{display:flex;gap:10px;align-items:flex-start;margin:17px 0 6px}.d98-tour-checkbox input{width:19px;height:19px;flex:0 0 19px;margin:0;accent-color:#8bd7ed}.d98-tour-actions{display:flex;gap:10px;margin-top:20px}.d98-tour-actions button{flex:1;min-width:0;white-space:normal;margin:0;font-size:15px;padding:13px 10px}.d98-tour-dialog #d98-tour-error{color:#ffb5be;font-size:13px;margin:12px 0 0}.d98-tour-dialog button:focus-visible,.d98-tour-dialog input:focus-visible{outline:2px solid #d1f57d;outline-offset:3px}.d98-tour-dialog button:disabled{opacity:.6}.d98-tour-link{display:block;margin:12px auto 0;font-size:13px}@media(max-width:380px){.d98-tour-dialog{padding:18px}.d98-tour-dialog h2{font-size:28px}.d98-tour-dialog p{font-size:14px}}';document.head.append(style);
 const before=render;render=function(){before();if(state.tab==='home'){const menu=document.querySelector('.home-utility');if(menu&&!menu.querySelector('[data-d98-tour-replay]')){const button=document.createElement('button');button.dataset.d98TourReplay='true';button.textContent='Как играть?';button.onclick=()=>start(false);menu.append(button)}}};
 render();if(!saved.done)start(true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
