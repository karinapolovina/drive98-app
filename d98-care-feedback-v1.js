/* Small, deterministic copy helpers. No artwork or game rules are changed here. */
(function(root){'use strict';
function amount(n){const a=Math.abs(n);return a===.25?'¼':a===.5?'½':a===.75?'¾':String(a).replace('.',',');}
function seconds(ms){const n=Math.max(1,Math.ceil(ms/1000));return n>=60?Math.ceil(n/60)+' мин':n+' с';}
function message(f){
 if(!f||f.kind!=='care')return 'Не удалось подтвердить сохранение. Попробуй ещё раз.';
 const n=f.needs||{},d=f.changes||{},action=f.action;
 if(action==='sleep')return n.energy>=4?'Энергия уже полная. Можно просто отдохнуть вместе.':'Энергия восстанавливается по 1 ячейке за 5 минут. Можно закрыть игру.';
 if(action==='wake')return 'Герой проснулся. Энергия: '+amount(n.energy||0)+' из 4.';
 const full=action==='treat'?n.energy>=4&&n.mood>=4:n.mood>=4;
 if(f.reason==='cooldown'){
  if(full)return action==='treat'?'Энергия и настроение уже полные — 4 из 4. Герой рад угощению.':'Настроение уже полное — 4 из 4. Герою всё равно приятно.';
  return (action==='treat'?'Угощение уже учтено. Снова восстановить показатели можно через ': 'Забота уже учтена. Настроение сможет вырасти снова через ')+seconds(f.remainingMs||0)+'.';
 }
 if(f.reason==='full')return action==='treat'?'Энергия и настроение уже полные — 4 из 4. Герой угостился.':'Настроение уже полное — 4 из 4. Можно просто побыть вместе.';
 const parts=[];
 if(action==='treat')parts.push('Герой угостился.');
 if(d.mood>0)parts.push('Настроение +'+amount(d.mood)+(d.mood===1?' ячейка.':' ячейки.'));
 else if(n.mood>=4)parts.push('Настроение уже полное.');
 if(d.energy>0)parts.push('Энергия +'+amount(d.energy)+' ячейки.');
 else if(d.energy<0)parts.push('На игру ушло '+amount(d.energy)+' ячейки энергии.');
 else if(action==='treat'&&n.energy>=4)parts.push('Энергия уже полная.');
 return parts.join(' ')||'Забота сохранена.';
}
root.D98CareFeedback={message,amount};
})(globalThis);
