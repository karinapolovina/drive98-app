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
