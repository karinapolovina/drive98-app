export function isMember(member){return !!member&&(['creator','administrator','member'].includes(member.status)||(member.status==='restricted'&&member.is_member===true));}
export async function parkingChannelAccess(uid,channels,token,{fetcher=fetch,botId='9009257082',expectedChannels=channels?.length}={}){
 if(!/^tg:[1-9][0-9]{0,15}$/.test(uid||''))return {active:false,ready:false};
 if(!token||!Array.isArray(channels)||!channels.length)return {active:false,ready:false};
 const ids=[...new Set(channels)];if(!Number.isInteger(expectedChannels)||expectedChannels<1||ids.length!==expectedChannels||ids.length>8||ids.some(id=>!/^-[1-9][0-9]{4,15}$/.test(String(id))))return {active:false,ready:false};
 const userId=Number(uid.slice(3));if(!Number.isSafeInteger(userId))return {active:false,ready:false};
 async function member(chatId,id){try{const response=await fetcher('https://api.telegram.org/bot'+token+'/getChatMember',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:String(chatId),user_id:Number(id)}),signal:AbortSignal.timeout(8000)});if(!response.ok)return null;const data=await response.json();return data.ok===true&&data.result?.user?.id===Number(id)?data.result:null;}catch{return null}}
 const results=await Promise.all(ids.map(async id=>{const admin=await member(id,botId);if(!admin||!['administrator','creator'].includes(admin.status))return null;const result=await member(id,userId);if(!result||!['creator','administrator','member','restricted','left','kicked'].includes(result.status))return null;return isMember(result)}));
 return {active:results.includes(true),ready:results.includes(true)||results.every(x=>x!==null)};
}

