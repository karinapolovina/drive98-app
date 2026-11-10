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
