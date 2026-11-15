/* Palette and silhouette customization on the approved sprites. */
(function(){'use strict';
const HAIR={brown:['#66391f','#ae6033','#e19059'],black:['#25282d','#41444d','#646672'],blonde:['#9b7747','#d6b578','#f2d79f'],red:['#843d25','#ca6936','#ed9b58']};
const rgb=hex=>hex.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16));
function recolor(r,g,b,a){
 if(a.kind==='cat'&&a.coat!=='ginger'&&r>85&&r-g>36&&g-b>27&&g>r*.45&&g<r*.76&&b<g*.61){
  const stripe=r<220;
  return a.coat==='black'?(stripe?[38,43,52]:[77,83,96]):(stripe?[171,170,158]:[244,240,224]);
 }
 if(a.kind==='human'&&r>75&&r<245&&r-g>36&&g>r*.40&&g<r*.70&&b<r*.50){
  const colors=HAIR[a.hair]||HAIR.brown;
  return rgb(colors[r<120?0:r<207?1:2]);
 }
 return null;
}
function face(frame,care){if(care&&frame===6)return [76,68];return [[82,42],[82,43],[82,42],[80,40],[80,47],[80,43],[76,66],[80,45],[76,43],[82,42],[80,49],[80,43]][frame]||[82,43];}
function polygon(ctx,points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function behind(ctx,a,frame,care){
 if(a.kind!=='human'||a.style!=='long'||frame===6)return;
 const [cx,cy]=face(frame,care),c=HAIR[a.hair]||HAIR.brown;
 polygon(ctx,[[cx-24,cy-9],[cx-30,cy+9],[cx-29,cy+23],[cx-25,cy+32],[cx-19,cy+36],[cx-12,cy+34],[cx-14,cy+25],[cx-16,cy+5]],'#302b19');
 polygon(ctx,[[cx-23,cy-7],[cx-27,cy+9],[cx-26,cy+22],[cx-23,cy+30],[cx-19,cy+33],[cx-16,cy+32],[cx-18,cy+23],[cx-19,cy+5]],c[1]);
 polygon(ctx,[[cx+18,cy-9],[cx+25,cy+6],[cx+27,cy+23],[cx+23,cy+33],[cx+17,cy+36],[cx+11,cy+34],[cx+14,cy+24],[cx+14,cy+4]],'#302b19');
 polygon(ctx,[[cx+18,cy-7],[cx+22,cy+7],[cx+24,cy+22],[cx+21,cy+30],[cx+17,cy+33],[cx+15,cy+32],[cx+17,cy+23],[cx+17,cy+4]],c[1]);
}
function apply(ctx,a,frame,care){
 const d=ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height),v=d.data,scale=ctx.canvas.width/160;
 const [cx,cy]=face(frame,care);
 for(let i=0;i<v.length;i+=4){if(v[i+3]<80)continue;const x=((i/4)%d.width)/scale,y=Math.floor(i/4/d.width)/scale,r=v[i],g=v[i+1],b=v[i+2];
  const hair=a.kind==='human'&&y<cy+24?recolor(r,g,b,a):null;
  const color=a.kind==='cat'?recolor(r,g,b,a):hair;
  if(color){v[i]=color[0];v[i+1]=color[1];v[i+2]=color[2];continue;}
  // Skin, shoes, eyes, map and the blanket keep their original palette.
  if(a.kind==='human'&&frame!==6&&y>cy+15&&y<96&&r>95&&g>75&&b>40&&r-g<48&&g-b<75&&g-b>20&&x>42&&x<117&&!(care&&frame<2&&x>66&&x<99)&&!(care&&[4,5].includes(frame)&&x>78&&x<95&&y>59&&y<79)){
   if(((x-110)/10)**2+((y-(care&&[2,3].includes(frame)?52:72))/10)**2<1||(!care&&frame===1&&x>64&&y>58)||(!care&&[4,7,10].includes(frame)&&x>65&&x<103&&y>70)||x>cx-10&&x<cx+11&&y<cy+22)continue;
   const shade=g<195;
   const color=a.outfit==='teal'?(shade?[45,78,78]:[70,113,113]):a.outfit==='leather'?(shade?[43,43,43]:[68,68,72]):null;
   if(color){v[i]=color[0];v[i+1]=color[1];v[i+2]=color[2];}
  }
 }
 ctx.putImageData(d,0,0);
 if(a.kind==='cat'&&a.sex==='f'){
  const bow=frame===6?[73,54]:frame===8?[65,22]:[69,20];const [x,y]=bow;
  polygon(ctx,[[x-9,y-5],[x-4,y-5],[x,y-2],[x+4,y-5],[x+9,y-5],[x+9,y+6],[x+4,y+6],[x,y+3],[x-4,y+6],[x-9,y+6]],'#302b19');
  polygon(ctx,[[x-7,y-3],[x-5,y-3],[x-1,y],[x-5,y+4],[x-7,y+4]],'#6479a0');
  polygon(ctx,[[x+7,y-3],[x+5,y-3],[x+1,y],[x+5,y+4],[x+7,y+4]],'#6479a0');ctx.fillStyle='#354b78';ctx.fillRect(x-2,y-2,5,6);
 }
 if(a.kind==='human'&&a.accessory!=='none'&&frame!==6){
  const [x,y]=[cx-14,cy-3];ctx.strokeStyle='#302b19';ctx.lineWidth=1.5;ctx.strokeRect(x,y,13,10);ctx.strokeRect(x+18,y,13,10);ctx.fillStyle='#302b19';ctx.fillRect(x+13,y+3,5,2);
  if(a.accessory==='sunglasses'){ctx.fillRect(x+1,y+1,11,8);ctx.fillRect(x+19,y+1,11,8);}
 }
}
globalThis.D98AvatarStyle={apply,behind,recolor};
})();
