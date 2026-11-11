(function(){
function budget(route){return route.task_ids.length>=10?2:route.task_ids.length>=6?1:0}
function begin(route){return {routeId:route.id,index:0,status:'question',selected:null,log:[],errors:0,errorLimit:budget(route),presentationVersion:3};}
function answer(state,route,task,number){
 if(!['question','practice'].includes(state.status))return state;
 if(task.id!==route.task_ids[state.index])throw new Error('Scene does not match route');
 if(!task.options.some(o=>o.number===number))throw new Error('Unknown answer');
 const correct=number===task.correct;
 if(!correct&&task.non_driving)return {...state,selected:number,status:'practice'};
 const errors=(state.errors||0)+(correct?0:1),limit=state.errorLimit??budget(route);
 return {...state,selected:number,errors,errorLimit:limit,status:correct?'feedback':errors<=limit?'review':'failed',log:[...state.log,{id:task.id,number,correct}]};
}
function advance(state,route){
 if(!['feedback','review'].includes(state.status))return state;
 return {...state,index:state.index+1,status:state.index+1===route.task_ids.length?'complete':'question',selected:null};
}
window.D98RoadEngine={begin,answer,advance};
})();
