(()=>{
'use strict';
const $=id=>document.getElementById(id),C=$('world'),ctx=C.getContext('2d');ctx.imageSmoothingEnabled=false;
const S=32;let W=34,H=26;
const T={grass:0,path:1,tree:2,roof:3,wall:4,door:5,rice:6,flower:7,wood:8,desk:9,mat:10,tall:11,rock:12,water:13,hedge:14,gate:15,stone:16};
const palette=['#75a65e','#c6ae82','#38683d','#88684f','#baa78a','#403127','#b7bd6a','#88a961','#b38c6d','#856348','#d9c595','#507e41','#867c6b','#5a9aa5','#397b3e','#7b5c39','#b6b1a0'];
const strengths={Fire:['Grass','Ice','Steel'],Water:['Fire','Rock','Ground'],Grass:['Water','Shadow','Ground'],Rock:['Electric','Venom'],Electric:['Water','Flying'],Ice:['Dragon','Ghost','Ground'],Flying:['Beast','Fighting'],Shadow:['Ghost','Psychic'],Ghost:['Psychic','Primordial'],Dragon:['Electric','Primordial'],Venom:['Grass','Flying'],Beast:['Dragon','Shadow'],Primordial:['Beast','Fire'],Psychic:['Fighting','Venom'],Fighting:['Rock','Ice','Normal','Steel'],Normal:[],Steel:['Rock','Ice'],Ground:['Electric','Steel','Venom']};
const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]},symbols={Rock:'⛰',Water:'💧',Electric:'⚡',Grass:'🌿',Beast:'🐾',Flying:'🪽',Venom:'☣',Fire:'🔥',Ice:'❄',Ghost:'◈',Shadow:'◉',Psychic:'✦',Fighting:'⚔',Dragon:'◇',Primordial:'✧',Normal:'◯',Steel:'⚙',Ground:'⏚'};
const sprites={male:new Image(),female:new Image()};sprites.male.src='assets/male.png';sprites.female.src='assets/female.png';
const npcSheet=new Image();npcSheet.src='assets/npc-characters.svg';
// Three approved cinematic tree assets, bundled as self-contained SVG wrappers
// around the supplied transparent artwork. Tile collision stays unchanged.
const treeArt=['broadleaf','tiered','round'].map(name=>{
 const img=new Image();img.src='assets/trees/'+name+'.svg?v=51';return img;
});
function treeArtReady(){return treeArt.every(img=>img.complete&&img.naturalWidth>0)}
function treeVariant(x,y){
 // Stable across reloads, with greater tall-tree variety on wooded routes.
 return ((x*17+y*31+(x*y)%11)%3+3)%3;
}
function drawCinematicTrees(ox,oy,w,h,now){
 for(let y=Math.max(0,Math.floor(oy/S)-1);y<Math.min(H,Math.ceil((oy+h)/S)+4);y++)for(let x=Math.max(0,Math.floor(ox/S)-2);x<Math.min(W,Math.ceil((ox+w)/S)+2);x++){
  if(tiles[y]?.[x]!==T.tree||buildingSceneryReserved(s.area,x,y))continue;
  const type=treeVariant(x,y),custom=uploadedArt(naturalTreeName(s.area,naturalSeed(x,y))),img=custom||treeArt[type];
  if(!img?.complete||!img.naturalWidth)continue;
  const rootX=x*S+S*.5-ox,rootY=(y+1)*S-oy;
  const dense=s.area==='forest'||s.area==='route2';
  const bamboo=naturalTreeName(s.area,naturalSeed(x,y)).includes('bamboo');
  const crowded=tiles[y]?.[x-1]===T.tree||tiles[y]?.[x+1]===T.tree;
  const width=bamboo?(crowded?32:40):dense||crowded?(type===1?42:48):(type===1?58:66);
  const art=custom?cleanSceneryArt(img,naturalTreeName(s.area,naturalSeed(x,y))):img;
  const ratio=artHeight(art)/artWidth(art),height=custom?Math.min(width*1.8,width*ratio):width*(type===1?1.34:type===2?1.07:1.13);
  const drawWidth=custom?Math.min(width,height/ratio):width;
  if(rootX+width/2<0||rootX-width/2>w||rootY-height>h||rootY<0)continue;
  queueSolarShadow(rootX,rootY-4,drawWidth,height);
  const bend=reducedWorldMotion()?0:Math.sin(now*.00086-x*.43-y*.22)*.012*weatherWind();
  sceneryLayer(s.area+':tree:'+x+','+y,rootX-drawWidth/2,rootY-4-height,drawWidth,height,rootY,()=>{ctx.save();ctx.translate(rootX,rootY-4);ctx.rotate(bend);ctx.drawImage(art,-drawWidth/2,-height,drawWidth,height);ctx.restore()});
 }
}
// Dedicated hand-crafted-quality researcher art, one 4x4 sheet (32px cells).
const npcResearcher=new Image();npcResearcher.src='assets/npc-researcher.png?v=18';
const npcLabAssistant=new Image();npcLabAssistant.src='assets/npc-lab-assistant.png?v=20-player-style';
const NPC_VARIANTS=['Villager Boy','Villager Girl','Researcher','Lab Assistant','Center Nurse','Center Clerk','Village Elder','School Teacher','Merchant','Item Shopkeeper','Gear Shopkeeper','Rice Farmer','Fisherman','Ranger','Samurai','Shrine Maiden','Monk','Blacksmith','Guard','Rival Trainer','Gym Trainer','Gym Leader','Village Child','Traveler','Festival Dancer','Mountain Hermit','Ninja','Scholar'];
const NPC_ROWS={down:0,left:1,right:2,up:3};
function pickNpcSprite(x,y,kind='',id=''){
 const special={researcher:2,labassistant:3,center:4,shop:9,leader:21,switch:27};
 if(kind in special)return special[kind];
 if(kind==='construction-worker')return x%2?17:18;
 if(kind==='gymtrainer')return 20;
 if(kind==='routetrainer')return (x+y)%2?19:13;
 const area=s?.area||'village';
 const pools={
  village:[0,1,6,7,11,12,15,22,23,24,26],
  home:[1,6,7],
  neighbor:[0,1,22,6],
  lab:[3,2,27],
  route1:[11,12,13,23,0,1],
  town:[5,7,8,9,10,0,1,22],
  route2:[13,14,23,25,1],
  forest:[13,23,25,26],
  route3:[12,17,23,25,18],
  cave:[25,18,17],
  garden:[15,7,1,24,22],
  gym:[20,21,15]
 };
 const arr=pools[area]||pools.village;
 return arr[Math.abs((x*17+y*29+area.length*13))%arr.length];
}
// Uploaded artwork is loaded lazily and always retains a procedural fallback.
const uploadedArtCache=new Map(),cleanArtCache=new WeakMap();
// Only scenery objects are cleaned; terrain textures, NPC sheets and Critter art
// are not chroma-keyed. Remove contiguous border matte, never interior green pixels.
function cleanSceneryArt(im,name){
 if(!/^(tree-|house-|shop-|lab-blue|barn-|rock-|rocks-|lantern-|crate|barrel|fallen-log|tree-stump|grass-tuft|tall-grass|flowers-|rubble-|ruin-column)/.test(name))return im;
 if(cleanArtCache.has(im))return cleanArtCache.get(im);
 let result=im;
 try{
  const w=im.naturalWidth,h=im.naturalHeight;if(w*h>1500000)return im;
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(im,0,0);
  const img=cx.getImageData(0,0,w,h),d=img.data;
  const corners=[0,w-1,(h-1)*w,w*h-1].map(i=>Array.from(d.slice(i*4,i*4+4)));
  const green=p=>p[3]>230&&p[1]>p[0]*1.07&&p[1]>p[2]*1.14;
  const matte=corners.find(p=>green(p)&&corners.filter(q=>q[3]>230&&Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])<24).length>=3);
  if(matte){
   const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
   const push=i=>{if(i<0||i>=w*h||seen[i])return;seen[i]=1;const k=i*4;if(d[k+3]===0||Math.hypot(d[k]-matte[0],d[k+1]-matte[1],d[k+2]-matte[2])<29){queue[tail++]=i;d[k+3]=0}};
   for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
   while(head<tail){const i=queue[head++];if(i%w)push(i-1);if(i%w<w-1)push(i+1);push(i-w);push(i+w)}
   cx.putImageData(img,0,0);
  }
  // Normalize only grass-like background remnants near the image perimeter
  // or lower ground strip, preserving interior foliage and roof colors.
  const ground=[117,166,94];
  const samples=corners.filter(green);
  if(matte)samples.push(matte);
  let recolored=false;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const k=(y*w+x)*4,r=d[k],g=d[k+1],b=d[k+2];
   if(d[k+3]<30||g<r*1.06||g<b*1.12)continue;
   const lower=y>=h*.83,edge=x<w*.12||x>=w*.88;
   if(!lower&&!edge)continue;
   const near=samples.some(p=>Math.hypot(r-p[0],g-p[1],b-p[2])<60);
   const grassLike=lower&&g>=95&&g<=205&&r>=55&&r<=155&&b>=35&&b<=135&&Math.abs(r-b)<60;
   if(near||grassLike){d[k]=ground[0];d[k+1]=ground[1];d[k+2]=ground[2];recolored=true}
  }
  if(recolored)cx.putImageData(img,0,0);
  let l=w,t=h,rr=-1,b=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>20){l=Math.min(l,x);rr=Math.max(rr,x);t=Math.min(t,y);b=Math.max(b,y)}
  if(rr>=l&&b>=t&&(recolored||matte||l||t||rr<w-1||b<h-1)){
   const out=document.createElement('canvas');out.width=rr-l+1;out.height=b-t+1;out.getContext('2d').drawImage(c,l,t,out.width,out.height,0,0,out.width,out.height);result=out;
  }
 }catch(err){console.warn('Scenery cleanup skipped',name,err)}
 cleanArtCache.set(im,result);return result;
}
const artWidth=im=>im.naturalWidth||im.width,artHeight=im=>im.naturalHeight||im.height;
let sceneryForeground=null,sceneryPlayer=null,solarCasters=null;
const sceneryOpacity=new Map();
function solarShadowAt(hour,weather='clear'){
 if(hour<=6||hour>=18)return null;
 const phase=(hour-6)/12,altitude=Math.sin(Math.PI*phase);
 const length=.18+1.4*(1-altitude);
 const opacity=.24*Math.min(1,altitude*3)*({rain:.35,storm:.2,fog:.3,snow:.65,cloudy:.55}[weather]??1);
 return {dx:-Math.cos(Math.PI*phase)*length,dy:-.32*length,opacity};
}
function startSceneryLayer(x,y){sceneryForeground=[];solarCasters=[];sceneryPlayer={x,y,now:performance.now()}}
function queueSolarShadow(x,y,w,h,kind='tree'){
 if(!solarCasters||!OUTDOOR_GRID[s.area])return;
 const sun=solarShadowAt(worldHour(),regionalWeather());if(!sun)return;
 solarCasters.push({x,y,w,h,kind,sun});
}
function drawSolarShadows(){
 for(const o of solarCasters||[]){
  const {x,y,w,h,kind,sun}=o,dx=sun.dx*h,dy=sun.dy*h;
  ctx.save();ctx.fillStyle='rgba(24,42,48,'+sun.opacity+')';
  ctx.beginPath();
  if(kind==='building'){
   const half=w*.44,depth=Math.min(h*.15,25);
   ctx.moveTo(x-half,y);ctx.lineTo(x+half,y);ctx.lineTo(x+half+dx,y+dy-depth);ctx.lineTo(x-half+dx,y+dy-depth);ctx.closePath();
  }else{
   const radius=Math.max(3,w*.29),len=Math.hypot(dx,dy);
   ctx.moveTo(x-radius*.22,y);ctx.lineTo(x+dx-radius*.55,y+dy);ctx.lineTo(x+dx+radius*.55,y+dy);ctx.lineTo(x+radius*.22,y);ctx.closePath();
   ctx.ellipse(x+dx,y+dy,radius,Math.max(3,radius*.55+len*.08),Math.atan2(dy,dx),0,Math.PI*2);
  }
  ctx.fill();ctx.restore();
 }
}
function sceneryLayer(id,x,y,w,h,base,draw){
 if(!sceneryForeground||!sceneryPlayer){draw();return}
 const p=sceneryPlayer,overlap=p.x+9>x&&p.x-9<x+w&&p.y>y&&p.y-36<y+h&&p.y<=base;
 const old=sceneryOpacity.get(id)||{alpha:1,at:p.now};
 const dt=Math.min(100,Math.max(0,p.now-old.at)),target=overlap?.38:1;
 const alpha=target+(old.alpha-target)*Math.exp(-dt/150);
 sceneryOpacity.set(id,{alpha,at:p.now});
 sceneryForeground.push({base,alpha,draw});
}
function queueWorldActor(base,draw){
 if(!sceneryForeground){draw();return}
 sceneryForeground.push({base,alpha:1,draw});
}
function finishSceneryLayer(){
 drawSolarShadows();
 const list=sceneryForeground||[];sceneryForeground=null;sceneryPlayer=null;solarCasters=null;
 for(const o of list.sort((a,b)=>a.base-b.base)){ctx.save();ctx.globalAlpha=o.alpha;o.draw();ctx.restore()}
 const now=performance.now();for(const [id,o] of sceneryOpacity)if(now-o.at>2000)sceneryOpacity.delete(id);
}

const RESIDENTIAL_ART=new Set(["armchair-front-alt","armchair-front","bamboo-screen","bed-east","bed-north","bed-south","bed-west","bonsai-blue-pot","bonsai-red-pot","book-table","bookshelf-front","bookshelf-side-a","bookshelf-side-b","ceramic-jar","chair-front-alt","chair-front","chair-side-a","chair-side-b","clock-front","clock-side","crate-a","crate-b","cushion-blue","cushion-green","cushion-purple","cushion-red","desk-front-alt","desk-front","dining-table-horizontal-a","dining-table-horizontal-b","dining-table-vertical-a","dining-table-vertical-b","dresser-front-alt","dresser-front","floor-lantern","flowering-plant","folding-screen-a","folding-screen-b","folding-screen-c","fridge-front-alt","fridge-front","futon-east","futon-north","futon-south","futon-west","hide-rug","hutch-front-narrow","hutch-front","hutch-side","low-table-seats-a","low-table-seats-b","low-table-seats-c","low-table-seats-d","nightstand-front","nightstand-variant-2","nightstand-variant-3","nightstand-variant-4","plant-brown-pot","plant-tall-a","plant-tall-b","prep-counter-front","prep-counter-narrow","round-rug-blue","round-rug-cream","round-tea-table-a","round-tea-table-b","round-tea-table-c","round-tea-table-d","rug-blue","rug-red","sink-front-alt","sink-front","sink-side-a","sink-side-b","small-chest","small-flower-pot","sofa-front-alt","sofa-front","sofa-side-a","sofa-side-b","square-lantern","storage-chest","stove-front-alt","stove-front","stove-side-a","stove-side-b","table-horizontal-a","table-horizontal-b","table-vertical-a","table-vertical-b","tatami-mat","vanity-back","vanity-front","vanity-side","vase-flowers","wall-banner","wall-family-portrait","wall-floral-picture","wall-herb-rack","wall-landscape","wall-scroll-a","wall-scroll-b","wardrobe-front-alt","wardrobe-front","wardrobe-side","wooden-bucket","woven-basket"]);
function uploadedArtPath(name){
 if(RESIDENTIAL_ART.has(name))return 'assets/residential-furniture/'+name+'.png';
 if(name.startsWith('outdoor-'))return 'assets/outdoor-scenery/'+name+'.png';
 if(/^(family-home|neighbor-house|research-laboratory|critter-center|critter-shop|grass-gym)-(closed|ajar|half-open|open)$/.test(name))return 'assets2/interactive-animated/building-doors/'+name+'.png';
 if(/^(wooden-chest|supply-crate|storage-cabinet|display-case|mailbox)-/.test(name))return 'assets2/interactive-animated/interactive-props/'+name+'.png';
 if(/^(paper-lantern|stone-lantern|village-well|water-channel|small-waterfall|wind-chime)-/.test(name))return 'assets2/interactive-animated/environment-animated/'+name+'.png';
 if(/^(starter-display-station|index-calibration-machine|specimen-containment-tank|research-workstation|scanning-station|storage-pod)-/.test(name))return 'assets2/interactive-animated/laboratory-animated/'+name+'.png';
 if(name.startsWith('lab-')&&name!=='lab-blue')return 'assets2/laboratory/'+name+'.png';
 if(name.startsWith('gym-'))return 'assets2/grass-gym/'+name+'.png';
 if(name.startsWith('critter-shop-'))return 'assets2/critter-shop/'+name+'.png';
 if(name.startsWith('critter-center-'))return 'assets2/critter-center/'+name+'.png';
 return 'assets/'+name+'.png';
}
function uploadedArt(name){
 if(!uploadedArtCache.has(name)){const im=new Image();im.src=uploadedArtPath(name);uploadedArtCache.set(name,im)}
 const im=uploadedArtCache.get(name);return im.complete&&im.naturalWidth>0&&im.naturalHeight>0?im:null;
}
function drawUploadedArt(name,x,y,w,h){
 const im=uploadedArt(name);if(!im)return false;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(cleanSceneryArt(im,name),x,y,w,h);ctx.restore();return true;
}
function drawUploadedFit(name,x,y,w,h){
 const im=uploadedArt(name);if(!im)return false;
 const art=cleanSceneryArt(im,name),k=Math.min(w/artWidth(art),h/artHeight(art)),iw=artWidth(art)*k,ih=artHeight(art)*k;
 ctx.drawImage(art,x+(w-iw)/2,y+h-ih,iw,ih);return true;
}
// Dedicated 4x4 sheets share the existing researcher direction convention.
const NPC_DEDICATED_ROWS=Object.freeze({down:0,up:1,left:2,right:3});
const npcFrameCache=new WeakMap();
function uploadedNpcName(p,area){
 if(area==='home'&&(p.homeX??p.x)===14&&(p.homeY??p.y)===11)return 'npc-mother';
 if(p.kind==='center')return 'npc-center-nurse';
 if(p.id==='farmer-fieldwork')return 'npc-rice-farmer';
 if(p.kind==='rival'||p.id==='rival')return 'npc-rival';
 if(p.kind==='leader'&&area==='gym')return 'npc-gym-leader-grass';
 if(p.kind==='leader'&&p.id==='water-leader')return 'npc-gym-leader-water';
 if(p.kind==='researcher')return 'npc-researcher';
 if(p.kind==='labassistant')return 'npc-lab-assistant';
 return null;
}
function npcSheetMetrics(im){
 if(!im||!im.complete||im.naturalWidth!==128||im.naturalHeight!==128)return null;
 if(npcFrameCache.has(im))return npcFrameCache.get(im);
 const result=[];
 try{
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const c=canvas.getContext('2d',{willReadFrequently:true});if(!c)return null;
  c.drawImage(im,0,0);const data=c.getImageData(0,0,128,128).data;
  for(let row=0;row<4;row++){
   const frames=[];
   for(let col=0;col<4;col++){
    let minX=32,minY=32,maxX=-1,maxY=-1;
    for(let y=0;y<32;y++)for(let x=0;x<32;x++){
     if(data[((row*32+y)*128+col*32+x)*4+3]<24)continue;
     minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
    if(maxX<0){frames.push(null);continue}
    let sum=0,n=0;
    for(let y=minY+Math.floor((maxY-minY)*.2);y<=minY+Math.floor((maxY-minY)*.65);y++)for(let x=minX;x<=maxX;x++){
     if(data[((row*32+y)*128+col*32+x)*4+3]>=100){sum+=x;n++}
    }
    frames.push({sx:col*32+minX,sy:row*32+minY,sw:maxX-minX+1,sh:maxY-minY+1,anchorX:(n?sum/n:(minX+maxX)/2)-minX+.5});
   }
   result.push(frames);
  }
 }catch(e){npcFrameCache.set(im,null);return null}
 npcFrameCache.set(im,result);return result;
}
function npcWalkColumn(moving,now,start=0){
 if(!moving)return 0;
 return [0,1,2,3][Math.floor(Math.max(0,now-start)/130)%4];
}
function npcFaceToward(p,x,y){
 const dx=x-p.x,dy=y-p.y;
 if(!dx&&!dy)return p.face||'down';
 return Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
}
function drawDedicatedNpc(im,p,x,y,now=performance.now()){
 if(!im||!im.complete||im.naturalWidth!==128||im.naturalHeight!==128)return false;
 const row=NPC_DEDICATED_ROWS[p.face]??0;
 // Movement support is opt-in; existing stationary actors never change hitboxes.
 const col=npcWalkColumn(p.walking===true,now,p.walkStart||0);
 const metrics=npcSheetMetrics(im),f=metrics?.[row]?.[col]||metrics?.[row]?.[0];
 ctx.save();ctx.imageSmoothingEnabled=false;
 if(f){
  const scale=1.8;
  ctx.drawImage(im,f.sx,f.sy,f.sw,f.sh,x-f.anchorX*scale,y-f.sh*scale,f.sw*scale,f.sh*scale);
 }else{
  ctx.drawImage(im,0,row*32,32,32,x-29.5,y-59,59,59);
 }
 ctx.restore();return true;
}
// Task effects enhance existing sprites without inventing action-specific frame sheets.
function npcActivityKind(task){
 if(task==='Resting'||task==='Relaxing')return 'rest';
 if(task==='Tending rice'||task==='Checking fields'||task==='Finishing work')return 'farm';
 if(task==='Researching'||task==='Reviewing notes'||task==='Checking equipment')return 'research';
 if(task==='Organizing supplies'||task==='Working')return 'work';
 if(task==='Preparing breakfast'||task==='Housework')return 'home';
 if(task==='Observing')return 'observe';
 return null;
}
function drawNpcActivity(p,x,y,now=performance.now(),area=s.area){
 if(p.alertUntil>now){
  const bounce=Math.sin(now/90)*2;ctx.save();ctx.fillStyle='#fff4bb';ctx.strokeStyle='#51392b';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(x,y-61+bounce,10,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#b64036';ctx.font='bold 15px monospace';ctx.textAlign='center';ctx.fillText('!',x,y-56+bounce);ctx.restore();return;
 }
 if(p.walking||modal||battle||narratorBlocking()||trainerApproach||now<(p.pauseUntil||0))return;
 const kind=npcActivityKind(p.task);if(!kind||kind==='rest'&&p.task==='Resting'&&!isInterior(area))return;
 const phase=(now/1000+(p.homeX*13+p.homeY*7)*.13)%3;
 if(phase>1.25)return;
 const t=phase/1.25,side=p.face==='left'?-1:1,fx=x+side*13,fy=y-24;
 ctx.save();ctx.globalAlpha=Math.min(1,(1-t)*2);
 if(kind==='rest'){
  ctx.fillStyle='#e6e9ef';ctx.font='bold 10px monospace';ctx.fillText(p.task==='Resting'?'z':'♪',x+10+t*5,y-43-t*10);
 }else if(kind==='farm'){
  for(let i=0;i<3;i++){ctx.fillStyle=i%2?'#c2b57b':'#6e9c4f';ctx.fillRect(fx+side*i*4,fy+15-i*3-t*5,3,5)}
 }else if(kind==='research'){
  ctx.fillStyle='#78d6c9';for(let i=0;i<3;i++)ctx.fillRect(fx+i*3,fy-7-i*4-t*5,2,5);
  ctx.strokeStyle='#d5f4e8';ctx.strokeRect(fx-3,fy-4,10,7);
 }else if(kind==='work'){
  ctx.fillStyle='#d8be93';for(let i=0;i<3;i++)ctx.fillRect(fx+side*i*3,fy-5-i*4-t*7,3,3);
 }else if(kind==='home'){
  ctx.strokeStyle='#f0e2be';ctx.lineWidth=1.5;for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(fx+i*4,fy+4);ctx.quadraticCurveTo(fx+i*4+4,fy-4,fx+i*4,fy-10-t*6);ctx.stroke()}
 }else{
  ctx.fillStyle='#f4e3aa';ctx.font='bold 12px monospace';ctx.fillText('…',x+8,y-48-t*4);
 }
 ctx.restore();
}
function drawNpc(p,x,y,area=s.area){
 const name=uploadedNpcName(p,area);
 const im=name==='npc-researcher'?npcResearcher:name==='npc-lab-assistant'?npcLabAssistant:name?uploadedArt(name):null;
 const active=!p.walking&&!modal&&!battle&&!narratorBlocking()&&!trainerApproach&&performance.now()>=(p.pauseUntil||0)&&['farm','research','work','home'].includes(npcActivityKind(p.task));
 const bob=active?Math.sin(performance.now()/180)*.8:0;
 if(drawDedicatedNpc(im,p,x,y+bob))return;
 const legacy=npcSheet;
 if(legacy.complete&&legacy.naturalWidth){
  const i=p.sprite??0,row=NPC_ROWS[p.face||'down']??0;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(legacy,i*32,row*32,32,32,x-19,y-42+bob-(p.walking?Math.abs(Math.sin((performance.now()-p.walkStart)/70))*2:0),38,42);ctx.restore();
 }else{
  ctx.fillStyle='#544c55';ctx.fillRect(x-9,y-30,18,28);
  ctx.fillStyle='#e0aa88';ctx.fillRect(x-7,y-28,14,12);
 }
}
function battleTrainerArt(id){
 if(id==='tutorial'||id==='rival')return 'npc-rival';
 if(id==='leader')return 'npc-gym-leader-grass';
 if(id==='water-leader')return 'npc-gym-leader-water';
 return null;
}
function battleTrainerPortrait(id){
 const name=battleTrainerArt(id);if(!name)return '';
 return '<span aria-hidden="true" style="display:inline-block;width:32px;height:32px;vertical-align:middle;image-rendering:pixelated;background:url(assets/'+name+'.png) 0 0 / 128px 128px no-repeat"></span> ';
}
const villageBuildings={home:new Image(),lab:new Image(),neighbor:new Image()};
for(const kind of Object.keys(villageBuildings))villageBuildings[kind].src='assets/village-'+kind+'.svg';
let doorTransition=null;
const PROP_ANIMATION_MS=180,propAnimations=new Map();
const worldMotionQuery=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
const reducedWorldMotion=()=>!!worldMotionQuery?.matches;
function loopArt(frames,ms=220,offset=0){
 const index=reducedWorldMotion()?0:Math.floor((performance.now()+offset)/ms)%frames.length;
 const name=frames[index];return uploadedArt(name)?name:frames[0];
}
function warmFrames(frames){for(const n of frames)uploadedArt(n)}
function doorArtFrames(base){return ['closed','ajar','half-open','open'].map(f=>base+'-'+f)}
function propArtFrames(base){return ['closed','opening-1','opening-2','open'].map(f=>base+'-'+f)}
function villageDoorBase(h){return {home:'family-home',neighbor:'neighbor-house',lab:'research-laboratory'}[h.kind]}
function roomDoorBase(room){return {home:'neighbor-house',center:'critter-center',shop:'critter-shop'}[room.kind]}
function beginDoorAnimation(base,x,y,complete){
 if(doorTransition||worldTransitionBusy||screen!=='game'||modal)return;
 warmFrames(doorArtFrames(base));doorTransition={area:s.area,x,y,base,start:performance.now(),complete};
 releaseMovement();
}
function buildingAnimationArt(base,x,y){
 const frames=doorArtFrames(base);warmFrames(frames);
 const t=doorTransition?.area===s.area&&doorTransition.x===x&&doorTransition.y===y?Math.min(3,Math.floor((performance.now()-doorTransition.start)/90)):
 s.area==='village'&&npcResidenceDoor?.x===x&&npcResidenceDoor.y===y&&npcResidenceDoor.until>performance.now()?2:0;
 return uploadedArt(frames[t])?frames[t]:frames[0];
}
function drawAnimatedBuilding(base,h,doorX,doorY,ox,oy){
 const name=buildingAnimationArt(base,doorX,doorY),im=uploadedArt(name);
 if(!im)return false;
 // Frames contain the whole facade. Match the full footprint, anchor the
 // central doorway to the real entrance, and allow the roof to rise above it.
 const w=h.w*S,footH=(h.h+2)*S,ratio=im.naturalHeight/im.naturalWidth;
 const height=Math.max(footH,w*ratio),center=(doorX+.5)*S-ox;
 const x=center-w/2,y=(h.y+h.h+2)*S-oy-height,baseY=y+height;
 for(let yy=h.y;yy<h.y+h.h+2;yy++)for(let xx=h.x;xx<h.x+h.w;xx++)
  seamlessGround(T.grass,xx*S-ox,yy*S-oy,xx,yy);
 queueSolarShadow(x+w/2,baseY,w,height,'building');
 sceneryLayer(s.area+':building:'+h.x+','+h.y,x,y,w,height,baseY,()=>{
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(im,x,y,w,height);ctx.restore();
 });
 return true;
}
function interactivePropBase(o){
 if(o.id==='home-supplies')return 'supply-crate';
 if(o.id==='home-storage'||o.id==='estate-storage')return 'wooden-chest';
 if(o.id==='home-keepsake')return 'display-case';
 if(TOWN_ROOMS[s.area]?.kind==='home'&&o.id.endsWith('-cabinet'))return 'storage-cabinet';
 return null;
}
function startPropAnimation(id,base){
 if(!base)return;warmFrames(propArtFrames(base));propAnimations.set(s.area+':'+id,performance.now());
}
function interactivePropArt(id,base,collected=false){
 const frames=propArtFrames(base);warmFrames(frames);
 const key=s.area+':'+id,start=propAnimations.get(key),elapsed=start===undefined?Infinity:performance.now()-start;
 if(elapsed>1500)propAnimations.delete(key);
 const i=elapsed<900?(reducedWorldMotion()?3:Math.min(3,Math.floor(elapsed/PROP_ANIMATION_MS))):collected?3:0;
 return uploadedArt(frames[i])?frames[i]:frames[0];
}
function labAnimation(o){
 const families={
  'lab-starters':['starter-display-station-idle','starter-display-station-lights-'],
  'lab-terminal':['index-calibration-machine-idle','index-calibration-machine-blink-'],
  'lab-tools':['research-workstation-idle','research-workstation-screen-'],
  'lab-right':['scanning-station-idle','scanning-station-pulse-']
 };
 const f=families[o.id];if(!f)return null;
 const frames=[f[0],...['1','2','3'].map(n=>f[1]+n)];warmFrames(frames);
 return loopArt(frames,240,o.x*41);
}
function villageDoorAt(x,y){
 if(s?.area!=='village')return null;
 return VILLAGE_HOUSES.find(h=>h.door===x&&h.y+h.h+1===y)||null;
}
function openVillageDoor(h){
 return beginDoorAnimation(villageDoorBase(h),h.door,h.y+h.h+1,()=>region(h.kind==='lab'?'lab':h.kind==='neighbor'?'neighbor':'home',17,23));
}
function finishDoorAnimation(){
 if(!doorTransition||worldTransitionBusy||performance.now()-doorTransition.start<360)return;
 const {complete}=doorTransition;doorTransition=null;complete();
}
let s=null,screen='title',tiles=[],npcs=[],dialog=[],dialogDone=null,modal=false,battle=null,frame=0,held={},last=0,editing=false;
const VILLAGE_HOUSES=[
 {x:3,y:3,w:9,h:5,door:7,kind:'home'},
 {x:20,y:3,w:10,h:6,door:24,kind:'lab'},
 {x:23,y:17,w:8,h:4,door:27,kind:'neighbor'}
];
const VILLAGE_FENCES=[
 [2,16,11,16],[2,23,11,23],[2,9,6,9],[10,9,12,9],
 [21,16,27,16],[29,16,32,16]
];
const VILLAGE_LANTERNS=[[13,10],[19,11],[22,10],[27,10],[19,16],[29,15],[13,23]];
const VILLAGE_STONES=[[12,18],[30,12],[4,11],[30,23]];
let villageObstacles=new Set();
const key=(x,y)=>x+','+y;
function villageCollider(x,y){if(x>=1&&x<W-1&&y>=1&&y<H-1)villageObstacles.add(key(x,y))}
function buildVillageColliders(){
 villageObstacles=new Set();
 for(const h of VILLAGE_HOUSES)for(let y=h.y+1;y<=h.y+h.h+1;y++)for(let x=h.x;x<h.x+h.w;x++){
  if(buildingBlocksTile(h,x,y,'village'))villageCollider(x,y);
 }
 for(const [a,y,b] of VILLAGE_FENCES)for(let x=a;x<b;x++)villageCollider(x,y);
 for(const [x,y] of VILLAGE_LANTERNS)villageCollider(x,y);
 for(const [x,y] of VILLAGE_STONES)if(tiles[y]?.[x]!==T.path)villageCollider(x,y);
}

// Phase 1: curated indoor scenes. Objects share one definition for rendering,
// inspection and solid footprints. No party swapping/module work outside Centers.
let interiorObjects=[],interiorBlocked=new Set();
const TOWN_ROOMS=Object.freeze({
 townHouseA:{parent:'town',name:'Small Town Residence',kind:'home',door:[8,11]},
 townCenter:{parent:'town',name:'Small Town Critter Center',kind:'center',door:[25,11]},
 townShop:{parent:'town',name:'Small Town Critter Shop',kind:'shop',door:[8,22]},
 townHouseB:{parent:'town',name:'Small Town Guest House',kind:'home',door:[25,22]},
 gardenCenter:{parent:'garden',name:'Garden Town Critter Center',kind:'center',door:[6,8]},
 gardenHouse:{parent:'garden',name:'Garden Residence',kind:'home',door:[7,23]},
 gardenShop:{parent:'garden',name:'Garden Town Critter Shop',kind:'shop',door:[25,23]}
});
const isInterior=area=>['home','neighbor','lab','homesteadHome'].includes(area)||Object.hasOwn(TOWN_ROOMS,area);
function townDoorAt(x,y){return Object.entries(TOWN_ROOMS).find(([id,d])=>d.parent===s.area&&d.door[0]===x&&d.door[1]===y)?.[0]||null}
function roomSize(id){const kind=TOWN_ROOMS[id]?.kind;return kind==='home'?{w:16,h:14}:kind==='shop'?{w:20,h:15}:kind==='center'?{w:24,h:17}:{w:34,h:26}}
function roomExit(id){const d=roomSize(id);return [Math.floor(d.w/2),d.h-1]}
function enterTownRoom(id){const room=TOWN_ROOMS[id];if(!room)return;return beginDoorAnimation(roomDoorBase(room),room.door[0],room.door[1],()=>{recordWalkingStep();const [x,y]=roomExit(id);return region(id,x,y-2,'',true)})}
function exitTownRoom(){const d=TOWN_ROOMS[s.area];if(d)return region(d.parent,d.door[0],d.door[1]+1,'',true)}
function townServiceParent(){return TOWN_ROOMS[s.area]?.parent||s.area}

// Authored furniture sizes in tiles. Keep original placement centers and bottom anchors.
const INTERIOR_SIZE=Object.freeze({
 'home-bed':[2.4,3.3],'home-desk':[3.2,1.8],'home-bookcase':[2.5,2.7],
 'home-tea':[2.6,2.6],'home-storage':[2,1.6],'home-keepsake':[2.4,1.7],'home-supplies':[1.6,1.4],
 'neighbor-bed':[2.5,3],'neighbor-tea':[2.8,2.5],'neighbor-cupboard':[2.6,2.5],
 'neighbor-bamboo':[1.2,1.8],'neighbor-scroll':[2.5,1],
 'estate-bed':[2.5,3.3],'estate-terminal':[2.5,2],'estate-storage':[2.2,1.5],
 'estate-table':[3.8,2.5],'estate-books':[2.6,2.7],'estate-incubators':[5,2],
 'lab-left':[4.6,2.8],'lab-right':[3.5,2.8],'lab-terminal':[2.2,2.5],
 'lab-books':[2.2,3.2],'lab-tools':[3.5,2.6],'lab-starters':[4,3],'lab-board':[4,1],
 reception:[6,2.8],diagnostics:[2,2.5],monitor:[2.5,2.4],storage:[2,2.4],waiting:[2.6,1.4],
 checkout:[5,2.5],stock1:[2.3,3],stock2:[2.3,3],display:[2.5,1.8],stockroom:[1.8,1.6],
 bed:[2.2,2.8],table:[2.3,2.3],shelf:[2.3,2.4],cabinet:[2,2.4]
});
function interiorVisualBounds(o){
 const size=INTERIOR_SIZE[o.id]||INTERIOR_SIZE[o.id.split('-').pop()]||[Math.min(o.w,3),Math.min(o.h,3)];
 const [w,h]=size;
 return {x:o.x+(o.w-w)/2,y:o.y+o.h-h,w,h};
}
function interiorFootprint(o){
 const v=interiorVisualBounds(o);
 if(o.kind==='board')return {x:Math.floor(v.x),y:o.y,w:Math.ceil(v.w),h:0};
 // Only the base of upright objects occupies the floor; their upper art can overlap the actor.
 const depth=['bookshelf','terminal','display','counter','chest'].includes(o.kind)?Math.min(v.h,1.35):v.h;
 const left=Math.ceil(v.x-.5),right=Math.ceil(v.x+v.w-.5);
 const top=Math.ceil(v.y+v.h-depth-.5),bottom=Math.ceil(v.y+v.h-.5);
 return {x:left,y:top,w:Math.max(1,right-left),h:Math.max(1,bottom-top)};
}
function interiorObjectAt(x,y){
 return interiorObjects.find(o=>{const b=interiorFootprint(o);return b.h>0?x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h:o.kind==='board'&&x>=o.x&&x<o.x+o.w&&y===o.y;});
}
function addInteriorObject(id,x,y,w,h,kind,title,description,action=''){
 const o={id,x,y,w,h,kind,title,description,action};
 interiorObjects.push(o);
 const b=interiorFootprint(o);
 for(let yy=b.y;yy<b.y+b.h;yy++)for(let xx=b.x;xx<b.x+b.w;xx++)interiorBlocked.add(key(xx,yy));
 return o;
}
function furnishInterior(area){
 interiorObjects=[];interiorBlocked=new Set();
 // Always maintain a free central aisle and unobstructed exit at (17,25).
 if(TOWN_ROOMS[area]){
  const room=TOWN_ROOMS[area],add=(id,x,y,w,h,kind,title,desc,action='')=>addInteriorObject(area+'-'+id,x,y,w,h,kind,title,[desc],action);
  if(room.kind==='center'){
   add('reception',7,5,10,2,'counter','Reception Counter','Heal your party and maintain your Index.','center');
   add('diagnostics',2,4,3,3,'terminal','Diagnostic Station','Critter health diagnostics.');
   add('monitor',19,4,3,3,'counter','Treatment Station','Medical equipment.');
   add('shelf',2,10,3,3,'bookshelf','Reference Shelf','Guides to Critter care.');
   add('storage',19,10,3,3,'chest','Supply Cabinet','Emergency supplies.');
   add('waiting',6,11,3,2,'table','Waiting Area','Travelers can rest here.');
  }else if(room.kind==='shop'){
   add('checkout',6,5,8,2,'counter','Checkout Counter','Shop for supplies and Index upgrades.','shop');
   add('stock1',2,4,3,4,'bookshelf','Healing Supplies','Potions and Revives.');
   add('stock2',15,4,3,4,'bookshelf','Index Accessories','Batteries and modules.');
   add('display',2,10,3,2,'display','Evolution Stones','Colorful evolution stones.');
   add('stockroom',15,10,3,2,'chest','Stock Crates','Sealed merchandise.');
  }else{
   add('bed',2,4,3,3,'bed','Futon','A neatly arranged sleeping area.');
   add('table',11,7,3,2,'table','Tea Table','A quiet place to share tea.');
   add('shelf',2,9,3,2,'bookshelf','Bookshelf','Local field guides.');
   add('cabinet',11,10,3,2,'chest','Storage Cabinet','Household supplies.');
  }
 }else if(area==='homesteadHome'){
  addInteriorObject('estate-bed',5,6,6,4,'bed','Your Bed',['Rest and restore your Critters.'],'estate-rest');
  addInteriorObject('estate-terminal',24,6,4,3,'terminal','Home Terminal',['Manage your property.'],'estate-terminal');
  addInteriorObject('estate-storage',26,19,4,2,'chest','Home Storage',['Access your shared family storage.'],'estate-storage');
  addInteriorObject('estate-table',22,13,5,3,'table','Dining Table',['A quiet place to relax.']);
  addInteriorObject('estate-books',5,16,4,4,'bookshelf','Bookshelf',['Your field guides and adventure keepsakes.']);
  if(farmStage()>=2)addInteriorObject('estate-incubators',12,5,9,2,'counter','Incubation Station',['Incubator capacity: '+farmCapacity().incubators+'. Manage through the terminal.']);
 }else if(area==='lab'){
  addInteriorObject('lab-left',4,5,7,4,'counter','Field Research Bench',[
   'Sample jars, carefully labeled leaf specimens and a magnifying lens fill the workbench.',
   'The researchers are studying how different environments affect Critter behavior.'
  ]);
  addInteriorObject('lab-right',24,5,6,4,'counter','Testing Workbench',[
   'Several instruments hum softly beside an unfinished Critter Index component.'
  ]);
  addInteriorObject('lab-terminal',27,11,3,3,'terminal','Index Calibration Terminal',[
   'Diagnostic screens show capture-beam strength, watch stability and module slots.',
   'The lab assistant has already checked the calibration.'
  ]);
  addInteriorObject('lab-books',5,13,3,5,'bookshelf','Research Archive',[
   'Field journals describe the rural routes, the bamboo forest and the mountain foothills.',
   'A note recommends returning to the research lab after earning the first badge.'
  ]);
  addInteriorObject('lab-tools',23,16,5,3,'counter','Parts Assembly Table',[
   'Tools, small circuit boards and spare wristwatch straps are arranged in neat rows.'
  ]);
  addInteriorObject('lab-starters',13,12,6,2,'display','Starter Display',[
   'Three secure display stands are labeled Rock, Water and Electric.',
   'The researcher will let you choose your partner.'
  ]);
  addInteriorObject('lab-board',13,3,8,1,'board','Research Noticeboard',[
   'TODAY: Inspect the Index, complete starter registration, and prepare the Route 1 field survey.'
  ]);
 }else if(area==='home'){
  addInteriorObject('home-bed',5,6,6,4,'bed','Your Bed',[
   'Your familiar bed is neatly made. The adventure starts just outside your door.'
  ]);
  addInteriorObject('home-desk',24,6,6,3,'desk','Writing Desk',[
   'A map of the village sits beneath a handwritten note: Visit the research laboratory.'
  ]);
  addInteriorObject('home-bookcase',5,16,4,4,'bookshelf','Family Bookshelf',[
   'Old field guides and stories about the three legendary Critters fill the shelves.'
  ]);
  addInteriorObject('home-tea',22,12,5,3,'table','Family Tea Table',[
   'There is a fresh pot of green tea and two ceramic cups.'
  ]);
  addInteriorObject('home-storage',26,19,4,2,'chest','Home Storage Chest',[
   'Your extra captured Critters are registered to home storage.',
   'To change your active party, visit a Critter Center technician.'
  ]);
  addInteriorObject('home-keepsake',12,5,4,2,'display','Family Keepsakes',[
   'A framed family portrait and an old Critter Index watch rest on the shelf.'
  ]);
  addInteriorObject('home-supplies',7,12,3,2,'chest','Travel Supply Box',[
   'A small box is packed for your first adventure.'
  ],'potion');
 }else if(area==='neighbor'){
  addInteriorObject('neighbor-bed',5,6,6,4,'bed','Guest Futon',[
   'A folded futon sits beside a traditional paper-screen window.'
  ]);
  addInteriorObject('neighbor-tea',22,11,5,3,'table','Low Dining Table',[
   'The smell of tea and freshly cooked rice fills the room.'
  ]);
  addInteriorObject('neighbor-cupboard',26,17,4,3,'bookshelf','Kitchen Cupboard',[
   'Bowls, polished wooden trays, and jars of rice are stacked neatly.'
  ]);
  addInteriorObject('neighbor-bamboo',5,16,4,3,'display','Bamboo Arrangement',[
   'A beautifully arranged bamboo branch welcomes visitors.'
  ]);
  addInteriorObject('neighbor-scroll',13,5,7,1,'board','Village Painting',[
   'A painting shows the village beneath the mountains during spring.'
  ]);
 }
}
function inspectInterior(o){
 startPropAnimation(o.id,interactivePropBase(o));
 if(o.action==='center')return center();
 if(o.action==='shop')return shop();
 if(o.id==='home-bookcase'||o.id==='lab-books')return storyArchiveDialogue();
 if(o.action==='estate-rest'&&s.homestead?.owned){s.party.forEach(p=>{if(isEgg(p))return;p.hp=p.maxHp;p.status='';refillMovePP(p)});save();return notifyWorld('You rested. Your party has fully recovered.');}
 if(o.action==='estate-terminal'&&s.homestead?.owned)return homesteadTerminal();
 if(o.action==='estate-storage'&&s.homestead?.owned)return homesteadStorage();
 if(o.action==='potion'){
  s.discoveries=s.discoveries||{};
  if(!s.discoveries[o.id]){
   s.discoveries[o.id]=true;
   s.inventory.Potion=(s.inventory.Potion||0)+1;
   save();
   return notifyWorld(['Inside the supply box is a Potion!','Potion ×1 added to your inventory.']);
  }
  return notifyWorld(['The travel supply box is empty. You already collected its Potion.']);
 }
 return notifyWorld(o.description);
}


// Phase 3 — Route 1 countryside locations use the same coordinates for art,
// collision and interaction. One-time finds are recorded in s.discoveries.
const ROUTE1_SITES=[
 {id:'r1-sign',x:5,y:11,kind:'sign',title:'Countryside Trail Sign',
  text:['← Starting Village       Small Town →','NORTH: Farmer’s Lookout     SOUTH: Irrigation Paddies']},
 {id:'r1-shrine',x:14,y:5,kind:'shrine',title:'Roadside Stone Shrine',
  text:['A tiny countryside shrine is decorated with folded paper streamers.','Someone has left fresh flowers as a wish for safe travels.']},
 {id:'r1-lookout',x:10,y:5,kind:'sign',title:'Farmer’s Lookout',
  text:['A carved wooden sign reads: The valley is at its greenest after the rain.','From here you can see rice paddies stretching toward the first town.']},
 {id:'r1-satchel',x:25,y:20,kind:'satchel',title:'Forgotten Field Satchel',
  text:['A farmer’s satchel hangs from a short wooden post.'],reward:'Potion'},
 {id:'r1-journal',x:28,y:11,kind:'notice',title:'Route 1 Field Journal',
  text:['Field Journal: Wild Critters are attracted to tall grass and flooded rice paddies.','Travelers should keep a supply of Potions and check their Critter Index.']},
 {id:'r1-cache',x:7,y:21,kind:'chest',title:'Weathered Supply Crate',
  text:['A small crate tucked behind the southern paddies.'],reward:'Revive'}
];
// Phase 15: optional walk-over landmarks; these never block map routes.
const EXPLORATION_SITES=[
 {id:'exp-river-bridge',area:'route4',x:21,y:13,title:'Willow Bridge',text:'The old bridge crosses the river between the two towns.',credits:60},
 {id:'exp-ridge-lookout',area:'ridge',x:16,y:7,title:'Ridge Lookout',text:'From the ridge you can see the valleys below.',credits:75},
 {id:'exp-bamboo',area:'route2',x:11,y:7,title:'Bamboo Wayfinder',text:'A ranger marked a shortcut through the bamboo.',reward:'Potion',quantity:1},
 {id:'exp-forest',area:'forest',x:17,y:9,title:'Hidden Forest Shrine',text:'A shrine glows beneath ancient trees.',reward:'Revive',quantity:1},
 {id:'exp-foothills',area:'route3',x:20,y:7,title:'Mountain Lookout',text:'The lookout reveals a beautiful valley.',credits:85},
 {id:'exp-cave',area:'cave',x:17,y:19,title:'Crystal Alcove',text:'Shimmering crystals hide emergency supplies.',reward:'Revive',quantity:1},
 {id:'exp-garden',area:'garden',x:16,y:13,title:'Garden Memorial',text:'A stone honors travelers who protect Critters.',credits:100}
];
// Optional pocket areas use existing regional encounter catalogs; no new
// species assignments, time restrictions, or main-story prerequisites.
const SECRET_AREAS={
 willowHollow:{name:'Willow Hollow',parent:'route4',entrance:[6,5],returnAt:[6,6],spawn:[17,22],badge:0},
 grotto:{name:'Bamboo Grotto',parent:'route2',entrance:[11,5],returnAt:[11,6],spawn:[17,22],badge:0},
 ruins:{name:'Forgotten Ruins',parent:'forest',entrance:[17,6],returnAt:[17,7],spawn:[17,22],badge:0},
 cavern:{name:'Crystal Cavern',parent:'cave',entrance:[17,5],returnAt:[17,6],spawn:[17,22],badge:1}
};
const EXPLORATION_OBJECTS=[
 {id:'willow-shrine',area:'route4',x:9,y:5,kind:'cache',title:'Willow Shrine',text:'A traveler left a small emergency supply box beside the shrine.',reward:'Potion',quantity:2},
 {id:'river-cache',area:'route4',x:37,y:26,kind:'cache',title:'Riverside Supply Crate',text:'A weathered supply crate rests along the river trail.',reward:'PP Potion'},
 {id:'willow-hollow-cache',area:'willowHollow',x:23,y:8,kind:'chest',title:'Hidden Hollow Cache',text:'A preserved supply chest rests in the quiet hollow.',reward:'Revive',credits:90},
 {id:'ridge-cache',area:'ridge',x:27,y:23,kind:'cache',title:'Abandoned Trail Pack',text:'A forgotten traveler pack lies at the end of the ridge trail.',reward:'Potion',quantity:2},
 {id:'r2-stump-cache',area:'route2',x:12,y:8,kind:'cache',title:'Hollow Bamboo Stump',text:'A small packet is tucked inside the hollow stem.',reward:'Potion',quantity:2},
 {id:'r3-rock-cache',area:'route3',x:22,y:7,kind:'cache',title:'Loose Mountain Stone',text:'Something glints beneath the loose stone.',credits:75},
 {id:'garden-cache',area:'garden',x:16,y:18,kind:'cache',title:'Pondside Offering Box',text:'A forgotten supply packet rests beside the pond.',reward:'PP Potion'},
 {id:'grotto-cache',area:'grotto',x:11,y:8,kind:'chest',title:'Grotto Supply Chest',text:'A waterproof chest holds supplies.',reward:'Revive'},
 {id:'ruins-inscription',area:'ruins',x:17,y:18,kind:'sign',title:'Worn Inscription',text:'The inscription reads: First the rising sun, then the flowing water, then the enduring stone.'},
 {id:'ruins-sun',area:'ruins',x:9,y:15,kind:'rune',rune:'sun',title:'Sun Rune'},
 {id:'ruins-water',area:'ruins',x:17,y:15,kind:'rune',rune:'water',title:'Water Rune'},
 {id:'ruins-stone',area:'ruins',x:25,y:15,kind:'rune',rune:'stone',title:'Stone Rune'},
 {id:'ruins-cache',area:'ruins',x:17,y:5,kind:'chest',title:'Sealed Ruins Chest',text:'The old chamber contains a preserved supply cache.',reward:'Revive',quantity:2,credits:120},
 {id:'cavern-cache',area:'cavern',x:24,y:8,kind:'chest',title:'Crystal Chamber Cache',text:'An abandoned explorer left emergency supplies.',reward:'PP Potion',quantity:2,credits:90}
];
// Quest objects are separate from inventory and cannot be collected before acceptance.
EXPLORATION_OBJECTS.push(
 {id:'quest-lost-critter',area:'route1',x:12,y:6,kind:'quest',title:'Lost Critter',quest:'lost-companion',text:'The frightened Critter recognizes the caretaker’s call and follows you safely.'},
 {id:'quest-delivery',area:'town',x:22,y:13,kind:'quest',title:'Supply Delivery Desk',quest:'farm-delivery',text:'The delivery desk accepts the sealed farm supplies.'},
 {id:'quest-repair',area:'route2',x:12,y:10,kind:'quest',title:'Damaged Trail Marker',quest:'trail-repair',text:'You straighten the marker and secure it with the provided repair kit.'}
);
const PUZZLE_RUNES=['sun','water','stone'];
function secretEntranceAt(area,x,y){
 return Object.entries(SECRET_AREAS).find(([id,d])=>d.parent===area&&d.entrance[0]===x&&d.entrance[1]===y);
}
function explorationObjectAt(area,x,y){return EXPLORATION_OBJECTS.find(o=>o.area===area&&o.x===x&&o.y===y)}
function explorationBlocked(area,x,y){
 const o=explorationObjectAt(area,x,y);
 return !!(o&&(o.id!=='quest-lost-critter'||s.sideQuests?.[o.quest]?.status==='active'&&!s.sideQuests[o.quest].objectDone))||!!secretEntranceAt(area,x,y)||(area==='ruins'&&y===11&&x>=15&&x<=19&&!s?.puzzles?.ruinsOpened);
}
function inspectExplorationObject(o){
 if(o.kind==='chest'&&!s.discoveries?.[o.id])startPropAnimation(o.id,'wooden-chest');
 if(o.kind==='quest'){
  const state=s.sideQuests?.[o.quest];
  if(!state||state.status!=='active')return notifyWorld(state?.status==='complete'?'Your work here is finished.':'Someone nearby may know more about this.');
  if(state.objectDone)return notifyWorld('This objective is already complete. Return to the quest giver.');
  state.objectDone=true;save();return notifyWorld([o.text,'Objective complete. Return to '+sideQuest(o.quest).giver+'.']);
 }
 if(o.kind==='sign')return notifyWorld(o.text);
 if(o.kind==='rune'){
  if(s.puzzles.ruinsOpened)return notifyWorld('The rune glows steadily. The chamber is already open.');
  let seq=Array.isArray(s.puzzles.ruinsSequence)?s.puzzles.ruinsSequence:[];
  if(o.rune!==PUZZLE_RUNES[seq.length]){s.puzzles.ruinsSequence=[];save();return notifyWorld('The runes dim. The sequence has reset.')}
  seq=[...seq,o.rune];s.puzzles.ruinsSequence=seq;
  if(seq.length===PUZZLE_RUNES.length){s.puzzles.ruinsOpened=true;s.puzzles.ruinsSequence=[];save();return notifyWorld('The final rune glows. The stone barrier opens!')}
  save();return notifyWorld('The '+o.rune+' rune lights up.');
 }
 if(s.discoveries[o.id])return notifyWorld('You already collected this cache.');
 return discoverExplorationSite(o);
}
function enterSecret(id,d){
 if(!s.introComplete||s.badges<d.badge)return notifyWorld('The passage is not accessible yet.');
 s.discoveries['secret-'+id]=true;save();return region(id,...d.spawn,'You discovered '+d.name+'!',true);
}
function exitSecret(){
 const d=SECRET_AREAS[s.area];if(d)return region(d.parent,...d.returnAt,'',true);
}
function buildSecretArea(area){
 borders(T.rock);rect(1,1,W-2,H-2,T.rock);
 const ground=area==='grotto'||area==='willowHollow'?T.grass:T.stone;
 rect(4,3,26,20,ground);rect(15,22,4,3,T.path);put(17,25,T.door);
 if(area==='grotto'){rect(7,5,8,4,T.tall);rect(21,10,6,7,T.tall);rect(5,12,6,4,T.water);rect(15,5,4,17,T.path)}
 if(area==='willowHollow'){rect(5,5,8,7,T.water);rect(21,7,6,8,T.flower);rect(14,4,5,19,T.path);rect(19,7,5,3,T.path);for(const [x,y] of [[6,17],[9,15],[23,17],[26,5]])put(x,y,T.tree)}
 if(area==='ruins'){
  rect(4,11,26,1,T.rock);rect(15,11,5,1,T.path);
  rect(15,12,5,10,T.path);rect(15,3,5,8,T.path);
 }
 if(area==='cavern'){rect(7,8,5,7,T.water);rect(21,14,5,4,T.rock);rect(15,4,5,18,T.path)}
}
function prepareExplorationGeometry(){
 for(const d of Object.values(SECRET_AREAS))if(d.parent===s.area){
  put(...d.entrance,T.path);put(...d.returnAt,T.path);
  if(d.parent==='cave'){rect(16,6,3,8,T.stone);put(...d.returnAt,T.path)}
 }
 for(const o of EXPLORATION_OBJECTS)if(o.area===s.area)put(o.x,o.y,T.path);
}
function drawExtraExploration(ox,oy){
 for(const [id,d] of Object.entries(SECRET_AREAS))if(d.parent===s.area){
  const x=d.entrance[0]*S-ox,y=d.entrance[1]*S-oy;
  ctx.fillStyle='#344a39';ctx.fillRect(x+3,y+4,26,26);ctx.fillStyle='#142822';ctx.fillRect(x+8,y+10,16,20);
  ctx.fillStyle='#82937a';ctx.fillRect(x+4,y+4,24,5);
  if(s.discoveries?.['secret-'+id]){ctx.fillStyle='#e6cc80';ctx.fillRect(x+12,y+3,8,2)}
 }
 for(const o of EXPLORATION_OBJECTS)if(o.area===s.area){
  const x=o.x*S-ox,y=o.y*S-oy;
  if(o.kind==='quest'&&o.id==='quest-lost-critter'){
   if(s.sideQuests?.[o.quest]?.status!=='active'||s.sideQuests[o.quest].objectDone)continue;
   ctx.fillStyle='#563b36';ctx.beginPath();ctx.ellipse(x+16,y+22,11,5,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#d8b77b';ctx.beginPath();ctx.ellipse(x+16,y+16,9,10,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#4b3835';ctx.fillRect(x+11,y+13,2,3);ctx.fillRect(x+19,y+13,2,3);continue;
  }
  if(o.kind==='rune'){
   const lit=s.puzzles?.ruinsOpened||s.puzzles?.ruinsSequence?.includes(o.rune);
   ctx.fillStyle=lit?'#c8ba70':'#53605a';ctx.fillRect(x+6,y+6,20,22);
   ctx.fillStyle=lit?'#fff3a6':'#b5c3ae';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText({sun:'☀',water:'≈',stone:'◇'}[o.rune],x+16,y+22);ctx.textAlign='left';
  }else{
   const art=o.kind==='sign'?'ruin-inscription':o.kind==='chest'?interactivePropArt(o.id,'wooden-chest',!!s.discoveries?.[o.id]):o.id==='r2-stump-cache'?'tree-stump':'rubble-02';
   if(!drawUploadedFit(art,x+2,y+2,S-4,S-4)){ctx.fillStyle='#75634e';ctx.fillRect(x+7,y+10,18,17);ctx.fillStyle='#b39a70';ctx.fillRect(x+7,y+10,18,4)}
   if(o.kind==='chest'&&!s.discoveries?.[o.id]){ctx.fillStyle='#e7cb78';ctx.fillRect(x+14,y+15,4,4)}
  }
 }
 if(s.area==='ruins'&&!s.puzzles?.ruinsOpened)for(let x=15;x<=19;x++){ctx.fillStyle='#6b756b';ctx.fillRect(x*S-ox,11*S-oy,S,S);ctx.strokeStyle='#3c4a42';ctx.strokeRect(x*S-ox+1,11*S-oy+1,S-2,S-2)}
}
function explorationSiteAt(area,x,y){return EXPLORATION_SITES.find(o=>o.area===area&&o.x===x&&o.y===y)}
function discoverExplorationSite(o){
 if(!o||s.discoveries?.[o.id])return false;
 s.discoveries=s.discoveries||{};s.discoveries[o.id]=true;
 const messages=[o.title+'.',o.text];
 if(o.reward){s.inventory[o.reward]=(s.inventory[o.reward]||0)+(o.quantity||1);messages.push('Found '+o.reward+' ×'+(o.quantity||1)+'!')}
 if(o.credits){s.money+=o.credits;messages.push('Found '+o.credits+' money!')}
 save();notifyWorld(messages);return true;
}
// Detail art is bounded by existing geometry; no new blockers or discoveries.
function routeSiteArt(kind){
 return {sign:'outdoor-signpost-1-120',notice:'outdoor-noticeboard-1-116',shrine:'outdoor-shrine-3-221',satchel:'outdoor-sack-1-155',chest:'crate'}[kind]||null;
}
function explorationGroundArt(id){
 return {'exp-bamboo':'pebbles','exp-forest':'ruin-paving','exp-foothills':'stone-circle','exp-cave':'rubble-01','exp-garden':'ruin-inscription'}[id]||null;
}
function environmentalRockArt(area,x,y){
 const seed=naturalSeed(x,y);
 if(area==='cave')return ['stalagmite-01','stalagmite-02','rubble-01','rubble-02','stalactite-01','stalactite-02'][seed%6];
 if(area==='forest'&&seed%7===0)return ['ruin-column-broken','ruin-column-base','ruin-wall-01'][seed%3];
 if(area==='route3'&&seed%11===0)return 'rubble-02';
 return null;
}
function drawEnvironmentalDetails(ox,oy,w,h){
 const area=s.area;
 if(!['cave','forest','route3'].includes(area))return;
 const x0=Math.max(0,Math.floor(ox/S)),x1=Math.min(W,Math.ceil((ox+w)/S));
 const y0=Math.max(0,Math.floor(oy/S)),y1=Math.min(H,Math.ceil((oy+h)/S));
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  // Only existing solid rock tiles may host upright formations.
  if(tiles[y]?.[x]!==T.rock||npcs.some(p=>p.x===x&&p.y===y)||explorationSiteAt(area,x,y))continue;
  const art=environmentalRockArt(area,x,y);if(art)drawUploadedFit(art,x*S-ox,y*S-oy,S,S);
 }
}
function drawBridgeDeck(x,y,w,ox,oy){
 for(let i=0;i<w;i++)if(tiles[y]?.[x+i]!==T.path)return false;
 if(!uploadedArt('outdoor-bridge-1-098'))return false;
 ctx.save();ctx.beginPath();ctx.rect(x*S-ox,y*S-oy,w*S,S);ctx.clip();
 drawUploadedArt('outdoor-bridge-1-098',x*S-ox,y*S-oy,w*S,S);ctx.restore();return true;
}
function drawExplorationSites(ox,oy){
 drawExtraExploration(ox,oy);
 for(const o of EXPLORATION_SITES){
  if(o.area!==s.area)continue;
  const x=o.x*S+16-ox,y=o.y*S+16-oy;
  const art=explorationGroundArt(o.id);
  if(art)drawUploadedFit(art,x-16,y-16,S,S);
  if(s.discoveries?.[o.id])continue;
  ctx.fillStyle='#12372a';ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ffe49a';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#fff1a0';ctx.font='bold 17px system-ui';ctx.textAlign='center';
  ctx.fillText('✦',x,y+6);ctx.textAlign='left';
 }
}
let route1Blocked=new Set();
function route1SiteAt(x,y){return s.area==='route1'?ROUTE1_SITES.find(o=>o.x===x&&o.y===y):null}
function inspectRoute1Site(o){
 if(o.kind==='chest'&&!s.discoveries?.[o.id])startPropAnimation(o.id,'supply-crate');
 if(o.reward){
  s.discoveries=s.discoveries||{};
  if(s.discoveries[o.id])return notifyWorld(['The '+o.title.toLowerCase()+' is empty.']);
  s.discoveries[o.id]=true;s.inventory[o.reward]=(s.inventory[o.reward]||0)+1;
  save();return notifyWorld([o.text[0],'You found '+o.reward+' ×1! It was added to your inventory.']);
 }
 return notifyWorld(o.text);
}

// Match the drawn building rectangle, not the wider legacy tile footprint.
function buildingSceneryReserved(area,x,y){
 const buildings=area==='village'?VILLAGE_HOUSES:TOWN_EXTERIORS[area]||[];
 return buildings.some(h=>x>=h.x-1&&x<h.x+h.w+1&&y>=h.y-3&&y<h.y+h.h+2);
}
function clearBuildingScenery(){
 if(!['village','town','garden'].includes(s.area))return;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if(!buildingSceneryReserved(s.area,x,y))continue;
  villageObstacles.delete(key(x,y));
  if([T.tree,T.rock,T.hedge,T.tall,T.flower,T.rice].includes(tiles[y][x])){
   put(x,y,T.grass);villageObstacles.delete(key(x,y));
  }
 }
}
function buildingBlocksTile(h,x,y,area){
 const b=h.art||area==='village'?exteriorRect(h):{x:h.x,y:h.y,w:h.w,h:h.h+2,door:h.door??h.x+Math.floor(h.w/2)};
 const center=x+.5;
 if(center<b.x||center>=b.x+b.w||y<=h.y)return false;
 if(y===h.y+h.h+1&&x===b.door&&area==='village')return false;
 return y<h.y+h.h+2;
}
function solidAt(x,y){
 if(x<0||y<0||x>=W||y>=H)return true;
 const buildings=s.area==='village'?VILLAGE_HOUSES:TOWN_EXTERIORS[s.area]||[];
 const house=buildings.find(h=>x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h+2);
 if(house)return buildingBlocksTile(house,x,y,s.area);
 if(s.area==='village'&&villageObstacles.has(key(x,y)))return true;
 if(isInterior(s.area)&&(interiorBlocked.has(key(x,y))||y<4))return true;
 if(s.area==='route1'&&route1Blocked.has(key(x,y)))return true;
 if(explorationBlocked(s.area,x,y))return true;
 return [T.tree,T.roof,T.wall,T.desk,T.rock,T.water,T.hedge,T.gate].includes(tiles[y][x]);
}
// Visual-only movement: collision, saves, encounters, and interactions remain on the existing grid.
let visual={x:0,y:0,fromX:0,fromY:0,toX:0,toY:0,start:0,duration:130,ready:false};
function snapVisual(){if(!s)return;gaitDistance=0;visual={x:s.x,y:s.y,fromX:s.x,fromY:s.y,toX:s.x,toY:s.y,start:performance.now(),duration:130,ready:true}}
function updateVisual(now=performance.now()){
 if(!s)return;
 if(!visual.ready){snapVisual();return}
 const t=Math.min(1,Math.max(0,(now-visual.start)/visual.duration));
 // Linear interpolation produces a constant walking speed without slow-down at each tile.
 const x=visual.fromX+(visual.toX-visual.fromX)*t,y=visual.fromY+(visual.toY-visual.fromY)*t;
 gaitDistance+=Math.hypot(x-visual.x,y-visual.y);
 visual.x=x;visual.y=y;
}
// Run is the original movement pace; Walk takes longer between grid steps.
const movementStepInterval=()=>s?.movementMode==='walk'?235:135;
const movementStepDuration=()=>movementStepInterval();
// Advance the gait by actual distance travelled, not keyboard state or wall-clock time.
let gaitDistance=0;
function playerGaitFrame(){
 const moving=Math.abs(visual.x-visual.toX)+Math.abs(visual.y-visual.toY)>.001;
 if(!moving)return 0;
 const cycle=s?.movementMode==='walk'?2:2.5;
 return [0,1,2,3][Math.floor(gaitDistance/cycle*4)%4];
}
function syncMovementToggle(){ /* Movement mode is intentionally hidden in the overworld. */ }
function toggleMovementMode(){
 if(!s||screen!=='game'||modal||trainerApproachLocked())return;
 s.movementMode=s.movementMode==='walk'?'run':'walk';
 syncMovementToggle();save();
}
function beginStep(x,y){
 updateVisual();visual.fromX=visual.x;visual.fromY=visual.y;
 visual.toX=x;visual.toY=y;visual.start=performance.now();
 visual.duration=movementStepDuration();
}

const read=()=>{try{return JSON.parse(localStorage.getItem('critters-v1'))}catch{return null}};
function backUpLegacySaveBeforeMigration(){
 // Immutable recovery copy before any v56+ ID migration/autosave.
 const key='critters-v1-before-species-id-migration';
 try{
  if(localStorage.getItem(key))return;
  const raw=localStorage.getItem('critters-v1');
  if(!raw)return;
  const existing=JSON.parse(raw);
  if(existing&&existing.speciesIdSchema!==2)localStorage.setItem(key,raw);
 }catch(err){console.warn('Could not back up pre-migration save',err)}
}
let saveWarningShown=false;
function save(){if(!s)return false;try{s.version=4;localStorage.setItem('critters-v1',JSON.stringify(s));$('continue').hidden=false;saveWarningShown=false;return true}catch(err){console.warn('Save unavailable',err);if(!saveWarningShown&&screen==='game'){saveWarningShown=true;notifyWorld('Save unavailable. Check browser storage before leaving the game.')}return false}}
function show(page){cancelTrainerApproach();clearWorldNarrator();releaseMovement();if(page==='title'){outdoorChunks.clear();pastureActors.clear();}document.querySelectorAll('.screen').forEach(p=>p.classList.toggle('show',p.id===page));screen=page;if(page==='game'){resetOutdoorCamera();snapVisual();resizeGameCanvas();syncMovementToggle()}}

// Editable Critter moves and species: authored in data/moves.json and data/critters.json.
// Missing/retired IDs fall back to safe basic moves instead of breaking old saves.
const PARTY_LIMIT=8;
const MAX_CRITTER_LEVEL=100;
// Critter IDs are the authoritative Index numbers, not a separate display field.
const STARTER_SPECIES_IDS={Water:'cr-001-starter-water-1',Rock:'cr-004-starter-rock-1',Electric:'cr-007-starter-electric-1'};
const starterSpeciesId=type=>STARTER_SPECIES_IDS[type]||type;
const critterIndexNumber=species=>{const match=/^cr-(\d{3})-/.exec(species?.speciesId||'');return match?Number(match[1]):9999};
function migrateSpeciesIds(){
 if(!s||!speciesRegistry.size)return;
 const alias=new Map();
 for(const sp of speciesRegistry.values())if(sp.legacySpeciesId&&sp.legacySpeciesId!==sp.speciesId)alias.set(sp.legacySpeciesId,sp.speciesId);
 const translate=id=>speciesRegistry.has(id)?id:(alias.get(id)||id);
 const moveRecord=p=>{
  if(!p||typeof p!=='object')return;
  if(p.speciesId)p.speciesId=translate(p.speciesId);
  for(const e of p.evolutionHistory||[]){if(e.from)e.from=translate(e.from);if(e.to)e.to=translate(e.to)}
 };
 for(const p of [...(s.party||[]),...(s.storage||[]),...(s.homestead?.pairs||[]).flatMap(q=>[...(q?.parents||[]),...(q?.egg?.parents||[])])])moveRecord(p);
 // Never guess a legacy starter from party position, type, or level.
 // Same-type wild catches may be in any party slot or Home storage.
 // Only explicit provenance written when the starter was chosen is trustworthy.
 for(const p of [...(s.party||[]),...(s.storage||[])])
  if(!p.speciesId&&p.starterOrigin===true&&s.starter&&p.type===s.starter)
   p.speciesId=starterSpeciesId(s.starter);
 for(const pair of s.homestead?.pairs||[]){if(!pair)continue;pair.speciesId=translate(pair.speciesId);if(pair.egg)moveRecord(pair.egg)}
 for(const e of [...(s.homestead?.incubators||[]),...(s.party||[]).filter(isEgg).map(p=>p.egg)]){if(!e)continue;moveRecord(e);for(const p of e.parents||[])moveRecord(p)}
 for(const p of s.captureLog||[])moveRecord(p);
 if(s.collection&&typeof s.collection==='object'){
  for(const field of ['seen','caught']){
   const entries=s.collection[field];if(!entries||typeof entries!=='object')continue;
   for(const [oldId,value] of Object.entries(entries)){
    const id=translate(oldId);if(id===oldId)continue;
    // Keep existing discovery history when a migrated key collides with an already-new key.
    if(!entries[id])entries[id]=value;
    delete entries[oldId];
   }
  }
  for(const item of Object.values(s.collection.caught||{}))if(item?.evolvedFrom)item.evolvedFrom=translate(item.evolvedFrom);
 }
 if(s.evolutionNews)for(const e of s.evolutionNews){if(e.fromId)e.fromId=translate(e.fromId);if(e.toId)e.toId=translate(e.toId)}
 s.speciesIdSchema=2;
}
const moveRegistry=new Map(),speciesRegistry=new Map();
const moveFallbacks=[
 {id:'opening-flick',name:'Opening Flick',type:'Typeless',category:'physical',power:30,accuracy:100,pp:35,target:'enemy',priority:1},
 {id:'brace-up',name:'Brace Up',type:'Typeless',category:'status',power:0,accuracy:100,pp:20,target:'self',priority:0,effect:{id:'raise_stat',stat:'defense',stages:1,chance:100}}
];
moveFallbacks.forEach(m=>moveRegistry.set(m.id,m));
let moveDataReady=false,speciesDataReady=false;
const moveSlug=v=>String(v||'').toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const isKnownType=t=>Object.prototype.hasOwnProperty.call(strengths,t);
const defaultMoveIds=(type,level)=>{
 const options=[...moveRegistry.values()].filter(m=>m.type===type&&m.requiredLevelGuide<=level&&m.target==='enemy');
 const basic=options.filter(m=>m.category==='physical')[0],special=options.find(m=>m.category==='special');
 const ids=['opening-flick'];if(basic)ids.push(basic.id);if(special&&level>=5)ids.push(special.id);
 if(level>=9)ids.push('brace-up');
 return [...new Set(ids)].slice(0,4);
};
function validMove(id){return moveRegistry.get(id)||null}
function speciesFor(p){return p?.speciesId?speciesRegistry.get(p.speciesId):null}
// Render only approved local sprite paths. Legacy/non-art Critters retain their type icons.
function completeCritterArt(art){
 const valid=p=>typeof p==='string'&&/^assets\/critters\/[a-z0-9/_-]+\.png$/.test(p);
 const pair=v=>v&&valid(v.spritePath)&&valid(v.rearSpritePath);
 return art?.status==='ready'&&!!pair(art)&&Object.values(art.genderVariants||{}).every(pair);
}
function critterSpritePath(p){
 const spec=p?.art?p:speciesFor(p);
 const art=spec?.art;
 const variant=p?.gender&&art?.genderVariants?.[p.gender];
 const path=completeCritterArt(art)?(variant?.spritePath||art.spritePath):null;
 return typeof path==='string'&&/^assets\/critters\/[a-z0-9/_-]+\.png$/.test(path)?path:null;
}
function critterSpriteTag(p,cssClass){
 const path=critterSpritePath(p);
 return path?'<img class="'+cssClass+'" src="'+escapeHtml(path)+'" alt="'+escapeHtml(p?.name||speciesFor(p)?.name||'Critter')+'" decoding="async">':'';
}
function registeredLearnset(spec){
 return Array.isArray(spec?.levelUp)?spec.levelUp.filter(q=>Number.isInteger(q.level)&&q.level>=1&&typeof q.moveId==='string')
  .sort((a,b)=>a.level-b.level):[];
}
// An offspring inherits at most one future level-up move from its base species.
function inheritableMove(id){
 const m=validMove(id);return !!m&&!id.startsWith('starter-')&&!['Dragon','Primordial','Beast'].includes(m.type)&&!m.exclusive&&!m.legendary&&!/signature|legendary|exclusive/i.test(m.description||'');
}
function eggMoveCandidates(e){
 const sp=speciesRegistry.get(e?.speciesId);
 if(!sp||breedingLegendary(sp))return [];
 const future=new Set(registeredLearnset(sp).filter(q=>q.level>1&&inheritableMove(q.moveId)).map(q=>q.moveId));
 const atOne=new Set(registeredLearnset(sp).filter(q=>q.level===1).map(q=>q.moveId));
 return [...new Set((e.parents||[]).flatMap(p=>Array.isArray(p?.moves)?p.moves:[]))].filter(id=>future.has(id)&&!atOne.has(id)).sort();
}
function normalizeEggMove(e,rng=Math.random){
 if(!moveDataReady||!speciesDataReady)return e.inheritedMoveId||null;
 if(Object.prototype.hasOwnProperty.call(e,'inheritedMoveId'))return e.inheritedMoveId;
 const choices=eggMoveCandidates(e);
 e.inheritedMoveId=choices.length?choices[Math.min(choices.length-1,Math.floor(rng()*choices.length))]:null;
 return e.inheritedMoveId;
}
function inheritedMoveFor(p){
 const id=p?.inheritedMoveId;
 return inheritableMove(id)&&id?id:null;
}
function keepInheritedMove(p,ids){
 const id=inheritedMoveFor(p);const unique=[...new Set(ids)];
 if(!id)return unique.slice(-4);
 // Reserve one slot for the inherited move, retaining the newest three normal moves.
 const others=unique.filter(x=>x!==id).slice(-3);
 return [...others,id];
}
function inheritedMoveHTML(p){
 const id=inheritedMoveFor(p);return id?'<div class="watchPartyMeta">Inherited move: '+escapeHtml(validMove(id).name)+'</div>':'';
}
function legalLearnedMoves(p){
 const species=speciesFor(p),list=registeredLearnset(species).filter(e=>e.level<=p.level&&validMove(e.moveId)).map(e=>e.moveId);
 if(species&&list.length)return [...new Set(list)].slice(-4);
 return defaultMoveIds(p.type,p.level);
}
function normalizeMoves(p){
 if(!p||isEgg(p))return p;
 if(!moveDataReady&&Array.isArray(p.moves)&&p.moves.length)return p;
 const current=Array.isArray(p.moves)?p.moves:[];
 const legacy=new Set(['Strike','Guard','Focus',p.type+' Pulse','Pulse']);
 const mapped=current.map(v=>typeof v==='string'?(validMove(v)?v:moveSlug(v)):null)
   .filter(id=>id&&validMove(id)&&!legacy.has(id));
 const target=legalLearnedMoves(p);
 // Species learnsets are authoritative on registration; upgrades won't erase equipped
 // valid moves except when the four-slot capacity is exceeded.
 let ids=keepInheritedMove(p,speciesFor(p)?target:[...new Set([...mapped,...target])]);
 if(!ids.length)ids=['opening-flick'];
 if(!ids.some(id=>validMove(id)?.target==='enemy')){const inherited=inheritedMoveFor(p);ids=inherited?['opening-flick',...ids.filter(id=>id!=='opening-flick'&&id!==inherited).slice(-2),inherited]:['opening-flick',...ids.filter(id=>id!=='opening-flick')].slice(0,4)}
 const prevPP=p.movePP&&typeof p.movePP==='object'?p.movePP:{};
 p.moves=ids;
 p.movePP=Object.fromEntries(ids.map(id=>[id,Math.min(validMove(id)?.pp||35,Math.max(0,Number.isFinite(prevPP[id])?Math.floor(prevPP[id]):validMove(id)?.pp||35))]));
 p.status=typeof p.status==='string'?p.status:'';
 return p;
}
function gainLevelMoves(p){
 const spec=speciesFor(p);
 const options=registeredLearnset(spec).filter(e=>e.level===p.level&&validMove(e.moveId));
 const learned=[];
 for(const event of options){
  p.moves=Array.isArray(p.moves)?p.moves:[];
  const alreadyKnown=p.moves.includes(event.moveId);
  p.moves=keepInheritedMove(p,[...p.moves.filter(id=>id!==event.moveId),event.moveId]);
  p.movePP=p.movePP||{};if(!alreadyKnown)p.movePP[event.moveId]=validMove(event.moveId).pp;
  if(!alreadyKnown)learned.push(validMove(event.moveId).name);
 }
 if(!spec)normalizeMoves(p);
 return learned;
}
function getMove(p,id){
 const move=validMove(id);
 if(move)return move;
 return moveFallbacks[0];
}
function refillMovePP(p){if(!p||isEgg(p))return;normalizeMoves(p);for(const id of p.moves)p.movePP[id]=getMove(p,id).pp}
async function loadCritterMoveData(){
 try{
  const res=await fetch('data/moves.json?v=64-level-cap',{cache:'no-store'});
  if(!res.ok)throw Error('moves HTTP '+res.status);
  const data=await res.json();
  if(!Array.isArray(data.moves))throw Error('move catalog missing moves');
  for(const m of data.moves)if(m?.id&&typeof m.name==='string'&&typeof m.type==='string'&&Number.isFinite(m.pp)&&m.pp>0&&['physical','special','status'].includes(m.category))moveRegistry.set(m.id,m);
  moveDataReady=true;
 }catch(err){console.warn('Critter move database unavailable; safe basic moves remain available',err)}
 try{
  const res=await fetch('data/critters.json?v=98-gender-ratios',{cache:'no-store'});
  if(!res.ok)throw Error('species HTTP '+res.status);
  const data=await res.json();
  if(Array.isArray(data.species))for(const sp of data.species)
   if(typeof sp.speciesId==='string'&&sp.speciesId&&!speciesRegistry.has(sp.speciesId)
    &&Array.isArray(sp.types)&&sp.types.length&&sp.types.every(isKnownType))
     {if(sp.art?.status==='ready'&&!completeCritterArt(sp.art))sp.art={...sp.art,status:'awaiting-upload'};speciesRegistry.set(sp.speciesId,sp);}
  speciesDataReady=true;
 }catch(err){console.warn('Critter species registry unavailable; type placeholders remain available',err)}
 if(s){migrateSpeciesIds();for(const p of [...s.party,...s.storage]){if(isEgg(p))continue;refreshSpeciesMetadata(p);normalizeMoves(p)}migrateHomestead();migrateCollection();save();if(indexTab==='encyclopedia'&&encyclopediaSection==='critters'&&screen==='game'&&!battle)renderIndex()}
 if(battle){for(const p of battle.enemies)normalizeMoves(p);if(battle.phase==='choose')renderBattle('Move library loaded. Choose your team’s actions.')}
}

function speciesGenderRatio(sp){
 if(breedingLegendary(sp)||sp?.genderRatio?.malePercent===null)return null;
 const n=sp?.genderRatio?.malePercent;return Number.isFinite(n)?Math.max(0,Math.min(100,n)):50;
}
function rollSpeciesGender(sp,rng=Math.random){const ratio=speciesGenderRatio(sp);return ratio===null?'genderless':rng()*100<ratio?'male':'female'}
function normalizeCritterGender(p){
 if(!p||isEgg(p))return p;
 const sp=speciesFor(p);
 if(sp&&speciesGenderRatio(sp)===null)p.gender='genderless';
 else if(!['male','female'].includes(p.gender)&&!(p.gender==='genderless'&&!sp)){
  // A legacy save may load before the species catalog. Defer its first roll.
  if(p.speciesId&&!sp&&!speciesDataReady)return p;
  p.gender=rollSpeciesGender(sp);
 }
 return p;
}
function normalizeEggGender(e){
 const sp=speciesRegistry.get(e.speciesId);
 if(!sp)return e.gender;
 if(speciesGenderRatio(sp)===null)e.gender='genderless';
 else if(!['male','female'].includes(e.gender))e.gender=rollSpeciesGender(sp);
 return e.gender;
}
function critterGenderLabel(p){return p?.gender==='male'?' ♂':p?.gender==='female'?' ♀':p?.gender==='genderless'?' · Genderless':'';}
function critter(type,level=5){
 level=Math.min(MAX_CRITTER_LEVEL,Math.max(1,Math.floor(Number(level)||1)));
 const spec=speciesRegistry.get(type);
 const starterType=Object.entries(STARTER_SPECIES_IDS).find(([,id])=>id===type)?.[0];
 const primary=spec?.types?.[0]||starterType||type;
 const hp=spec?.baseStats?.hp?Math.max(1,spec.baseStats.hp+(level-1)*4):20+level*4;
 const p={type:primary,types:spec?.types||[primary],speciesId:spec?.speciesId||(starterType?type:null),name:spec?.name||(starterType?starterType+' Starter':primary),baseStats:spec?.baseStats||null,level,hp,maxHp:hp,xp:0,status:'',moves:[],movePP:{}};
 return normalizeMoves(refreshSpeciesMetadata(p));
}
// Capture energy is a permanent Index subsystem, separate from battle PP and modules.
const BEAM_BATTERIES=Object.freeze([{name:'Standard Battery',capacity:10,price:0},{name:'Extended Battery',capacity:20,price:500},{name:'High-Capacity Battery',capacity:35,price:1500},{name:'Ultra Battery',capacity:50,price:3500}]);
const BEAM_RECHARGE_PRICE=30;
function normalizeBeamBattery(state){
 const old=state.beamBattery;
 const tier=Number.isInteger(old?.tier)?Math.max(0,Math.min(BEAM_BATTERIES.length-1,old.tier)):0;
 const capacity=BEAM_BATTERIES[tier].capacity;
 const charge=Number.isFinite(old?.charge)?Math.max(0,Math.min(capacity,Math.floor(old.charge))):capacity;
 state.beamBattery={tier,charge};return state.beamBattery;
}
function beamStatus(state=s){
 const b=normalizeBeamBattery(state),spec=BEAM_BATTERIES[b.tier];
 return {...b,capacity:spec.capacity,name:spec.name};
}
function consumeBeamCharge(state){
 const b=normalizeBeamBattery(state);if(b.charge<=0)return false;b.charge--;return true;
}
function rechargeBeam(state){
 const b=normalizeBeamBattery(state),cap=BEAM_BATTERIES[b.tier].capacity;
 if(b.charge>=cap||!Number.isFinite(state.money)||state.money<BEAM_RECHARGE_PRICE)return false;
 state.money-=BEAM_RECHARGE_PRICE;b.charge=cap;return true;
}
function upgradeBeam(state,tier){
 const b=normalizeBeamBattery(state),next=BEAM_BATTERIES[tier];
 if(!Number.isInteger(tier)||tier!==b.tier+1||!next||!Number.isFinite(state.money)||state.money<next.price)return false;
 state.money-=next.price;b.tier=tier;b.charge=next.capacity;return true;
}
function beamChargeLabel(){const b=beamStatus();return b.charge+'/'+b.capacity+' charges'}
function beamMeterHTML(){
 const b=beamStatus();return '<div class="watchSelectionStats">Capture Beam · '+b.charge+' / '+b.capacity+' charges</div><div class="watchMeter" role="meter" aria-label="Capture Beam charge" aria-valuemin="0" aria-valuemax="'+b.capacity+'" aria-valuenow="'+b.charge+'"><div style="width:'+(100*b.charge/b.capacity)+'%"></div></div>';
}
function canFireBeam(){return !!(battle?.kind==='wild'&&battle.enemies[0]?.hp>0&&beamStatus().charge>0)}
function beamBattleButton(id){
 if(battle.kind!=='wild')return '';
 return '<button type="button" class="btn" id="'+id+'" '+(canFireBeam()?'':'disabled')+'>Capture Beam · '+Math.round(captureChance(battle.enemies[0])*100)+'% · '+beamChargeLabel()+'</button>'+(beamStatus().charge===0?'<small>Battery empty. Recharge at a Critter Shop.</small>':'');
}
function beamShopHTML(){
 const b=beamStatus(),next=BEAM_BATTERIES[b.tier+1];
 return '<h3>Capture Beam battery</h3><p>'+b.name+' · '+beamChargeLabel()+'</p>'+beamMeterHTML()+'<div class="options"><button class="btn" id="beamRecharge" '+(b.charge===b.capacity||s.money<BEAM_RECHARGE_PRICE?'disabled':'')+'>Recharge fully — '+BEAM_RECHARGE_PRICE+' ◇</button>'
 +(next?'<button class="btn" id="beamUpgrade" '+(s.money<next.price?'disabled':'')+'>Upgrade to '+next.name+' · '+next.capacity+' charges — '+next.price+' ◇</button>':'<p>Maximum battery capacity installed.</p>')+'</div><p class="muted">Every fired capture beam consumes one charge. Upgrades include a full charge.</p>';
}
function migrate(){
 if(!s)return;
 normalizeBeamBattery(s);
 s.movementMode=s.movementMode==='walk'?'walk':'run';
 // A returning player may click Continue after the catalogs already loaded.
 // Migrate before normalizing party metadata in either loading order.
 if(speciesRegistry.size)migrateSpeciesIds();
 s.area=s.area||'village';if(!['village','lab','home','neighbor','route1','town','route2','forest','route3','cave','garden','gym','homestead','homesteadHome','grotto','ruins','cavern','route4','ridge','willowHollow'].includes(s.area)&&!TOWN_ROOMS[s.area])s.area='village';
 ensureMapDiscovery();
 s.x=Number.isFinite(s.x)?s.x:17;s.y=Number.isFinite(s.y)?s.y:16;s.face=s.face||'down';
 if(!Array.isArray(s.party))s.party=s.starter?[critter(starterSpeciesId(s.starter),5)]:[];
 s.party=s.party.map(p=>isEgg(p)?eggPartyEntry(p.egg):normalizeMoves(refreshSpeciesMetadata({...critter(p.speciesId||p.type||'Rock',p.level||5),...p,level:Math.min(MAX_CRITTER_LEVEL,Math.max(1,Math.floor(Number(p.level)||1))),xp:Number(p.level)>=MAX_CRITTER_LEVEL?0:p.xp,maxHp:p.maxHp||36,hp:typeof p.hp==='number'?p.hp:36}))); 
 if(!Array.isArray(s.storage))s.storage=[];s.storage=s.storage.map(p=>normalizeMoves(refreshSpeciesMetadata({...critter(p.speciesId||p.type||'Grass',p.level||3),...p,level:Math.min(MAX_CRITTER_LEVEL,Math.max(1,Math.floor(Number(p.level)||1))),xp:Number(p.level)>=MAX_CRITTER_LEVEL?0:p.xp})));
 // Preserve excess Critters from older saves instead of silently dropping them.
 if(s.party.length>PARTY_LIMIT)s.storage.push(...s.party.splice(PARTY_LIMIT));
 s.wildStepsSinceEncounter=Number.isInteger(s.wildStepsSinceEncounter)?Math.max(0,Math.min(100,s.wildStepsSinceEncounter)):4;
 s.regionalWildEncounters=s.regionalWildEncounters&&typeof s.regionalWildEncounters==='object'&&!Array.isArray(s.regionalWildEncounters)?s.regionalWildEncounters:{};
 s.captureCount=s.captureCount||0;s.captureLog=Array.isArray(s.captureLog)?s.captureLog.filter(q=>q&&typeof q.type==='string').slice(-80):[];collectionData();s.money=Number.isFinite(s.money)?s.money:250;
 s.inventory=s.inventory||{Potion:4,Revive:1};s.modules=Array.isArray(s.modules)?s.modules:[];s.installed=Array.isArray(s.installed)?s.installed:[];
 s.defeated=s.defeated||{};s.puzzles=s.puzzles||{};s.badges=s.badges||0;s.cut=s.badges>=1;
 migrateHomestead();
 s.rivalPassed=!!s.rivalPassed;s.introComplete=!!s.introComplete;
 s.worldMinutes=Number.isFinite(s.worldMinutes)?((s.worldMinutes%1440)+1440)%1440:8*60;
 s.worldDay=Number.isFinite(s.worldDay)&&s.worldDay>=1?Math.floor(s.worldDay):1;
 s.discoveries=s.discoveries&&typeof s.discoveries==='object'?s.discoveries:{};
 s.sideQuests=s.sideQuests&&typeof s.sideQuests==='object'&&!Array.isArray(s.sideQuests)?s.sideQuests:{};
 s.questCaptureCounts=s.questCaptureCounts&&typeof s.questCaptureCounts==='object'&&!Array.isArray(s.questCaptureCounts)?s.questCaptureCounts:{};
 s.earlyJourney=s.earlyJourney&&typeof s.earlyJourney==='object'&&!Array.isArray(s.earlyJourney)?s.earlyJourney:{};
 normalizeStoryState();
 normalizeTrainerProgress();
 if(s.captureLog?.some(q=>q.area==='route1'&&q.speciesId))s.earlyJourney.firstCapture=true;
 if(s.collection?.seen&&Object.values(s.collection.seen).some(q=>q&&q.firstArea==='route1'))s.earlyJourney.firstEncounter=true;
 if(s.starter&&!s.rival)s.rival={Rock:'Water',Water:'Electric',Electric:'Rock'}[s.starter];
 const size=outdoorSize(s.area);s.x=Math.max(0,Math.min(size.w-1,Math.floor(s.x)));s.y=Math.max(0,Math.min(size.h-1,Math.floor(s.y)));
}
function put(x,y,t){if(x>=0&&x<W&&y>=0&&y<H)tiles[y][x]=t}
function rect(x,y,w,h,t){for(let a=x;a<x+w;a++)for(let b=y;b<y+h;b++)put(a,b,t)}
// Live routines are transient, local to the active area, and never written to saves.
// Explicit anchors preserve story roles when actors move.
const NPC_PATROLS={rt2:[[24,13],[28,13]],rt3:[[12,13],[8,13]]};
const NPC_STATIONARY=new Set(['leader','switch','property-sign','gymtrainer','rival']);
// Living world: keep essential staff and story actors available throughout the day.
function shopIsOpen(hour=worldHour()){return hour>=7&&hour<20}
function npcRoutineDialogue(p){
 const task=npcRoutinePlan(s.area,p,worldHour(),s.starter)?.task;
 const lines={'Resting':'It is late. I am resting until morning.','Preparing breakfast':'Good morning! I am getting ready for the day.','Housework':'I am taking care of things around the house.','Relaxing':'It is nice to unwind after a long day.','Walking':'I am enjoying a little walk.','Checking fields':'I am checking the fields before work.','Tending rice':'The rice needs tending today.','Finishing work':'I am finishing up before nightfall.','Working':'There is plenty of work to do today.','Reviewing notes':'I am reviewing the research notes tonight.'};
 return lines[task]?[lines[task],...p.text]:p.text;
}
// Residential schedules only apply to ambient residents with known building entrances.
// Story, quest and service NPCs never leave their assigned area.
function npcResidence(area,p){
 if(p.kind)return null;
 if(area==='village')return {x:27,y:23,doorY:22,interior:'neighbor'};
 if(area==='town'&&p.homeX===9&&p.homeY===12)return {x:8,y:12,doorY:11};
 return null;
}
function npcNight(hour=worldHour()){return hour<5||hour>=20}
function npcEnterResidence(p,home,now){
 p.indoors=true;p.x=-100;p.y=-100;npcFinishWalk(p);p.task='Resting';
 p.nextRoutine=now+500;
 if(s.area==='village')npcResidenceDoor={x:home.x,y:home.doorY,until:now+320};
}
let npcResidenceDoor=null;
function tickNpcResidence(p,now){
 const home=npcResidence(s.area,p);if(!home)return false;
 if(npcNight()){
  if(p.indoors)return true;
  p.task='Returning home';
  if(p.x===home.x&&p.y===home.y){npcEnterResidence(p,home,now);return true}
  const step=npcFindStep(p,home.x,home.y,W+H,true,true);
  if(step)npcBeginWalk(p,step,now);
  p.nextRoutine=now+(step?500:1200);return true;
 }
 if(p.indoors){
  if(!npcStepAllowed(p,home.x,home.y,true,true)){p.nextRoutine=now+500;return true}
  p.indoors=false;p.x=home.x;p.y=home.y;p.face='down';npcFinishWalk(p);
  p.returningToPost=true;p.nextRoutine=now+500;
  if(s.area==='village')npcResidenceDoor={x:home.x,y:home.doorY,until:now+320};
  return true;
 }
 if(p.returningToPost){
  p.task='Walking';
  if(p.x===p.homeX&&p.y===p.homeY){p.returningToPost=false;return false}
  const step=npcFindStep(p,p.homeX,p.homeY,W+H,true,true);
  if(step)npcBeginWalk(p,step,now);
  p.nextRoutine=now+(step?500:1200);return true;
 }
 return false;
}
function npcRoutinePlan(area,p,hour,starter){
 const x=p.homeX,y=p.homeY;
 if(NPC_PATROLS[p.id])return {task:'Patrolling',points:NPC_PATROLS[p.id],patrol:true};
 if(NPC_STATIONARY.has(p.kind)||p.kind==='routetrainer'||(p.kind==='researcher'&&!starter))return null;
 if(area==='garden'&&x===25&&y===11)return null;
 const night=hour<5||hour>=20,morning=hour<8,evening=hour>=17;
 if(p.kind==='center')return {task:'Checking equipment',points:[[x,y],[x+1,y],[x,y]],radius:1};
 if(p.kind==='shop')return shopIsOpen(hour)?{task:'Organizing supplies',points:[[x,y],[x+1,y],[x,y]],radius:1}:{task:'Resting',points:[[x,y]],radius:1};
 if(p.kind==='researcher'||p.kind==='labassistant')return {task:night?'Reviewing notes':'Researching',points:[[x,y],[x-2,y],[x,y+2]],radius:3};
 if(p.kind==='construction-worker')return night?{task:'Observing',points:[[x,y]]}:{task:'Working',points:[[x,y],[x+1,y],[x,y+1]],radius:2};
 if(p.id==='farmer-fieldwork')return {task:night?'Observing':morning?'Checking fields':evening?'Finishing work':'Tending rice',points:night?[[x,y]]:[[x,y],[x+2,y],[x,y-1]],radius:3};
 if(p.kind==='sidequest')return {task:'Observing',points:[[x,y],[x+1,y]],radius:1};
 if(area==='home'||area==='neighbor')return {task:night?'Resting':morning?'Preparing breakfast':evening?'Relaxing':'Housework',points:night?[[x,y]]:[[x,y],[x+2,y],[x,y+2]],radius:3};
 return {task:night?(isInterior(area)?'Resting':'Observing'):morning?'Walking':evening?'Relaxing':'Walking',points:night?[[x,y]]:evening?[[x,y],[x-1,y]]:morning?[[x,y],[x,y+2]]:[[x,y],[x+2,y],[x,y+2],[x-1,y]],radius:3};
}
function npcReservedCell(area,x,y,w,h){
 if(x<2||y<2||x>=w-2||y>=h-2)return true;
 if(TOWN_ROOMS[area]){const [ex,ey]=roomExit(area);if(Math.abs(x-ex)<=1&&y>=ey-3)return true}
 if(['home','neighbor','lab','homesteadHome','gym'].includes(area)&&x>=15&&x<=19&&y>=22)return true;
 if(area==='garden'&&x>=23&&x<=26&&y>=9&&y<=12)return true;
 if(area==='homestead'&&((x>=8&&x<=10&&y>=9&&y<=11)||y>=16))return true;
 if(area==='village'&&VILLAGE_HOUSES.some(b=>Math.abs(x-b.door)<=1&&y>=b.y+b.h&&y<=b.y+b.h+3))return true;
 // Avoid main road crossings and regional portals; patrols get separate explicit permission.
 return false;
}
function npcStepAllowed(p,x,y,patrol=false,residential=false){
 const home=residential&&npcResidence(s.area,p);
 const doorstep=home&&Math.abs(x-home.x)<=1&&y>=home.y&&y<=home.y+1;
 if((npcReservedCell(s.area,x,y,W,H)&&!doorstep)||solidAt(x,y)||tiles[y]?.[x]===T.door)return false;
 if(s.x===x&&s.y===y||npcs.some(q=>q!==p&&!q.indoors&&((q.x===x&&q.y===y)||(q.walking&&q.fromX===x&&q.fromY===y)||(q.homeX===x&&q.homeY===y))))return false;
 if(explorationSiteAt(s.area,x,y))return false;
 if(!patrol&&tiles[y]?.[x]===T.path&&y>=12&&y<=14&&OUTDOOR_GRID[s.area]&&!(x===p.homeX&&y===p.homeY))return false;
 return true;
}
function npcFindStep(p,tx,ty,radius,patrol=false,residential=false){
 if(p.x===tx&&p.y===ty)return null;
 const q=[{x:p.x,y:p.y,first:null}],seen=new Set([key(p.x,p.y)]);
 for(let i=0;i<q.length&&i<(residential?W*H:100);i++){
  const a=q[i];
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=a.x+dx,y=a.y+dy,k=key(x,y);
   if(seen.has(k)||Math.abs(x-p.homeX)+Math.abs(y-p.homeY)>radius||!npcStepAllowed(p,x,y,patrol,residential))continue;
   seen.add(k);const first=a.first||{x,y};if(x===tx&&y===ty)return first;q.push({x,y,first});
  }
 }
 return null;
}
function npcVisualPosition(p,now=performance.now()){
 if(!p.walking)return {x:p.x,y:p.y};
 const t=Math.max(0,Math.min(1,(now-p.walkStart)/p.walkDuration));
 return {x:p.fromX+(p.x-p.fromX)*t,y:p.fromY+(p.y-p.fromY)*t};
}
function npcFinishWalk(p){p.walking=false;p.fromX=p.x;p.fromY=p.y}
function npcBeginWalk(p,step,now){
 p.face=npcFaceToward(p,step.x,step.y);p.fromX=p.x;p.fromY=p.y;p.x=step.x;p.y=step.y;p.walking=true;p.walkStart=now;p.walkDuration=420;
}
function trainerSeesPlayer(p,px,py,range,blocked){
 const d=dirs[p.face];if(!d)return false;
 for(let i=1;i<=range;i++){
  const x=p.x+d[0]*i,y=p.y+d[1]*i;
  if(blocked(x,y))return false;
  if(x===px&&y===py)return true;
 }
 return false;
}
// Trainer encounter state is transient; no new save data or battle rules.
let trainerApproach=null;
function trainerApproachLocked(){return !!trainerApproach}
function cancelTrainerApproach(){
 if(trainerApproach?.p){npcFinishWalk(trainerApproach.p);trainerApproach.p.alertUntil=0}
 trainerApproach=null;
}
function beginTrainerApproach(p,now=performance.now()){
 if(trainerApproach)return false;
 p.face=npcFaceToward(p,s.x,s.y);
 trainerApproach={p,area:s.area,x:s.x,y:s.y,phase:'alert',until:now+650,deadline:now+4200};
 p.alertUntil=now+650;releaseMovement();return true;
}
function trainerApproachStep(p,px,py){
 const dx=px-p.x,dy=py-p.y;
 if(Math.abs(dx)+Math.abs(dy)<=1)return null;
 if(dx!==0&&dy!==0)return null;
 return {x:p.x+Math.sign(dx),y:p.y+Math.sign(dy)};
}
function finishTrainerApproach(now){
 const e=trainerApproach;if(!e)return;
 const p=e.p;npcFinishWalk(p);p.alertUntil=0;p.pauseUntil=now+2200;
 p.face=npcFaceToward(p,s.x,s.y);s.face=npcFaceToward(s,p.x,p.y);
 trainerApproach=null;releaseMovement();
 say(p.text,()=>{if(s.area===e.area&&!s.defeated[p.id])startTrainer(p.id)});
}
function tickTrainerApproach(now){
 const e=trainerApproach;if(!e)return false;
 const p=e.p;
 if(s.area!==e.area||s.x!==e.x||s.y!==e.y||!npcs.includes(p)||s.defeated[p.id]||battle||screen!=='game'){cancelTrainerApproach();return false}
 if(document.hidden||modal||worldTransitionBusy||doorTransition||narratorBlocking())return true;
 if(p.walking){if(now-p.walkStart<p.walkDuration)return true;npcFinishWalk(p)}
 if(now<e.until)return true;
 const step=trainerApproachStep(p,e.x,e.y);
 if(!step||now>=e.deadline||!npcStepAllowed(p,step.x,step.y,true)){
  // If a route becomes obstructed, finish safely from the current location.
  finishTrainerApproach(now);return true;
 }
 e.phase='walk';npcBeginWalk(p,step,now);p.walkDuration=260;e.until=now+260;return true;
}
function checkTrainerSight(){
 if(trainerApproach||!s.introComplete||modal||battle||narratorBlocking()||worldTransitionBusy||doorTransition||firstAlive()<0)return false;
 for(const p of npcs){
  if(!NPC_PATROLS[p.id]||s.defeated[p.id]||p.walking||performance.now()<(p.pauseUntil||0))continue;
  if(!trainerSeesPlayer(p,s.x,s.y,4,(x,y)=>solidAt(x,y)||npcs.some(q=>q!==p&&(q.x===x&&q.y===y||q.walking&&q.fromX===x&&q.fromY===y))))continue;
  return beginTrainerApproach(p);
 }
 return false;
}
let npcLastTick=0;
function tickNpcRoutines(now=performance.now()){
 if(!s||screen!=='game'||modal||battle||narratorBlocking()||worldTransitionBusy||doorTransition||document.hidden)return;
 if(trainerApproach&&tickTrainerApproach(now))return;
 if(now-npcLastTick<100)return;npcLastTick=now;
 for(const p of npcs){
  if(p.walking){if(now-p.walkStart<p.walkDuration)continue;npcFinishWalk(p)}
  if(now<(p.pauseUntil||0)||now<(p.nextRoutine||0))continue;
  if(tickNpcResidence(p,now))continue;
  const plan=npcRoutinePlan(s.area,p,worldHour(),s.starter);
  if(!plan)continue;
  p.task=plan.task;
  const points=plan.points,radius=plan.patrol?8:plan.radius||3;
  const scheduleKey=plan.task+':'+JSON.stringify(points);
  if(p.routineTask!==scheduleKey){p.routineTask=scheduleKey;p.routineIndex=0}
  if(points.length===1&&p.x===points[0][0]&&p.y===points[0][1]){p.nextRoutine=now+3500;continue}
  let i=(p.routineIndex||0)%points.length;
  if(p.x===points[i][0]&&p.y===points[i][1]){i=(i+1)%points.length;p.routineIndex=i;p.nextRoutine=now+(plan.patrol?850:2200);continue}
  const step=npcFindStep(p,points[i][0],points[i][1],radius,!!plan.patrol);
  if(step){npcBeginWalk(p,step,now);p.nextRoutine=now+500}
  else{p.routineIndex=(i+1)%points.length;p.nextRoutine=now+1200}
 }
 checkTrainerSight();
}
function pauseNpcForInteraction(p){
 if(!p)return;
 npcFinishWalk(p);p.pauseUntil=performance.now()+2200;p.face=npcFaceToward(p,s.x,s.y);
}
function npc(x,y,text,kind='',id=''){
 const sprite=pickNpcSprite(x,y,kind,id);
 const face=((x*31+y*7)%7===0)?'left':((x*13+y*11)%9===0)?'right':'down';
 npcs.push({x,y,homeX:x,homeY:y,text,kind,id,sprite,face,walking:false});
}
function borders(type=T.tree){for(let x=0;x<W;x++){put(x,0,type);put(x,H-1,type)}for(let y=0;y<H;y++){put(0,y,type);put(W-1,y,type)}}
function houses(list){list.forEach(([x,y,w=7,h=5])=>{rect(x,y,w,h,T.roof);rect(x,y+h,w,2,T.wall);put(x+Math.floor(w/2),y+h+1,T.door)})}
function roads(){rect(1,12,32,3,T.path)}
function nature(seed,area){for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(tiles[y][x]===T.grass){const n=(x*43+y*59+x*y*7+seed)%113;if(n<area)put(x,y,T.tall);else if(n===44||n===79)put(x,y,T.flower)}}
// Phase 18: side quests are completely optional and never gate main-story routes.
// Capture quests track captures AFTER acceptance. Landmark quests use existing finds.
const SIDE_QUESTS=[
 {id:'farmer-fieldwork',title:'Farmer’s Field Notes',giver:'Rice Farmer',area:'route1',
  description:'Help document two wild Critters caught in the rice fields.',kind:'captures',captureArea:'route1',required:2,
  reward:{credits:90,item:'Potion',quantity:1}},
 {id:'bamboo-survey',title:'Bamboo Wildlife Survey',giver:'Town Naturalist',area:'town',
  description:'Capture two wild Critters on Route 2 to help with a habitat survey.',kind:'captures',captureArea:'route2',required:2,
  reward:{item:'Grass Stone',quantity:1}},
 {id:'forest-shrine',title:'The Forgotten Shrine',giver:'Forest Guide',area:'forest',
  description:'Find the glowing shrine hidden within the forest.',kind:'landmark',landmark:'exp-forest',
  reward:{item:'Ghost Stone',quantity:1}},
 {id:'garden-memorial',title:'Garden Memories',giver:'Garden Caretaker',area:'garden',
  description:'Find the Garden Memorial and learn its story.',kind:'landmark',landmark:'exp-garden',
  reward:{item:'Water Stone',quantity:1}},
 {id:'lost-companion',hub:'farmer-fieldwork',title:'A Missing Companion',giver:'Rice Farmer',area:'route1',kind:'object',description:'Find the missing companion near the northern lookout. Bring it safely back; do not use the capture beam.',reward:{credits:100,item:'Potion',quantity:2}},
 {id:'farm-delivery',hub:'farmer-fieldwork',requires:'lost-companion',title:'From Farm to Town',giver:'Rice Farmer',area:'route1',kind:'object',description:'Deliver the sealed farm supplies to the desk next to the Small Town Critter Center, then report back.',reward:{credits:140,item:'PP Potion'}},
 {id:'trail-repair',hub:'bamboo-survey',title:'A Safer Trail',giver:'Town Naturalist',area:'town',kind:'object',description:'Repair the damaged trail marker on the northern bamboo path, then return.',reward:{credits:100,item:'Potion',quantity:2}},
 {id:'grotto-research',hub:'bamboo-survey',requires:'trail-repair',title:'Grotto Field Study',giver:'Town Naturalist',area:'town',kind:'landmark',landmark:'secret-grotto',description:'Discover the Bamboo Grotto and report its location.',reward:{credits:150,item:'Revive'}},
 {id:'ruins-research',hub:'forest-shrine',requires:'forest-shrine',title:'Reading the Ruins',giver:'Forest Guide',area:'forest',kind:'puzzle',description:'Find the Forgotten Ruins and solve its rune puzzle.',reward:{credits:180,item:'PP Potion',quantity:2}},
 {id:'garden-challenge',hub:'garden-memorial',title:'A Friendly Challenge',giver:'Garden Caretaker',area:'garden',kind:'trainer',description:'Win an optional friendly battle with the caretaker. Speak again to collect your reward.',reward:{credits:160,item:'Revive'}},
 {id:'cavern-research',hub:'garden-memorial',requires:'garden-challenge',title:'Beyond the Crystal Alcove',giver:'Garden Caretaker',area:'garden',kind:'landmark',landmark:'secret-cavern',description:'After earning your first badge, discover Crystal Cavern and report back.',reward:{credits:200,item:'PP Potion',quantity:2}}
];
function sideQuest(id){return SIDE_QUESTS.find(q=>q.id===id)||null}
function sideQuestProgress(q){
 const saved=s.sideQuests?.[q.id];if(!saved)return 0;
 if(q.kind==='landmark')return s.discoveries?.[q.landmark]?1:0;
 if(q.kind==='object')return saved.objectDone?1:0;
 if(q.kind==='puzzle')return s.puzzles?.ruinsOpened?1:0;
 if(q.kind==='trainer')return saved.won?1:0;
 return Math.max(0,(s.questCaptureCounts?.[q.captureArea]||0)-(saved.baseline||0));
}
function sideQuestGoal(q){return q.kind==='captures'?q.required:1}
function sideQuestRewardLabel(q){
 return [q.reward.credits?q.reward.credits+' money':'',q.reward.item?q.reward.item+' ×'+(q.reward.quantity||1):''].filter(Boolean).join(' + ');
}
function questUnlocked(q){return !q.requires||s.sideQuests?.[q.requires]?.status==='complete'}
function questHub(id){
 const quests=SIDE_QUESTS.filter(q=>q.id===id||q.hub===id);
 if(!quests.length)return;
 open(quests[0].giver+' · Side Quests','<p>Choose an optional assignment.</p><div class="options">'+quests.map(q=>{
  const state=s.sideQuests?.[q.id],status=state?.status==='complete'?'Completed':!questUnlocked(q)?'Locked':state?'In progress':'Available';
  return '<button class="btn" data-quest-select="'+escapeHtml(q.id)+'" '+(!questUnlocked(q)?'disabled':'')+'>'+escapeHtml(q.title)+' · '+status+'</button>';
 }).join('')+'</div>');
 document.querySelectorAll('[data-quest-select]').forEach(b=>b.onclick=()=>talkSideQuest(b.dataset.questSelect,true));
}
function talkSideQuest(id,refresh=false){
 const q=sideQuest(id);if(!q||!questUnlocked(q))return;
 const state=s.sideQuests?.[id],progress=Math.min(sideQuestGoal(q),sideQuestProgress(q));
 const done=!!state&&state.status==='complete',ready=!!state&&state.status==='active'&&progress>=sideQuestGoal(q);
 const message=done?'Thank you again! Your help made a difference.':
  ready?'You did it! I have a reward for your work.':
  state?'Keep exploring. You have made '+progress+' / '+sideQuestGoal(q)+' progress.':
  'Would you like to help? This is optional, and your main journey will continue normally.';
 if(!refresh)return say([q.giver+': '+message],()=>talkSideQuest(id,true));
 open(q.giver+' · Side Quest','<h3>'+escapeHtml(q.title)+'</h3><p>'+escapeHtml(q.description)+'</p>'
  +'<p><b>Progress:</b> '+progress+' / '+sideQuestGoal(q)+'</p>'
  +'<p><b>Reward:</b> '+escapeHtml(sideQuestRewardLabel(q))+'</p>'
  +'<div class="options">'
  +(ready?'<button class="btn primary" id="questClaim">Claim reward</button>':'')
  +(!state?'<button class="btn primary" id="questAccept">Accept quest</button>':'')
  +(state?.status==='active'&&q.kind==='trainer'&&!ready?'<button class="btn primary" id="questBattle">Start friendly battle</button>':'')
  +'<button class="btn" id="questClose">Back to quests</button></div>');
 if($('questAccept'))$('questAccept').onclick=()=>{
  s.sideQuests[q.id]={status:'active',baseline:q.kind==='captures'?(s.questCaptureCounts?.[q.captureArea]||0):0};
  save();indexNotice('Quest accepted: '+q.title+'.');talkSideQuest(q.id,true);
 };
 if($('questClaim'))$('questClaim').onclick=()=>{
  const active=s.sideQuests[q.id];if(!active||active.status!=='active'||sideQuestProgress(q)<sideQuestGoal(q))return;
  if(q.reward.credits)s.money+=q.reward.credits;
  if(q.reward.item)s.inventory[q.reward.item]=(s.inventory[q.reward.item]||0)+(q.reward.quantity||1);
  active.status='complete';save();indexNotice('Quest completed: '+q.title+'. Reward: '+sideQuestRewardLabel(q)+'.');
  talkSideQuest(q.id,true);
 };
 const challenge=$('questBattle');if(challenge)challenge.onclick=()=>{close();startTrainer('quest-garden')};
 $('questClose').onclick=()=>questHub(q.hub||q.id);
}
function sideQuestIndex(){
 return '<div class="watchSectionTitle">Side quests <small>'+SIDE_QUESTS.filter(q=>s.sideQuests?.[q.id]?.status==='complete').length+'/'+SIDE_QUESTS.length+' complete</small></div>'
  +SIDE_QUESTS.map(q=>{
   const state=s.sideQuests?.[q.id],progress=Math.min(sideQuestGoal(q),sideQuestProgress(q));
   const status=state?.status==='complete'?'Completed':!questUnlocked(q)?'Locked':!state?'Not accepted':progress>=sideQuestGoal(q)?'Return to '+q.giver:progress+' / '+sideQuestGoal(q);
   return '<div class="watchRow"><span><b>'+escapeHtml(q.title)+'</b><small> · '+escapeHtml(q.giver)+' · '+escapeHtml(q.description)+'</small></span><span>'+escapeHtml(status)+'</span></div>';
  }).join('')
  +'<div class="watchReadOnly">Side quests are optional. Accept and claim rewards by speaking to their NPCs.</div>';
}
function build(preview=false){
 if(!preview){cancelTrainerApproach();npcResidenceDoor=null;migrate()}
 applyAreaSize(s.area);tiles=Array.from({length:H},()=>Array(W).fill(['lab','gym','home','neighbor','homesteadHome'].includes(s.area)?T.wood:T.grass));npcs=[];villageObstacles=new Set();interiorObjects=[];interiorBlocked=new Set();route1Blocked=new Set();
 switch(s.area){
 case 'grotto':case 'ruins':case 'cavern':case 'willowHollow':buildSecretArea(s.area);break;
 case 'homestead':{
 const stage=homesteadConstructionStage(),owned=!!s.homestead?.owned;
 borders();rect(15,12,W-16,3,T.path);rect(15,10,3,4,T.path);
 // Fixed lot perimeter and a gate which remains closed until purchase.
 rect(3,3,12,8,T.hedge);rect(4,4,10,6,T.grass);
 rect(6,5,6,5,T.path);
 if(stage===1)rect(6,5,6,2,T.stone);
 if(stage===2){rect(6,5,6,3,T.wall);rect(6,8,6,2,T.stone)}
 if(stage>=3)houses([[6,5,6,3]]);
 if(owned){put(9,10,T.path);rect(9,11,2,3,T.path);put(9,9,T.door);rect(9,14,7,1,T.path);buildFarmGrounds()}else if(stage>=3)put(9,9,T.wall);
 if(stage<4){
  npc(13,11,['We are working on the new building. Please keep clear of the site.'],'construction-worker','builder1');
  npc(18,10,['There is still work to do.'],'construction-worker','builder2');
  if(stage<3)npc(5,12,['Mind the materials!'],'construction-worker','builder3');
 }else if(!owned)npc(16,10,['The work here is finished.'],'property-sign');
 else npc(16,10,['Welcome home.'],'property-sign');
 break;
 }
 case 'homesteadHome':
 borders(T.wall);put(17,25,T.door);furnishInterior('homesteadHome');break;
 case 'village':
 // One art system: original house roof/wall tiles are NOT placed in the village.
 borders();roads();rect(16,12,3,13,T.path);rect(7,10,2,3,T.path);rect(24,11,2,2,T.path);
 // Connected worn paths between home, farms, lab, and the village exit.
 rect(11,11,6,2,T.path);rect(9,10,3,2,T.path);
 rect(21,14,7,2,T.path);rect(20,15,2,9,T.path);
 rect(21,23,8,1,T.path);rect(13,19,3,2,T.path);rect(12,20,2,3,T.path);
 // Terraced rice fields, irrigation channels, woodland clusters.
 for(let y=17;y<23;y++)for(let x=2;x<11;x++)if((x+y)%11!==0)put(x,y,T.rice);
 for(let y=2;y<11;y++)for(let x=12;x<20;x++)if((x+3*y)%7===0)put(x,y,T.tree);
 nature(8,0);
 // Clear the entire east/west trail opening and its visible shoulders.
 // Border trees used to be painted over the path at x=0 and x=W-1.
 for(const edge of [0,W-1]){
  // The lower shoulder remains wooded where the fence blocks movement.
  for(let y=11;y<=15;y++)put(edge,y,T.grass);
  for(let y=12;y<=14;y++)put(edge,y,T.path);
 }
 // The portal checks at x=32 remain unchanged, but the art now meets the edge.
 for(let x=1;x<=3;x++)for(let y=12;y<=14;y++)put(x,y,T.path);
 for(let x=W-4;x<W-1;x++)for(let y=12;y<=14;y++)put(x,y,T.path);
 buildVillageColliders();
 npc(12,14,['Welcome to the valley! The scientist works in the northeast laboratory.']);
 npc(22,15,['Follow the eastern road toward Route 1!']);
 break;
 case 'townHouseA':case 'townHouseB':case 'gardenHouse':case 'townCenter':case 'gardenCenter':case 'townShop':case 'gardenShop':{
  borders(T.wall);put(...roomExit(s.area),T.door);furnishInterior(s.area);
  const room=TOWN_ROOMS[s.area];
  if(room.kind==='center')npc(12,4,['Welcome to the Critter Center.'],'center');
  else if(room.kind==='shop')npc(10,4,['Welcome to the Critter Shop.'],'shop');
  else npc(8,7,['Welcome to our home.','Travel safely on the regional trails.']);
  break;
 }
 case 'home':
 case 'neighbor':
 borders(T.wall);put(17,25,T.door);
 furnishInterior(s.area);
 npc(14,11,s.area==='home'?['Your family is happy you came home.','The research lab has been preparing for your first journey.']:['Welcome! We have tea if you want to rest a moment.','The rice paddies look beautiful at sunset.']);
 if(s.area==='neighbor'&&npcNight()){npc(12,10,['Welcome to our home. We are resting for the night.']);npc(20,10,['We will head back outside in the morning.'])}
 break;
 case 'lab':
 borders(T.wall);put(17,25,T.door);
 furnishInterior('lab');
 npc(17,7,['Welcome to the research laboratory!','Your Critter Index is a capture device, inventory and party manager.','Choose a Rock, Water or Electric starter.'],'researcher');
 npc(21,10,['Lab Assistant: I help maintain the Critter Index and calibrate its capture beam.','The researcher has three starter Critters ready for you.'],'labassistant');
 break;
 case 'route1':
 // A winding countryside road with connected side trails and terrace paddies.
 borders();roads();
 // Western and eastern portals are three tiles wide; no trees sit above them.
 for(const edge of [0,1,W-2,W-1])for(let y=11;y<=15;y++)
  put(edge,y,y>=12&&y<=14?T.path:T.grass);
 // North farmer lookout branch and south irrigation exploration loop.
 rect(11,5,3,8,T.path);
 rect(9,5,5,2,T.path);
 rect(22,14,3,8,T.path);
 rect(18,20,7,2,T.path);
 rect(17,17,2,5,T.path);
 rect(14,16,5,2,T.path);
 // Rice terraces in coherent fields rather than randomly interleaved squares.
 for(let y=3;y<=10;y++)for(let x=3;x<=30;x++){
  if(tiles[y][x]!==T.grass)continue;
  if((x<=9&&y>=5)||(x>=15&&x<=29&&y<=10))
   put(x,y,((x*7+y*3)%11<8)?T.rice:T.tall);
 }
 for(let y=16;y<=23;y++)for(let x=3;x<=30;x++){
  if(tiles[y][x]!==T.grass)continue;
  if(x<=13||x>=19)put(x,y,((x*5+y*7)%10<7)?T.rice:T.tall);
 }
 // Shallow irrigation channels. Crossings are explicitly kept walkable.
 for(let x=3;x<=10;x++)put(x,9,T.water);
 for(let x=15;x<=30;x++)put(x,9,T.water);
 for(let x=3;x<=13;x++)put(x,19,T.water);
 for(let x=26;x<=30;x++)put(x,19,T.water);
 // Clear walking routes and little crossings on the agricultural side trails.
 rect(11,5,3,8,T.path);rect(22,14,3,8,T.path);
 rect(18,20,7,2,T.path);rect(17,17,2,5,T.path);rect(14,16,5,2,T.path);
 rect(1,12,32,3,T.path);
 // Organic groves and ancient stones away from main road, houses and portals.
 for(const [x,y] of [[3,3],[5,3],[7,4],[17,3],[19,4],[27,3],[30,4],[4,23],[10,23],[28,23],[31,21],[31,23]])put(x,y,T.tree);
 for(const [x,y] of [[15,7],[29,16],[5,16],[9,22]])if(tiles[y][x]===T.grass)put(x,y,T.rock);
 // Distinct interactive landmarks; their own footprint is always solid.
 for(const o of ROUTE1_SITES){put(o.x,o.y,T.grass);route1Blocked.add(key(o.x,o.y))}
 // Keep the two existing NPCs and the trainer’s battle progression.
 npc(9,11,['Route 1 has wild Critters hiding in the rice fields.','The northern lookout and southern paddies are worth exploring.'],'sidequest','farmer-fieldwork');
 npc(20,13,['Want to test your team against mine?'],'routetrainer','rt1');
 break;
 case 'town':
 borders();roads();rect(16,8,2,5,T.path);rect(16,15,2,7,T.path);houses([[4,5,8,5],[21,5,9,5],[4,17,8,4],[21,17,9,4]]);
 npc(9,12,['Welcome to the town between the rice fields and the bamboo woods!']);
 npc(22,15,['The Critter Center is just north of here. Go inside for healing and Index maintenance.']);
 npc(14,18,['The supply shop is southwest of here.']);
 npc(16,10,['This town is a good place to rest before Route 2.'],'sidequest','bamboo-survey');
 break;
 case 'route2':
 borders();roads();rect(10,1,3,12,T.path);rect(25,15,2,8,T.path);
 for(let y=2;y<12;y++)for(let x=2;x<32;x++)if(x<10||x>12)if((x*13+y*7)%7<5)put(x,y,T.tree);
 for(let y=16;y<24;y++)for(let x=3;x<31;x++)if(x<25||x>26)if((x*19+y*11)%8<4)put(x,y,T.tall);
 rect(10,1,3,3,T.path);
 npc(18,13,['The bamboo forest twists around the walking paths.','A hidden woodland clearing lies to the north.']);npc(24,13,['I spotted you on the trail!'],'routetrainer','rt2');
 break;
 case 'forest':
 borders();rect(15,13,4,12,T.path);rect(5,9,24,3,T.path);rect(15,7,4,6,T.path);
 for(let y=2;y<24;y++)for(let x=2;x<32;x++)if(tiles[y][x]===T.grass&&(x*23+y*11)%7<4)put(x,y,(x+y)%3===0?T.tall:T.tree);
 rect(15,13,4,12,T.path);rect(5,9,24,3,T.path);rect(15,7,4,6,T.path);
 npc(9,9,['You found the Hidden Forest!','Rare habitats and additional wild encounters reward exploration.'],'sidequest','forest-shrine');
 break;
 case 'route3':
 borders();roads();rect(19,1,3,12,T.path);rect(6,15,2,8,T.path);
 for(let y=2;y<24;y++)for(let x=2;x<32;x++)if(tiles[y][x]===T.grass&&(x*17+y*13)%8<4)put(x,y,(x+y)%3===0?T.tall:T.rock);
 rect(19,1,3,12,T.path);rect(1,12,32,3,T.path);
 npc(25,13,['Mountain foothills rise above the trail.','A cave to the north is blocked by thick vines until you earn the first badge.']);npc(12,13,['A challenging battle ahead!'],'routetrainer','rt3');
 break;
 case 'cave':
 borders(T.rock);rect(15,13,4,12,T.stone);rect(4,8,27,7,T.stone);rect(10,4,16,16,T.stone);
 for(let y=3;y<23;y++)for(let x=3;x<31;x++)if(tiles[y][x]===T.stone&&(x*13+y*21)%18===0)put(x,y,T.rock);
 rect(15,13,4,12,T.stone);
 npc(8,10,['The mountain cave echoes with wild Critter calls.']);
 break;
 case 'route4':
 borders();
 // Willow-lined river crossing, marshes and a walkable central bridge.
 rect(19,1,6,H-2,T.water);rect(1,12,W-2,3,T.path);
 rect(8,5,3,8,T.path);rect(5,5,6,2,T.path);rect(30,14,3,13,T.path);rect(30,25,10,3,T.path);
 rect(3,17,12,13,T.flower);rect(28,3,12,7,T.tall);
 for(let y=2;y<H-1;y++)for(let x=2;x<W-1;x++)if(tiles[y][x]===T.grass&&(x*17+y*23)%19<4)put(x,y,T.tree);
 rect(8,5,3,8,T.path);rect(5,5,6,2,T.path);rect(30,14,3,13,T.path);rect(30,25,10,3,T.path);
 rect(1,12,W-2,3,T.path);
 npc(12,11,['The river trail leads to Garden Town.','There is an old shrine north of the bridge.']);
 break;
 case 'ridge':
 borders(T.rock);rect(1,12,W-2,3,T.path);rect(14,6,4,7,T.path);rect(26,14,3,11,T.path);
 for(let y=2;y<H-1;y++)for(let x=2;x<W-1;x++)if(tiles[y][x]===T.grass&&(x*19+y*13)%17<5)put(x,y,(x+y)%3===0?T.tree:T.rock);
 rect(1,12,W-2,3,T.path);rect(14,6,4,7,T.path);rect(26,14,3,11,T.path);
 npc(19,11,['This old ridge trail connects the bamboo woods with the mountain foothills.']);
 break;
 case 'garden':
 borders();roads();rect(23,8,3,5,T.path);rect(5,8,2,5,T.path);houses([[2,3,9,4],[20,3,10,5],[3,18,8,4],[20,18,10,4]]);
 for(let x=12;x<19;x++)for(let y=3;y<11;y++)if((x+y)%4===0)put(x,y,T.flower);
 rect(11,16,8,6,T.water);rect(14,16,2,6,T.path);
 npc(7,12,['Garden Town is famous for koi ponds, lanterns and the Grass Gym.'],'sidequest','garden-memorial');
 npc(14,13,['The Critter Center is in the northwest of Garden Town.']);
 npc(20,15,['Visit the shop in the southeast for supplies before the Gym.']);
 npc(25,11,['The Grass Gym entrance is directly north.','Inside is an overgrown hedge maze.']);
 break;
 case 'gym':
 borders(T.wall);rect(3,4,28,18,T.path);for(let x=6;x<29;x+=6)rect(x,6,2,15,T.hedge);
 for(let i=0;i<4;i++)rect(6+i*6,9+(i%2)*7,2,3,T.path);
 rect(16,18,3,4,T.path);rect(15,2,6,6,T.path);rect(15,4,6,3,T.mat);put(17,25,T.door);
 if(!s.puzzles.gate)rect(15,12,4,2,T.gate);
 npc(9,14,['The first gym trainer guards the garden paths.'],'gymtrainer','g1');
 npc(23,17,['The second trainer specializes in Grass Critters.'],'gymtrainer','g2');
 npc(10,8,['The third trainer is waiting among the hedges.'],'gymtrainer','g3');
 npc(17,5,['Welcome to my garden!','Show me how your Critters have grown.'],'leader');
 npc(17,15,['These roots block the central path. Defeat all three trainers and activate the garden mechanism.'],'switch');
 break;
 }
 // Older saves may place the character inside geometry introduced by the rebuild.
 // Relocate only when necessary, to the closest free walkable square.
 decorateExpandedOutdoor();
 prepareOutdoorPortals();
 prepareExplorationGeometry();
 clearBuildingScenery();
 // Author an unobstructed two-cell apron and visible door for every town room.
 for(const room of Object.values(TOWN_ROOMS))if(room.parent===s.area){
  const [dx,dy]=room.door;put(dx,dy,T.door);
  for(let xx=dx-1;xx<=dx+1;xx++)for(let yy=dy+1;yy<=dy+2;yy++)if(tiles[yy]?.[xx]!==T.roof&&tiles[yy]?.[xx]!==T.wall)put(xx,yy,T.path);
 }
 if(!preview&&TOWN_ROOMS[s.area]&&(s.x<1||s.x>=W-1||s.y<1||s.y>=H-1)){const [ex,ey]=roomExit(s.area);s.x=ex;s.y=ey-2}
 if(!preview&&(solidAt(s.x,s.y)||npcs.some(p=>p.x===s.x&&p.y===s.y&&!p.indoors))){
  const originX=s.x,originY=s.y;
  let found=false;
  for(let radius=1;radius<Math.max(W,H)&&!found;radius++){
   for(let dy=-radius;dy<=radius&&!found;dy++)for(let dx=-radius;dx<=radius;dx++){
    if(Math.abs(dx)+Math.abs(dy)!==radius)continue;
    const nx=originX+dx,ny=originY+dy;
    if(nx<1||ny<1||nx>=W-1||ny>=H-1||solidAt(nx,ny)||npcs.some(p=>p.x===nx&&p.y===ny))continue;
    s.x=nx;s.y=ny;found=true;break;
   }
  }
  if(!found){for(let yy=1;yy<H-1&&!found;yy++)for(let xx=1;xx<W-1;xx++)if(!solidAt(xx,yy)&&!npcs.some(p=>p.x===xx&&p.y===yy)){s.x=xx;s.y=yy;found=true;break}}
 }
 // Reconstruct overnight occupancy from saved time, including preview chunks.
 if(npcNight())for(const p of npcs){if(npcResidence(s.area,p)){p.indoors=true;p.x=-100;p.y=-100;npcFinishWalk(p);p.task='Resting'}}
 if(!preview){
  snapVisual();
  if(OUTDOOR_GRID[s.area])outdoorChunks.set(s.area,{tiles,npcs,villageObstacles,route1Blocked,interiorObjects,interiorBlocked,w:W,h:H,constructionKey:s.area==='homestead'?homesteadGeometryKey():null});
 }

}
const worldNarratorQueue=[];let worldNarratorCurrent=null,worldNarratorTimer=null;
function narratorBlocking(){return !!worldNarratorCurrent&&!worldNarratorCurrent.notice}
function hideWorldNarrator(){clearTimeout(worldNarratorTimer);worldNarratorTimer=null;$('dialog').classList.remove('notice');$('dialog').classList.add('show','idle');$('dialogText').textContent='';$('dialogHint').textContent='';$('game').classList.remove('narrating')}
function clearWorldNarrator(){hideWorldNarrator();worldNarratorQueue.length=0;worldNarratorCurrent=null}
function suspendWorldNotice(){if(worldNarratorCurrent?.notice){worldNarratorQueue.unshift(worldNarratorCurrent);worldNarratorCurrent=null;hideWorldNarrator()}}
function say(lines,callback){enqueueWorldNarration(lines,false,callback)}
function notifyWorld(lines){enqueueWorldNarration(lines,true)}
function indexNotice(message){notifyWorld('Critter Index: '+message)}
function enqueueWorldNarration(lines,notice,callback){
 const list=(Array.isArray(lines)?lines:[lines]).filter(x=>typeof x==='string'&&x.trim());
 if(!list.length){if(callback)callback();return}
 if(notice&&[worldNarratorCurrent,...worldNarratorQueue].some(n=>n?.notice&&n.lines.join('\n')===list.join('\n')))return;
 const entry={lines:list.slice(),notice,callback};
 if(!notice&&worldNarratorCurrent?.notice){suspendWorldNotice();worldNarratorQueue.unshift(entry)}else worldNarratorQueue.push(entry);
 pumpWorldNarrator();
}
function pumpWorldNarrator(){
 if(worldNarratorCurrent||!worldNarratorQueue.length||modal||screen!=='game')return;
 worldNarratorCurrent=worldNarratorQueue.shift();if(!worldNarratorCurrent.notice)releaseMovement();renderWorldNarrator();
}
function renderWorldNarrator(){
 const n=worldNarratorCurrent;if(!n)return;
 $('dialogText').textContent=n.lines[0];$('dialog').classList.remove('idle');$('dialog').classList.toggle('notice',n.notice);$('dialog').classList.add('show');$('game').classList.add('narrating');
 $('dialogHint').textContent=n.notice?'':'Interact / tap to continue ▸';
 if(n.notice)worldNarratorTimer=setTimeout(advance,Math.max(2700,Math.min(6500,n.lines[0].length*45)));
}
function advance(){
 if(!worldNarratorCurrent||modal)return;
 clearTimeout(worldNarratorTimer);worldNarratorTimer=null;
 const n=worldNarratorCurrent;n.lines.shift();if(n.lines.length){renderWorldNarrator();return}
 worldNarratorCurrent=null;hideWorldNarrator();if(n.callback)n.callback();pumpWorldNarrator();
}
// Extract each sprite's visible alpha bounds once. Different walk frames contain
// different transparent padding; cropping and centering on feet eliminates the
// apparent sideways drifting and keeps every frame on the same ground line.
const spriteFrames={male:null,female:null};
function spriteMetrics(gender){
 if(spriteFrames[gender])return spriteFrames[gender];
 const im=sprites[gender];if(!im.complete||!im.naturalWidth)return null;
 const rows=gender==='female'?3:4,cellH=Math.floor(im.naturalHeight/rows);
 // Male sheet centers are approximately 27, 52, 76, 101 on a 128px sheet.
 const cuts=(gender==='male'?[0,39,64,89,128]:[0,32,64,96,128]).map(v=>Math.round(v*im.naturalWidth/128));
 const canvas=document.createElement('canvas');
 canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;
 const g=canvas.getContext('2d',{willReadFrequently:true});
 if(!g)return null;
 g.drawImage(im,0,0);
 const data=g.getImageData(0,0,canvas.width,canvas.height).data;
 const result=[];
 for(let row=0;row<rows;row++){
  const frames=[];
  for(let col=0;col<4;col++){
   const cellStart=cuts[col],cellW=cuts[col+1]-cellStart;
   let minX=cellW,minY=cellH,maxX=-1,maxY=-1,torsoX=0,torsoN=0;
   for(let y=0;y<cellH;y++)for(let x=0;x<cellW;x++){
    const alpha=data[((row*cellH+y)*canvas.width+cellStart+x)*4+3];
    if(alpha<24)continue;
    if(x<minX)minX=x;if(y<minY)minY=y;
    if(x>maxX)maxX=x;if(y>maxY)maxY=y;
   }
   if(maxX<0){frames.push({sx:cellStart,sy:row*cellH,sw:cellW,sh:cellH,anchorX:cellW/2});continue}
   // Anchor horizontal position to the upper body, not to swinging legs.
   const torsoTop=minY+Math.floor((maxY-minY)*0.2);
   const torsoBottom=minY+Math.floor((maxY-minY)*0.65);
   for(let y=torsoTop;y<=torsoBottom;y++)for(let x=minX;x<=maxX;x++){
    if(data[((row*cellH+y)*canvas.width+cellStart+x)*4+3]>=100){torsoX+=x;torsoN++}
   }
   const center=torsoN?torsoX/torsoN:(minX+maxX)/2;
   frames.push({sx:cellStart+minX,sy:row*cellH+minY,sw:maxX-minX+1,sh:maxY-minY+1,anchorX:center-minX});
  }
  result.push(frames);
 }
 spriteFrames[gender]=result;
 return result;
}
function sprite(gender,x,y,d,f,scale=1){
 const im=sprites[gender];
 if(!im.complete||!im.naturalWidth){ctx.fillStyle='#c9685e';ctx.fillRect(x-10,y-28,20,28);return}
 const girl=gender==='female';let row={down:0,up:1,left:2,right:3}[d],col=f;
 if(girl&&d==='left'){row=2;col=f%2}
 if(girl&&d==='right'){row=2;col=2+f%2}
 const frameData=spriteMetrics(gender)?.[row]?.[col];
 if(!frameData)return;
 const {sx,sy,sw,sh,anchorX}=frameData;
 // The character's feet stay on the same world coordinate in all frames.
 const pixelScale=1.58*scale;
 ctx.drawImage(im,sx,sy,sw,sh,x-anchorX*pixelScale,y-sh*pixelScale,sw*pixelScale,sh*pixelScale);
 const outfit=trainerOutfitColor();if(outfit){ctx.save();ctx.fillStyle=outfit;ctx.fillRect(x-3*scale,y-sh*pixelScale*.53,6*scale,4*scale);ctx.fillRect(x-2*scale,y-sh*pixelScale*.53+4*scale,3*scale,4*scale);ctx.restore()}
}
// Terrain topology is visual only: N/E/S/W mask, with stable world-edge links.
function terrainNeighbor(a,b,dx,dy){
 const x=a+dx,y=b+dy;
 if(x>=0&&y>=0&&x<W&&y<H)return tiles[y]?.[x];
 const dir=dx<0?'left':dx>0?'right':dy<0?'up':'down';
 const link=OUTDOOR_LINKS[s.area]?.[dir],cross=dx?b:a;
 if(link&&OUTDOOR_GRID[link[0]]&&cross>=link[1]&&cross<=link[2])return T.path;
 return undefined;
}
function terrainMask(a,b,accept){
 return [[0,-1],[1,0],[0,1],[-1,0]].reduce((m,[dx,dy],i)=>m|(accept(terrainNeighbor(a,b,dx,dy))?1<<i:0),0);
}
function pathArt(mask,stone=false){
 const prefix=stone?'stone-path':'dirt';
 const full=stone?'stone-path-full':'dirt-path';
 // Straight original is E/W; corner 01 opens E/S; junction 02 opens N/E/S.
 const shapes={10:['horizontal',0],5:['horizontal',1],6:['turn-01',0],12:['turn-01',1],9:['turn-01',2],3:['turn-01',3],7:['junction-02',0],14:['junction-02',1],13:['junction-02',2],11:['junction-02',3],15:['junction-01',0]};
 const v=shapes[mask];return v?[prefix+'-'+v[0],v[1]]:[full,0];
}
function drawTerrainArt(name,x,y,turn=0){
 const im=uploadedArt(name);if(!im||im.naturalWidth!==32||im.naturalHeight!==32)return false;
 // Avoid per-cell save/restore for the common unrotated case.
 if(!turn){ctx.drawImage(im,x,y,S,S);return true}
 ctx.save();ctx.translate(x+S/2,y+S/2);ctx.rotate(turn*Math.PI/2);ctx.drawImage(im,-S/2,-S/2,S,S);ctx.restore();return true;
}
function drawConnectedTerrain(t,x,y,a,b){
 const seed=((a*73856093)^(b*19349663))>>>0;
 const outdoor=!!OUTDOOR_GRID[s.area];
 if(t===T.grass&&outdoor){
  const name=seed%29===0?'grass-pebbles':seed%13===0?'grass-02':seed%5===0?'grass-01':'grass-plain';
  return drawTerrainArt(name,x,y)||drawTerrainArt('grass-plain',x,y);
 }
 if(t===T.path||t===T.stone){
  // Keep broad roads filled; only narrow corridors use shaped edges.
  const mask=terrainMask(a,b,n=>n===T.path||n===T.stone);
  const [name,turn]=pathArt(mask,t===T.stone);
  const full=t===T.stone?'stone-path-full':'dirt-path';
  const wide=[[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dy],i)=>{
   const [ex,ey]=[[1,0],[0,1],[-1,0],[0,-1]][i];
   const matches=v=>v===T.path||v===T.stone;
   return matches(terrainNeighbor(a,b,dx,dy))&&matches(terrainNeighbor(a,b,ex,ey))&&matches(tiles[b+dy+ey]?.[a+dx+ex]);
  });
  return wide?drawTerrainArt(full,x,y):drawTerrainArt(name,x,y,turn)||drawTerrainArt(full,x,y);
 }
 if(t===T.water){
  const bank=terrainMask(a,b,n=>n!==undefined&&n!==T.water);
  // The bank sprite is grass above water. Use it only on a single natural land edge.
  const natural=terrainMask(a,b,n=>n===T.grass||n===T.flower||n===T.tall||n===T.tree);
  const turns={1:0,2:1,4:2,8:3};
  if(outdoor&&bank===natural&&Object.prototype.hasOwnProperty.call(turns,bank)&&drawTerrainArt('riverbank-01',x,y,turns[bank]))return true;
  return drawTerrainArt(['water-01','water-02','water-03'][seed%3],x,y)||drawTerrainArt('water-01',x,y);
 }
 if(t===T.rock&&s.area==='cave'){
  const mask=terrainMask(a,b,n=>n===T.rock);
  if(mask===15&&drawTerrainArt(seed%2?'cliff-high-01':'cliff-high-02',x,y))return true;
 }
 return false;
}
// Stable, area-aware natural artwork; never modifies tile or encounter data.
function naturalSeed(x,y){return ((Math.imul(x+1,73856093)^Math.imul(y+1,19349663))>>>0)}
// New outdoor scenery is selected deterministically, without changing map data.
const OUTDOOR_SCENERY=Object.freeze({
 trees:['outdoor-tree-1-026','outdoor-tree-2-052','outdoor-tree-3-018'],
 rocks:['outdoor-rock-1-058','outdoor-rock-2-084','outdoor-rock-3-073'],
 flowers:['outdoor-flowers-grass-1-045','outdoor-flowers-grass-2-076','outdoor-flowers-grass-3-063'],
 shrubs:['outdoor-shrub-1-036','outdoor-shrub-2-068','outdoor-shrub-3-037']
});
function naturalTreeName(area,seed){
 if(area==='route2')return seed%3===0?OUTDOOR_SCENERY.trees[1]:'outdoor-bamboo-3-059';
 if(area==='forest'||area==='route3'||area==='ridge')return OUTDOOR_SCENERY.trees[1+seed%2];
 return OUTDOOR_SCENERY.trees[seed%3];
}
function naturalTileName(t,a,b){
 const n=naturalSeed(a,b);
 if(t===T.tall)return ['tall-grass-01','tall-grass-02','tall-grass-03'][n%3];
 if(t===T.rice)return ['paddy-01','paddy-02','paddy-03'][n%3];
 if(t===T.flower)return OUTDOOR_SCENERY.flowers[n%3];
 if(t===T.rock)return OUTDOOR_GRID[s.area]?OUTDOOR_SCENERY.rocks[n%3]:['rock-small','rock-moss','rocks-cluster'][n%3];
 if(t===T.hedge)return OUTDOOR_GRID[s.area]&&s.area!=='homestead'?OUTDOOR_SCENERY.shrubs[n%3]:'hedge-horizontal';
 return null;
}
function naturalTileReady(t,a,b){const name=naturalTileName(t,a,b);return !!(name&&uploadedArt(name))}
function drawNaturalTile(t,x,y,a,b){
 const name=naturalTileName(t,a,b);if(!name||!uploadedArt(name))return false;
 // Ground is painted by the continuous terrain pass; avoid square grass stamps.
 if(t===T.rice||t===T.tall){
  ctx.save();ctx.translate(x+S/2,y+S);ctx.rotate(windAt(a,b,performance.now())*.018);
  const result=t===T.rice?drawUploadedArt(name,-S/2,-S,S,S):drawUploadedFit(name,-S/2,-S,S,S);ctx.restore();return result;
 }
 return drawUploadedFit(name,x,y,S,S);
}
function naturalDecoration(area,seed,t,nearTree){
 if(t===T.water&&area==='garden'&&seed%13===0)return seed%2?'lily-pads':'lily-flowers';
 if(t!==T.grass)return null;
 if(nearTree&&(area==='forest'||area==='route2')){
  if(seed%59===0)return 'outdoor-log-1-069';
  if(seed%47===0)return 'outdoor-stump-1-075';
  if(seed%19===0)return seed%2?'mushrooms-brown':'mushrooms-red';
 }
 if((area==='garden'||area==='village'||area==='town')&&seed%41===0)return OUTDOOR_SCENERY.shrubs[seed%3];
 if(seed%17===0)return OUTDOOR_SCENERY.flowers[seed%3];
 return null;
}
function drawNaturalDetails(ox,oy,w,h){
 if(!OUTDOOR_GRID[s.area]||s.area==='homestead')return;
 const x0=Math.max(1,Math.floor(ox/S)),x1=Math.min(W-1,Math.ceil((ox+w)/S));
 const y0=Math.max(1,Math.floor(oy/S)),y1=Math.min(H-1,Math.ceil((oy+h)/S));
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const t=tiles[y]?.[x];if(t!==T.grass&&t!==T.water||buildingSceneryReserved(s.area,x,y))continue;
  // Avoid actor positions, doors, roads and named sites; small ground details are walkable.
  if(npcs.some(p=>p.x===x&&p.y===y))continue;
  if(s.area==='village'&&villageObstacles.has(key(x,y)))continue;
  if(s.area==='route1'&&route1Blocked.has(key(x,y)))continue;
  const neighbors=[tiles[y-1]?.[x],tiles[y+1]?.[x],tiles[y]?.[x-1],tiles[y]?.[x+1]];
  if(neighbors.some(v=>v===T.door||v===T.path||v===T.stone))continue;
  const name=naturalDecoration(s.area,naturalSeed(x,y),t,neighbors.includes(T.tree));
  if(name&&!explorationSiteAt(s.area,x,y)&&!explorationObjectAt(s.area,x,y)&&!secretEntranceAt(s.area,x,y))drawUploadedFit(name,x*S-ox+4,y*S-oy+7,S-8,S-10);
 }
}
// Continuous ground colors with irregular world-space texture. No square
// terrain sprites are stamped into the grass, roads, ponds or cave floor.
// Paint the union of walkable road cells. Shared edges are never outlined.
function drawContinuousPath(t,x,y,a,b){
 const road=v=>v===T.path||v===T.stone;
 const n=road(terrainNeighbor(a,b,0,-1)),e=road(terrainNeighbor(a,b,1,0)),south=road(terrainNeighbor(a,b,0,1)),w=road(terrainNeighbor(a,b,-1,0));
 const stone=t===T.stone,fill=stone?'#aaa899':'#c6ae82';
 const seed=naturalSeed(a,b);
 ctx.save();
 ctx.beginPath();ctx.rect(x,y,S,S);ctx.clip();
 // Round only exposed outside corners. Keep all shared sides flush.
 const r=5;
 const tl=!n&&!w?r:0,tr=!n&&!e?r:0,br=!south&&!e?r:0,bl=!south&&!w?r:0;
 ctx.fillStyle='#75a65e';ctx.fillRect(x,y,S,S);
 ctx.beginPath();ctx.moveTo(x+tl,y);ctx.lineTo(x+S-tr,y);ctx.quadraticCurveTo(x+S,y,x+S,y+tr);
 ctx.lineTo(x+S,y+S-br);ctx.quadraticCurveTo(x+S,y+S,x+S-br,y+S);
 ctx.lineTo(x+bl,y+S);ctx.quadraticCurveTo(x,y+S,x,y+S-bl);
 ctx.lineTo(x,y+tl);ctx.quadraticCurveTo(x,y,x+tl,y);ctx.closePath();
 ctx.fillStyle=fill;ctx.fill();ctx.clip();
 // Feathered shoulders only along actual grass-facing road edges.
 const edges=[[!n,0,0,0,5],[!e,S,0,S-5,0],[!south,0,S,0,S-5],[!w,0,0,5,0]];
 for(const [on,x0,y0,x1,y1] of edges){
  if(!on)continue;
  const gradient=ctx.createLinearGradient(x+x0,y+y0,x+x1,y+y1);
  gradient.addColorStop(0,'rgba(117,166,94,.60)');gradient.addColorStop(1,'rgba(117,166,94,0)');
  ctx.fillStyle=gradient;
  if(x0===x1)ctx.fillRect(x,y+Math.min(y0,y1),S,5);
  else ctx.fillRect(x+Math.min(x0,x1),y,5,S);
 }
 ctx.fillStyle=stone?'rgba(76,77,66,.11)':'rgba(107,81,45,.10)';
 for(let k=0;k<5;k++){const h=naturalSeed(a*7+k,b*13+k);ctx.fillRect(x+(h%30),y+((h>>>9)%30),1+h%3,1)}
 ctx.restore();
}
function seamlessGround(t,x,y,a,b){
 const colors={[T.grass]:'#75a65e',[T.path]:'#c6ae82',[T.stone]:'#aaa899',[T.water]:'#629fa5',[T.rice]:'#829d68',[T.tall]:'#75a65e',[T.flower]:'#75a65e'};
 const color=colors[t];if(!color)return false;
 ctx.fillStyle=color;ctx.fillRect(x-.35,y-.35,S+.8,S+.8);
 const n=naturalSeed(a,b);
 if(OUTDOOR_GRID[s.area]&&(t===T.path||t===T.stone)){
  drawContinuousPath(t,x,y,a,b);return true;
 }
 if(OUTDOOR_GRID[s.area]&&t===T.grass){
  // Low-contrast, deterministic ground grain; no individual sprite borders.
  ctx.fillStyle='rgba(44,91,43,.075)';
  for(let k=0;k<5;k++){const h=naturalSeed(a*7+k,b*11+k);ctx.fillRect(x+h%32,y+(h>>>8)%32,2+h%3,1)}
  return true;
 }
 if(t===T.water){
  ctx.fillStyle='rgba(203,237,229,.13)';ctx.fillRect(x+((n>>>4)%23),y+((n>>>12)%26),5+n%8,1);
 }else{
  const dark=t===T.path||t===T.stone?'rgba(91,76,54,.12)':'rgba(33,91,44,.13)';
  ctx.fillStyle=dark;
  for(let k=0;k<4;k++){const h=naturalSeed(a*5+k,b*7+k);ctx.fillRect(x+(h%30),y+((h>>>8)%30),1+(h%3),1)}
 }
 if(t===T.tall||t===T.flower||t===T.rice){
  const art=naturalTileName(t,a,b);
  if(t===T.rice){drawRiceClump(x,y,a,b,performance.now());return true}
  // Sparse vegetation remains organic and does not cover the entire ground cell.
  if(art&&uploadedArt(art)){ctx.save();ctx.translate(x+16,y+28);if(t===T.tall)ctx.rotate(windAt(a,b,performance.now())*.02);drawUploadedFit(art,-13,-23,26,25);ctx.restore()}
  else if(t===T.flower){ctx.fillStyle='#e8cfb7';ctx.fillRect(x+9,y+13,3,3);ctx.fillStyle='#dca2ad';ctx.fillRect(x+21,y+21,3,3)}
  else{ctx.strokeStyle='#467b43';for(let k=0;k<4;k++){ctx.beginPath();ctx.moveTo(x+6+k*6,y+27);ctx.lineTo(x+9+k*6,y+14);ctx.stroke()}}
 }
 return true;
}
// Grass Gym artwork follows the authored tile grid; rendering never changes collision.
function gymTileArt(t,a,b){
 if(t===T.wall)return 'gym-plain-wall-01';
 if(t===T.hedge){
  const n=tiles[b-1]?.[a]===T.hedge, south=tiles[b+1]?.[a]===T.hedge;
  const e=tiles[b]?.[a+1]===T.hedge,w=tiles[b]?.[a-1]===T.hedge;
  return n&&south&&e&&w?'gym-hedge-cross-01':n||south||e||w?'gym-hedge-straight-01':'gym-hedge-column-01';
 }
 if(t===T.gate)return 'gym-vine-wall-06';
 if(t===T.mat)return 'gym-leaf-platform-01';
 if(t===T.door||t===T.path)return 'gym-floor-stone-01';
 if(t===T.grass||t===T.flower)return 'gym-floor-grass-01';
 return 'gym-floor-wood-01';
}
function drawGymTile(t,x,y,a,b){
 const solid=t===T.wall||t===T.hedge||t===T.gate;
 const base=solid?'gym-floor-moss-stone-01':gymTileArt(t,a,b);
 ctx.fillStyle=solid?'#627b52':t===T.path||t===T.door?'#a3a696':'#897b56';
 ctx.fillRect(x,y,S+.5,S+.5);
 drawUploadedArt(base,x,y,S+.5,S+.5);
 if(solid&&!drawUploadedArt(gymTileArt(t,a,b),x,y,S+.5,S+.5)){
  ctx.fillStyle=t===T.wall?'#6c7165':t===T.gate?'#644c31':'#397b3e';ctx.fillRect(x+1,y+1,S-2,S-2);
 }
 if(t===T.door){ctx.fillStyle='#dfd4a9';ctx.fillRect(x+5,y+S-4,S-10,3)}
}
function drawGymDecor(ox,oy){
 const fit=(n,x,y,w,h)=>drawUploadedFit(n,x*S-ox,y*S-oy,w*S,h*S);
 // Decoration remains inside the outer wall footprint or the existing switch tile.
 for(const x of [3, W-5])fit('gym-window-wall-01',x,0,2,1);
 for(const x of [9,W-11])fit('gym-wall-banner-01',x,0,2,1);
 for(const x of [1,W-2])fit('gym-lamp-wall-01',x,0,1,1);
 for(const y of [4,12,20])for(const x of [0,W-1])fit('gym-potted-plant-01',x,y,1,1);
 for(const x of [6,12,18,24])if(tiles[6]?.[x]===T.hedge)fit('gym-flower-bush-01',x,6,1,1);
 const p=npcs.find(p=>p.kind==='switch');
 if(p){
  const x=(p.homeX??p.x),y=(p.homeY??p.y);
  fit('gym-leaf-switch-01',x,y,1,1);
  ctx.fillStyle=s.puzzles.gate?'#a9e4a5':'#e4b56a';ctx.beginPath();ctx.arc((x+.5)*S-ox,(y+.8)*S-oy,3,0,Math.PI*2);ctx.fill();
 }
}
function drawTile(t,x,y,a,b){
 if(s.area==='gym')return drawGymTile(t,x,y,a,b);
 if(!isInterior(s.area)&&s.area!=='gym'&&seamlessGround(t,x,y,a,b))return;
 // All natural terrain shares a single continuous grass surface. Tile cells now
 // describe objects/foliage rather than independent rectangular patches of color.
 const natural=t===T.grass||t===T.tall||t===T.rice||t===T.flower||(t===T.tree&&treeArtReady());
 if(OUTDOOR_GRID[s.area]&&(t===T.tree||t===T.rock||t===T.hedge)){seamlessGround(T.grass,x,y,a,b);if(t!==T.tree)queueSolarShadow(x+S/2,y+S,S,t===T.rock?15:24);}
 if(!natural&&!(OUTDOOR_GRID[s.area]&&(t===T.tree||t===T.rock||t===T.hedge))){ctx.fillStyle=palette[t]||palette[0];ctx.fillRect(x,y,S+0.5,S+0.5)}
 const hash=(v)=>{const z=Math.sin(v*127.1+83.7)*43758.5453;return z-Math.floor(z)};
 const variation=hash(a*3.71+b*1.91);
 // Only selected terrain tiles are enabled. Existing collision and encounter IDs are unchanged.
 if(!isInterior(s.area)&&s.area!=='gym'){
  ctx.imageSmoothingEnabled=false;
  if(drawConnectedTerrain(t,x,y,a,b))return;
  if(t===T.grass&&drawTerrainArt('grass-plain',x,y))return;
  if(drawNaturalTile(t,x,y,a,b))return;
 }
 if(natural){
   // Tiny blades and irregular clumps repeat across world space with no grid outline.
   ctx.fillStyle='rgba(26,79,44,.14)';
   for(let k=0;k<3;k++){
     const u=hash((a+1)*17.23+(b+1)*2.1+k*7.1),v=hash((a+1)*5.17+(b+1)*19.9+k*3.1);
     const px=x+3+u*25,py=y+3+v*24;
     ctx.fillRect(px,py,2,3+variation*2);
   }
   if(t===T.flower){
     ctx.fillStyle='#e5ce9c';ctx.fillRect(x+10,y+15,3,3);
     ctx.fillStyle='#dfb3ad';ctx.fillRect(x+19,y+10,4,4);
   }else if(t===T.tall){
     ctx.fillStyle='#467b43';
     for(let k=0;k<5;k++){
       const px=x+4+(k*7+(a*3+b*5)%5)%27,py=y+11+(k*9+b*3)%15;
       ctx.fillRect(px,py-8,2,11);ctx.fillRect(px+2,py-11,2,9);
     }
     ctx.fillStyle='#83b260';ctx.fillRect(x+6,y+17,9,2);
   }else if(t===T.rice){
     // Flooded rice-paddy floor; plants sway in the animated world pass.
     ctx.fillStyle='#648e69';ctx.fillRect(x,y,S+.5,S+.5);
     ctx.fillStyle='rgba(48,110,111,.58)';ctx.fillRect(x+2,y+18,28,13);
     ctx.fillStyle='rgba(181,218,183,.31)';ctx.fillRect(x+4,y+23,22,1);
     ctx.fillStyle='rgba(35,70,44,.30)';
     for(let k=0;k<4;k++){ctx.beginPath();ctx.ellipse(x+5+k*7,y+27,3,1.5,0,0,Math.PI*2);ctx.fill();}
   }
 }
 if(t===T.path){
   // Fine shared grit softens uniform sand without drawing tile seams.
   ctx.fillStyle='#ae9671';
   for(let k=0;k<4;k++){
     const dx=hash(a*17+b*3+k*19)*27,dy=hash(a*5+b*13+k*11)*27;
     ctx.fillRect(x+dx,y+dy,2,2)
   }
 }
 if(t===T.tree&&!uploadedArt(naturalTreeName(s.area,naturalSeed(a,b)))&&!treeArtReady()){
   if(s.area==='village'){
     // Natural rounded foliage rather than square tree stamps; never place
     // ornamental canopy outside of its solid tree footprint onto paths.
     ctx.fillStyle='#294b32';ctx.beginPath();ctx.ellipse(x+16,y+18,15,13,0,0,Math.PI*2);ctx.fill();
     ctx.fillStyle='#675642';ctx.fillRect(x+14,y+17,5,14);
     const variety=(a*37+b*19)%3;
     ctx.fillStyle=['#356847','#3b7248','#477c4b'][variety];
     ctx.beginPath();ctx.arc(x+13,y+12,11,0,Math.PI*2);ctx.fill();
     ctx.beginPath();ctx.arc(x+22,y+12,9,0,Math.PI*2);ctx.fill();
     ctx.fillStyle='#62975c';ctx.beginPath();ctx.ellipse(x+14,y+8,9,5,-.3,0,Math.PI*2);ctx.fill();
     ctx.fillStyle='#86a86b';ctx.fillRect(x+9,y+5,6,2);
   }else{
     ctx.fillStyle='#23492d';ctx.fillRect(x+12,y+15,9,18);
     ctx.fillStyle='#234e36';ctx.beginPath();ctx.arc(x+16,y+15,16,0,Math.PI*2);ctx.fill();
     ctx.fillStyle='#4c8851';ctx.beginPath();ctx.arc(x+12,y+11,11,0,Math.PI*2);ctx.fill();
     ctx.fillStyle='#6b9a57';ctx.fillRect(x+6,y+6,10,5);
   }
 }
 if(t===T.rock){ctx.fillStyle='#66615a';ctx.beginPath();ctx.ellipse(x+17,y+21,13,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#aa9e89';ctx.fillRect(x+9,y+12,14,5)}
 if(t===T.roof){
   ctx.fillStyle='#ad8064';for(let k=0;k<4;k++)ctx.fillRect(x,y+k*8,S,2);
   ctx.fillStyle='rgba(42,34,25,.15)';ctx.fillRect(x,y+28,S,4);
 }
 if(t===T.wall){ctx.fillStyle='#5d473b';ctx.fillRect(x+3,y,3,30);ctx.fillRect(x+25,y,3,30)}
 if(t===T.door){ctx.fillStyle='#342b27';ctx.fillRect(x+5,y+2,23,30);ctx.fillStyle='#e9c47e';ctx.fillRect(x+23,y+17,3,3)}
 if(t===T.desk){ctx.fillStyle='#52392b';ctx.fillRect(x+3,y+4,26,24)}
 if(t===T.hedge){ctx.fillStyle='#225832';ctx.fillRect(x+1,y+1,30,30);ctx.fillStyle='#76ad55';ctx.fillRect(x+4,y+5,24,9)}
 if(t===T.gate){ctx.fillStyle='#674a31';ctx.fillRect(x+6,y,5,32);ctx.fillRect(x+22,y,5,32)}
 if(t===T.water){ctx.fillStyle='#bee7e5';ctx.fillRect(x+4,y+7,12,3);ctx.fillRect(x+15,y+20,12,3)}
 if(t===T.stone){ctx.fillStyle='#cac0ab';ctx.fillRect(x+3,y+11,16,2)}
}
// Art direction prototype for the starting village. These features are deliberately
// decorative; existing exits, NPCs and interaction hitboxes stay unchanged.
// A single cohesive village art pass. Buildings, fences, lanterns and stone colliders
// all read the same placement data so players cannot walk through visible obstacles.
// Exterior artwork is tied to existing footprints, not new doors or services.
// Town service buildings are visual landmarks; their NPC interactions are unchanged.
const TOWN_EXTERIORS={
 town:[
  {x:4,y:5,w:8,h:5,art:'house-terracotta'},
  {x:21,y:5,w:9,h:5,label:'CRITTER CENTER'},
  {x:4,y:17,w:8,h:4,art:'shop-red'},
  {x:21,y:17,w:9,h:4,art:'house-slate'}
 ],
 garden:[
  {x:2,y:3,w:9,h:4,label:'CRITTER CENTER'},
  {x:20,y:3,w:10,h:5,label:'GRASS GYM'},
  {x:3,y:18,w:8,h:4,art:'house-sage-porch'},
  {x:20,y:18,w:10,h:4,art:'shop-green'}
 ]
};
const VILLAGE_EXTERIOR_ART={home:'house-terracotta',lab:'lab-blue',neighbor:'house-slate'};
function exteriorRect(h){
 const door=h.door??h.x+Math.floor(h.w/2);
 const center=door+.5;
 // Keep the sprite's central doorway aligned with the existing door cell.
 const width=2*Math.min(center-h.x,h.x+h.w-center);
 return {x:center-width/2,y:h.y,w:width,h:h.h+2,door};
}
function exteriorFootprintIntact(h){
 for(let y=h.y;y<h.y+h.h+2;y++)for(let x=h.x;x<h.x+h.w;x++){
  const t=tiles[y]?.[x];
  if(t!==T.roof&&t!==T.wall&&t!==T.door)return false;
 }
 return true;
}
function drawBuildingExterior(name,h,ox,oy,clear=false){
 const im=uploadedArt(name);if(!im)return false;
 const b=exteriorRect(h);
 if(clear){
  // Replace the old roof/wall raster only after the new image is ready.
  for(let y=h.y;y<h.y+h.h+2;y++)for(let x=h.x;x<h.x+h.w;x++){
   ctx.fillStyle=palette[T.grass]||'#5f8e5f';ctx.fillRect(x*S-ox,y*S-oy,S,S);
   seamlessGround(T.grass,x*S-ox,y*S-oy,x,y);
  }
 }
 const x=b.x*S-ox,y=b.y*S-oy,w=b.w*S,height=b.h*S;
 const art=cleanSceneryArt(im,name);
 queueSolarShadow(x+w/2,y+height,w,height,'building');
 sceneryLayer(s.area+':building:'+h.x+','+h.y,x,y,w,height,y+height,()=>{ctx.save();ctx.imageSmoothingEnabled=false;ctx.beginPath();ctx.rect(h.x*S-ox,h.y*S-oy,h.w*S,(h.h+2)*S);ctx.clip();ctx.drawImage(art,x,y,w,height);ctx.restore()});return true;
}
function drawExteriorSign(h,ox,oy){
 const x=(h.x+h.w/2)*S-ox,y=(h.y+h.h+.1)*S-oy;
 ctx.save();ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
 const width=Math.min(h.w*S-12,ctx.measureText(h.label).width+20);
 ctx.fillStyle='#342e27';ctx.fillRect(x-width/2,y-10,width,20);
 ctx.fillStyle='#d1b58a';ctx.fillRect(x-width/2+2,y-8,width-4,16);
 ctx.fillStyle='#302c26';ctx.fillText(h.label,x,y,width-8);ctx.restore();
}
function drawServiceExterior(b,ox,oy){
 const x=b.x*S-ox,y=b.y*S-oy,w=b.w*S,h=(b.h+2)*S,gym=b.label==='GRASS GYM';
 ctx.fillStyle=palette[T.grass];ctx.fillRect(x,y,w,h);
 queueSolarShadow(x+w/2,y+h,w,h,'building');
 sceneryLayer(s.area+':service:'+b.x+','+b.y,x,y,w,h,y+h,()=>{
  const rect=(a,c,d,e,color)=>{ctx.fillStyle=color;ctx.fillRect(x+a*w,y+c*h,d*w,e*h)};
  rect(.035,.23,.93,.77,gym?'#b9c49a':'#e9e1cf');
  rect(.035,.23,.93,.08,gym?'#456c40':'#b96457');
  rect(.035,.91,.93,.09,'#7a8173');
  ctx.fillStyle=gym?'#355c3e':'#a64f48';ctx.beginPath();ctx.moveTo(x,y+h*.28);ctx.lineTo(x+w*.13,y+h*.04);ctx.lineTo(x+w*.87,y+h*.04);ctx.lineTo(x+w,y+h*.28);ctx.closePath();ctx.fill();
  for(let i=0;i<11;i++)rect(.12+i*.07,.10,.013,.14,gym?'#69885c':'#c77a6a');
  for(const a of [.13,.72]){rect(a,.43,.15,.27,'#514c43');rect(a+.012,.45,.126,.22,gym?'#9cbf8e':'#8ec0cc');rect(a+.07,.45,.012,.22,'#e4e2cc')}
  const door=gym?24:(b.x+Math.floor(b.w/2)),d=(door-b.x+.5)/b.w;
  rect(d-.065,.68,.13,.32,'#4b5149');rect(d-.049,.70,.098,.30,gym?'#789468':'#8ab8ba');
  rect(.42,.35,.16,.14,gym?'#638d4e':'#b54b45');
  if(gym){ctx.fillStyle='#e4e9bd';ctx.beginPath();ctx.ellipse(x+w*.5,y+h*.42,w*.04,h*.035,-.6,0,Math.PI*2);ctx.fill()}
  else{rect(.486,.365,.028,.11,'#fff2dd');rect(.455,.398,.09,.035,'#fff2dd')}
 });
}
function drawTownExteriors(ox,oy,w,h){
 for(const b of TOWN_EXTERIORS[s.area]||[]){
  if(b.x*S-ox>w+S||(b.x+b.w)*S-ox<-S||b.y*S-oy>h+S*4||(b.y+b.h+2)*S-oy<0)continue;
  const room=Object.values(TOWN_ROOMS).find(d=>d.parent===s.area&&d.door[0]>=b.x&&d.door[0]<b.x+b.w&&d.door[1]===b.y+b.h+1);
  const gym=b.label==='GRASS GYM',base=gym?'grass-gym':room?roomDoorBase(room):null;
  const dx=gym?24:room?.door[0],dy=gym?10:room?.door[1];
  // Never draw a legacy building under a ready full-size replacement.
  if(base&&drawAnimatedBuilding(base,b,dx,dy,ox,oy))continue;
  if(b.art)drawBuildingExterior(b.art,b,ox,oy,true);
  else if(b.label)drawServiceExterior(b,ox,oy);
 }
}
function drawHomesteadBuildingExteriors(ox,oy){
 // Leave purchased siding/porch combinations and unfinished construction intact.
 if(homesteadConstructionStage()>=4&&s.homestead?.owned&&!activeCosmetic('house')&&!activeCosmetic('porch')){
  const home={x:6,y:5,w:6,h:3,door:9};
  if(exteriorFootprintIntact(home))drawBuildingExterior(activeCosmetic('roof')?.id==='style-18'?'house-slate':'house-terracotta',home,ox,oy,true);
 }
 if(farmStage()>=2){
  const barn={x:24,y:5,w:8,h:5,door:28};
  if(exteriorFootprintIntact(barn))drawBuildingExterior(activeCosmetic('barn')?.id==='style-31'?'barn-blue':'barn-red',barn,ox,oy,true);
 }
}
function drawVillageDetails(ox,oy,viewW,viewH){
 if(s.area!=='village')return;
 const pos=(x,y)=>[x*S-ox,y*S-oy];
 const segment=(x1,y1,x2,y2,width,color)=>{
  const a=pos(x1,y1),b=pos(x2,y2);
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
 };
 // Paddies: parallel ridges, flooded irrigation, staggered rice rows.
 for(let y=17;y<23;y++){
  segment(1.9,y+.07,10.9,y+.07,4,'#5a7956');
  segment(2.0,y+.18,10.85,y+.18,2,'#88b5a0');
  for(let x=2;x<11;x++){
   const [px,py]=pos(x+.15,y+.16);
   ctx.fillStyle='#d7c879';ctx.fillRect(px+((x+y)%3)*6,py+2,2,8);
   ctx.fillStyle='#638c52';ctx.fillRect(px+5,py+7,2,10);
  }
 }
 segment(1.6,16.95,1.6,23.15,4,'#79a9a5');
 segment(11.05,17.0,11.05,23.0,4,'#7aada9');
 // The buildings are dedicated, single-layer sprites, not canvas tile drawings.
 for(const h of VILLAGE_HOUSES){
  const [px,py]=pos(h.x,h.y),w=h.w*S,height=(h.h+2)*S;
  if(!drawAnimatedBuilding(villageDoorBase(h),h,h.door,h.y+h.h+1,ox,oy)){
   drawBuildingExterior(VILLAGE_EXTERIOR_ART[h.kind],h,ox,oy,true);
  }
  // A restrained entrance cue, seen only while standing in front of the door.
  if(Math.abs(s.x-h.door)<=1&&s.y===h.y+h.h+2){
   const [cx,cy]=pos(h.door+.52,h.y+h.h+1.2);
   ctx.fillStyle='#fae9adcc';ctx.beginPath();ctx.arc(cx,cy,5,0,Math.PI*2);ctx.fill();
  }
 }
 // Fences are drawn in the *same cells* blocked by the collision map.
 for(const [x1,y1,x2,y2] of VILLAGE_FENCES){
  if(uploadedArt('outdoor-fence-1-082')){
   for(let x=x1;x<x2;x++){if(buildingSceneryReserved(s.area,x,y1))continue;queueSolarShadow((x+.5)*S-ox,(y1+1)*S-oy,S,22);drawUploadedArt('outdoor-fence-1-082',x*S-ox,y1*S-oy,S,S);}
   continue;
  }
  for(let x=x1;x<x2;x++){
   if(buildingSceneryReserved(s.area,x,y1))continue;
   const yy=y1+.52;segment(x+.05,yy,x+.95,yy,4,'#4c3d32');
   segment(x+.05,yy-.19,x+.95,yy-.19,3,'#b18b61');
   const [px,py]=pos(x+.48,y1+.16);
   ctx.fillStyle='#4e382c';ctx.fillRect(px-3,py,6,26);
  }
 }
 for(const [x,y] of VILLAGE_STONES){
  if(tiles[y]?.[x]===T.path||buildingSceneryReserved(s.area,x,y))continue;
  queueSolarShadow((x+.5)*S-ox,(y+1)*S-oy,26,14);
  if(drawUploadedFit(OUTDOOR_SCENERY.rocks[naturalSeed(x,y)%3],x*S-ox,y*S-oy,S,S))continue;
  const [px,py]=pos(x+.5,y+.55);
  ctx.fillStyle='#77756c';ctx.beginPath();ctx.ellipse(px,py,11,8,-.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#b9b29b';ctx.fillRect(px-6,py-6,8,3);
 }
 // Warm lantern lighting without mobile-unfriendly filters.
 for(const [x,y] of VILLAGE_LANTERNS){
  if(buildingSceneryReserved(s.area,x,y))continue;
  queueSolarShadow((x+.5)*S-ox,(y+1)*S-oy,18,35);
  const [px,py]=pos(x+.5,y+.55);
  ctx.fillStyle='#ffce7750';ctx.beginPath();ctx.arc(px,py-12,22,0,Math.PI*2);ctx.fill();
  const lanternFrames=['stone-lantern-idle','stone-lantern-flicker-1','stone-lantern-idle-2','stone-lantern-flicker-2'];
  warmFrames(lanternFrames);if(drawUploadedFit(loopArt(lanternFrames,310,x*71+y*37),x*S-ox,y*S-oy-12,S,S+12))continue;
  if(drawUploadedFit('lantern-stone',x*S-ox,y*S-oy-12,S,S+12))continue;
  ctx.fillStyle='#56554b';ctx.fillRect(px-3,py-12,6,21);
  ctx.fillStyle='#c6b298';ctx.fillRect(px-9,py-17,18,5);
  ctx.fillStyle='#f7d89b';ctx.fillRect(px-6,py-30,12,14);
  ctx.fillStyle='#524b43';ctx.fillRect(px-10,py-33,20,5);
  ctx.fillStyle='#453e37';ctx.fillRect(px-7,py-16,14,4);
 }
 // Warm afternoon color-grading, mild enough to preserve readable gameplay.
 ctx.fillStyle='#f1c88509';ctx.fillRect(0,0,viewW,viewH);
}

// Seamless indoor art pass: architectural walls, shoji windows, tatami, wood
// flooring, and furniture. Uses the exact same object footprints as collision.

// Route 1's continuous Japanese countryside art: all decoration is based
// on the route tile map and ROuTE1_SITES solid/interactable locations.
function drawRoute1Details(ox,oy,viewW,viewH){
 if(s.area!=='route1')return;
 const px=x=>x*S-ox,py=y=>y*S-oy;
 const block=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(px(x),py(y),w*S,h*S)};
 const stroke=(x,y,x2,y2,width,color)=>{
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(px(x),py(y));ctx.lineTo(px(x2),py(y2));ctx.stroke();
 };
 // Rice fields: horizontal irrigation ridges, water glints, stalk clusters.
 // Lines only run through rice cells, never across paths or road.
 for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
  const type=tiles[y][x],bx=px(x),by=py(y);
  if(type===T.rice){
   if(naturalTileReady(type,x,y))continue;
   ctx.fillStyle='#7e9e56a8';ctx.fillRect(bx,by+S-4,S,4);
   ctx.fillStyle='#c1c782a8';ctx.fillRect(bx+2,by+8,Math.max(5,S-5),2);
   for(let i=0;i<4;i++){
    const sx=bx+5+i*7+(x*3+y)%3,sy=by+10+(i%2)*3;
    ctx.strokeStyle='#5e854d';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(sx,sy+12);ctx.lineTo(sx-3,sy);ctx.stroke();
    ctx.strokeStyle='#c8ba72';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(sx-4,sy+1);ctx.lineTo(sx,sy+5);ctx.stroke();
   }
  }else if(type===T.tall){
   if(naturalTileReady(type,x,y))continue;
   ctx.fillStyle='#416d4290';
   for(let i=0;i<3;i++){
    const sx=bx+4+i*10+(y%3),sy=by+22-(i%2)*4;
    ctx.fillRect(sx,sy-9,2,10);ctx.fillRect(sx+2,sy-12,2,10);
   }
  }else if(type===T.water){
   if(uploadedArt('water-01'))continue;
   ctx.fillStyle='#6aafa8';ctx.fillRect(bx,by,S+1,S+1);
   ctx.fillStyle='#b9d7bd99';ctx.fillRect(bx+((x*7)%12),by+10,12,2);
   ctx.fillStyle='#436e6b';ctx.fillRect(bx,by+S-4,S,3);
  }
 }
 // Long bands follow the channels, leaving every crossing footprint clear.
 for(const [x1,x2,y] of [[3,10,9],[15,30,9],[3,13,19],[26,30,19]]){
  stroke(x1,y+.06,x2+1,y+.06,4,'#465c44');
  stroke(x1,y+.87,x2+1,y+.87,4,'#557b59');
 }
 // Raised wooden footbridges are decorative and align to safe path tiles.
 for(const [x,y,w] of [[11,9,3],[22,19,3]]){
  if(drawBridgeDeck(x,y,w,ox,oy))continue;
  block(x,y,w,1,'#7d6548');
  for(let k=0;k<w*3;k++)block(x+k/3,y+.09,.025,.82,'#453c33aa');
  stroke(x,y+.14,x+w,y+.14,3,'#c8a375');
  stroke(x,y+.85,x+w,y+.85,3,'#433931');
 }
 // Post-and-rail farm fencing stays beside trails, not over passages.
 function fence(x1,y1,x2,y2){
  stroke(x1,y1,x2,y2,4,'#5a4631');
  stroke(x1,y1-.22,x2,y2-.22,3,'#c0a172');
  const count=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)*2));
  for(let i=0;i<=count;i++){
   const t=i/count,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;
   ctx.fillStyle='#77583b';ctx.fillRect(px(x)-2,py(y)-11,4,21);
   ctx.fillStyle='#d1b081';ctx.fillRect(px(x)-2,py(y)-11,4,3);
  }
 }
 for(const args of [[3,11.7,7,11.7],[24.8,10.8,29.6,10.8],[3.4,16.0,10.3,16.0],[25.6,22.4,30.7,22.4]])fence(...args);
 // Orchard flowers, wild reed clusters, and flat stone details.
 for(const [x,y] of [[8,7],[16,5],[25,7],[6,17],[12,22],[27,18],[31,16]]){
  if(tiles[Math.floor(y)]?.[Math.floor(x)]===T.path)continue;
  const bx=px(x),by=py(y);
  ctx.fillStyle='#466f4a';ctx.beginPath();ctx.ellipse(bx,by+7,12,6,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<3;i++){
   ctx.fillStyle=['#dfb6af','#e8d39d','#f1c7a7'][i];
   ctx.fillRect(bx-7+i*6,by-3+(i%2)*2,4,4);
  }
 }
 // Site art uses same coordinates as collision. No visual-only blockers.
 for(const o of ROUTE1_SITES){
  const bx=px(o.x),by=py(o.y);
  const already=!!s.discoveries?.[o.id];
  queueSolarShadow(bx+16,by+S,24,28);
  const art=o.kind==='chest'?interactivePropArt(o.id,'supply-crate',already):routeSiteArt(o.kind);
  if(art&&drawUploadedFit(art,bx,by,S,S)){
   // Reward marker below remains governed by existing discovery state.
  }else if(o.kind==='sign'||o.kind==='notice'){
   ctx.fillStyle='#604a35';ctx.fillRect(bx+13,by+7,6,25);
   ctx.fillStyle='#d1ab71';ctx.fillRect(bx+3,by+5,26,14);
   ctx.fillStyle='#533e30';ctx.fillRect(bx+3,by+5,26,3);
   ctx.fillStyle='#675442';ctx.fillRect(bx+6,by+12,18,2);
   ctx.fillRect(bx+8,by+16,13,2);
  }else if(o.kind==='shrine'){
   ctx.fillStyle='#77756e';ctx.fillRect(bx+8,by+18,18,14);
   ctx.fillStyle='#b6b2a3';ctx.fillRect(bx+4,by+11,26,9);
   ctx.fillStyle='#55574f';ctx.fillRect(bx+3,by+8,28,5);
   ctx.fillStyle='#d7c6a8';ctx.fillRect(bx+12,by+17,9,7);
   ctx.fillStyle='#e4d3bb';ctx.fillRect(bx+15,by+20,3,2);
  }else if(o.kind==='satchel'){
   ctx.fillStyle='#6c593d';ctx.fillRect(bx+13,by+6,5,26);
   ctx.fillStyle=already?'#8b806b':'#aa7652';ctx.fillRect(bx+8,by+16,17,14);
   ctx.fillStyle='#5d4739';ctx.fillRect(bx+11,by+14,12,4);
   ctx.fillStyle='#ddbf87';ctx.fillRect(bx+15,by+22,4,3);
  }else if(o.kind==='chest'){
   ctx.fillStyle=already?'#766955':'#987450';ctx.fillRect(bx+4,by+13,25,17);
   ctx.fillStyle='#554333';ctx.fillRect(bx+5,by+13,23,4);
   ctx.fillStyle='#e0bd75';ctx.fillRect(bx+15,by+18,4,8);
  }
  if(!already&&o.reward){
   ctx.fillStyle='#fff2b0';ctx.beginPath();ctx.arc(bx+25,by+7,3,0,Math.PI*2);ctx.fill();
  }
 }
 // A gentle warm haze across the fields keeps the countryside cohesive.
 ctx.fillStyle='#efce8910';ctx.fillRect(0,0,viewW,viewH);
}

function drawInteriorDecor(ox,oy){
 const box=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x*S-ox,y*S-oy,w*S,h*S)};
 const rug=activeCosmetic('rug');if(rug&&!estateFit(estateArt(rug.id),12,16,9,4,ox,oy)){box(12,16,9,4,rug.color);box(12.15,16.15,8.7,.12,'#ead9b4');box(12.15,19.7,8.7,.12,'#ead9b4');for(let x=13;x<21;x+=1.5)box(x,17.8,.5,.5,'#ead9b4')}
 if(activeCosmetic('plants'))for(const x of [2,31])if(!estateFit('plant-terracotta',x-.15,3.15,1,1.25,ox,oy)){box(x,3.8,.7,.6,'#a67652');box(x-.15,3.15,1,.8,cosmeticColor('plants','#629461'))}
 if(activeCosmetic('fireplace')){box(1,1,2.5,2,'#8c8980');box(1.45,1.7,1.6,1,'#372f2b');box(1.8,2,.9,.55,'#e9a34f')}
 if(activeCosmetic('kitchen')){
  // Existing cosmetic footprint is intentionally unchanged; no new blocking tiles.
  const kitchen=['prep-counter-front','sink-front','stove-front'];
  if(kitchen.every(n=>uploadedArt(n))){for(let i=0;i<kitchen.length;i++)estateFit(kitchen[i],30,5+i,2,1,ox,oy)}
  else {box(30,5,2,3,'#b88d61');box(30.2,5.3,1.6,.7,'#c6cbc5');box(30.4,6.4,1,.6,'#738a88')}
 }
 if(activeCosmetic('trophy')){box(14,2.5,5,.5,'#70523b');for(let i=0;i<Math.min(8,s.badges||0);i++){box(14.3+i*.55,1.9,.3,.45,'#ddbb66');box(14.2+i*.55,2.35,.5,.12,'#c7a45a')}}
}
// Interior textures and props use existing solid furniture footprints.
// Keep purchased cosmetic colors authoritative rather than replacing them.
const CENTER_INTERIOR_ART=Object.freeze({"reception":"critter-center-reception-counter-002","diagnostics":"critter-center-diagnostic-terminal-015","monitor":"critter-center-treatment-counter-027","shelf":"critter-center-supply-shelf-005","storage":"critter-center-supply-shelf-013","waiting":"critter-center-bench-047"});
const RESIDENTIAL_INTERIOR_ART=Object.freeze({"home-bed":"bed-south","home-desk":"desk-front","home-bookcase":"bookshelf-front","home-tea":"round-tea-table-a","home-storage":"storage-chest","home-keepsake":"dresser-front","home-supplies":"small-chest","neighbor-bed":"futon-south","neighbor-tea":"low-table-seats-b","neighbor-cupboard":"hutch-front","neighbor-bamboo":"bonsai-blue-pot","neighbor-scroll":"wall-landscape","estate-bed":"bed-east","estate-storage":"storage-chest","estate-table":"dining-table-horizontal-a","estate-books":"bookshelf-front","estate-terminal":"desk-front-alt","estate-incubators":"prep-counter-front"});
const TOWN_HOME_ART=Object.freeze({"bed":"futon-east","table":"round-tea-table-b","shelf":"bookshelf-front","cabinet":"wardrobe-front"});
function residentialRoom(area){return ['home','neighbor','homesteadHome'].includes(area)||TOWN_ROOMS[area]?.kind==='home'}
function residentialArtName(area,o){
 if(!residentialRoom(area))return null;
 
 return RESIDENTIAL_INTERIOR_ART[o.id]|| (TOWN_ROOMS[area]?.kind==='home'?TOWN_HOME_ART[o.id.slice(area.length+1)]:null)||null;
}
const LAB_INTERIOR_ART=Object.freeze({
 'lab-left':'lab-chemistry-bench-001','lab-right':'lab-research-bench-137',
 'lab-terminal':'lab-calibration-machine-085','lab-books':'lab-specimen-cabinet-036',
 'lab-tools':'lab-computer-workstation-146','lab-board':'lab-noticeboard-116',
 'lab-starters':'starter-display-station-idle'
});
function clinicalInterior(area){return area==='lab'||TOWN_ROOMS[area]?.kind==='center'}
const SHOP_INTERIOR_ART=Object.freeze({
 checkout:'critter-shop-checkout-counter-001',stock1:'critter-shop-potion-shelf-010',
 stock2:'critter-shop-accessory-rack-021',display:'critter-shop-merchandise-display-003',
 stockroom:'critter-shop-crate-033'
});
function shopInterior(area){return TOWN_ROOMS[area]?.kind==='shop'}
function interiorArtPlan(area,o){
 const prop=interactivePropBase(o);if(prop)return [interactivePropArt(o.id,prop,!!s.discoveries?.[o.id])];
 if(shopInterior(area)){
  const art=SHOP_INTERIOR_ART[o.id.slice(area.length+1)];
  return art?[art]:[];
 }
 if(clinicalInterior(area)){
  const art=area==='lab'?LAB_INTERIOR_ART[o.id]:CENTER_INTERIOR_ART[o.id.slice(area.length+1)];
  return art?[art]:[];
 }
 const residential=residentialArtName(area,o);
 return residential?[residential]:[];
}
function interiorTexture(name,x,y,w,h,ox,oy,vw,vh){
 const im=uploadedArt(name);if(!im)return false;
 // Tile in world coordinates, clipped to the actual architectural surface.
 const left=x*S-ox,top=y*S-oy,right=left+w*S,bottom=top+h*S;
 const step=S;ctx.save();ctx.imageSmoothingEnabled=false;ctx.beginPath();
 ctx.rect(left,top,w*S,h*S);ctx.clip();
 for(let yy=top+Math.max(0,Math.floor(-top/step))*step;yy<Math.min(bottom,vh);yy+=step)
  for(let xx=left+Math.max(0,Math.floor(-left/step))*step;xx<Math.min(right,vw);xx+=step)
   ctx.drawImage(im,xx,yy,step,step);
 ctx.restore();return true;
}
function drawInteriorAsset(area,o,px,py,ww,hh){
 const animated=area==='lab'?labAnimation(o):null;
 const name=animated||interiorArtPlan(area,o)[0],im=name&&uploadedArt(name);
 if(!im)return false;
 const v=interiorVisualBounds(o),ox=o.x*S-px,oy=o.y*S-py;
 const art=cleanSceneryArt(im,name),scale=Math.min(v.w*S/artWidth(art),v.h*S/artHeight(art));
 const w=artWidth(art)*scale,h=artHeight(art)*scale;
 const x=(v.x+v.w/2)*S-ox-w/2,base=(v.y+v.h)*S-oy,y=base-h;
 const draw=()=>{ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(art,x,y,w,h);
 const slot=area==='homesteadHome'?(o.kind==='bed'?'bed':o.kind==='table'?'table':null):null;
 if(slot&&activeCosmetic(slot)){
  ctx.globalAlpha=.14;ctx.globalCompositeOperation='multiply';ctx.fillStyle=cosmeticColor(slot,'#ffffff');ctx.fillRect(x,y,w,h);
 }
 ctx.restore();};
 if(o.kind==='board')draw();else queueWorldActor(base,draw);
 return true;
}
function interiorWallPanels(name,ox,oy){
 const im=uploadedArt(name);if(!im)return;
 const h=3.3*S,w=h*im.naturalWidth/im.naturalHeight;
 ctx.save();ctx.beginPath();ctx.rect(S-ox,-oy,(W-2)*S,h);ctx.clip();
 for(let x=S-ox;x<(W-1)*S-ox;x+=w-.4)ctx.drawImage(im,x,-oy,w,h);
 ctx.restore();
}
function connectedInteriorWalls(ox,oy,color,trim,exitX){
 const box=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x*S-ox,y*S-oy,w*S,h*S)};
 // Four joined wall sections with a one-cell doorway matching the exit tile.
 box(0,0,W,3.5,color);box(0,0,1,H,color);box(W-1,0,1,H,color);
 box(0,H-1,exitX,1,color);box(exitX+1,H-1,W-exitX-1,1,color);
 box(0,3.3,W,.2,trim);box(.8,3.5,.2,H-4.5,trim);box(W-1,3.5,.2,H-4.5,trim);
 box(0,H-1,exitX,.15,trim);box(exitX+1,H-1,W-exitX-1,.15,trim);
}
// Dedicated clinical renderer: no legacy image fallback in either room.
function drawClinicalInterior(ox,oy,viewW,viewH){
 const lab=s.area==='lab', X=x=>x*S-ox,Y=y=>y*S-oy;
 const box=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(X(x),Y(y),w*S,h*S)};
 const fit=(n,x,y,w,h)=>drawUploadedFit(n,X(x),Y(y),w*S,h*S);
 ctx.save();
 ctx.beginPath();ctx.rect(X(0),Y(0),W*S,H*S);ctx.clip();
 box(0,0,W,H,lab?'#b9c9cc':'#d7e3df');
 if(lab||!interiorTexture('critter-center-floor-tile-075',0,0,W,H,ox,oy,viewW,viewH)){
  for(let y=Math.max(0,Math.floor(oy/S));y<Math.min(H,Math.ceil((oy+viewH)/S));y++)for(let x=Math.max(0,Math.floor(ox/S));x<Math.min(W,Math.ceil((ox+viewW)/S));x++){
   if((x+y)%2===0)box(x,y,1,1,lab?'#c3d1d3':'#dfe9e5');
   box(x,y,1,.025,'#829a9d');box(x,y,.025,1,'#829a9d');
  }
 }
 const exitX=lab?17:roomExit(s.area)[0];
 connectedInteriorWalls(ox,oy,lab?'#586b76':'#a2bbb9','#526d75',exitX);
 if(lab){
  for(let x=3;x<W-3;x+=7)fit('lab-laboratory-light-087',x,1.1,2,1.1);
  fit('lab-wall-monitor-112',4,1.1,4,2);
  fit('lab-wall-monitor-112',W-8,1.1,4,2);
  fit('lab-security-door-135',exitX-.4,H-1.15,1.8,1.15);
 }else{
  interiorWallPanels('critter-center-wall-panel-059',ox,oy);
  for(const x of [Math.min(4,W/4),W-11])fit('critter-center-window-wall-061',x,.6,4,2.2);
  for(const x of [1,W-2])fit('critter-center-wall-column-060',x,0,1,3.5);
  fit('critter-center-wall-banner-073',W/2-1,.2,2,2.5);
  fit('critter-center-entrance-wall-064',exitX-.4,H-1.15,1.8,1.15);
 }
 for(const o of interiorObjects)drawInteriorAsset(s.area,o,X(o.x),Y(o.y),o.w*S,o.h*S);
 ctx.restore();
}
// Shop-specific artwork, with neutral drawn placeholders while images load.
function drawShopInterior(ox,oy,viewW,viewH){
 const X=x=>x*S-ox,Y=y=>y*S-oy;
 const box=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(X(x),Y(y),w*S,h*S)};
 const fit=(n,x,y,w,h)=>drawUploadedFit('critter-shop-'+n,X(x),Y(y),w*S,h*S);
 ctx.save();ctx.beginPath();ctx.rect(X(0),Y(0),W*S,H*S);ctx.clip();
 box(0,0,W,H,'#c5a67f');
 if(!interiorTexture('critter-shop-floor-tile-062',0,0,W,H,ox,oy,viewW,viewH)){
  for(let y=0;y<H;y++){box(0,y,W,.035,'#9a7f60');for(let x=y%2;x<W;x+=2)box(x,y,.035,1,'#9a7f60')}
 }
 const exitX=roomExit(s.area)[0];
 connectedInteriorWalls(ox,oy,'#705747','#b69b77',exitX);
 interiorWallPanels('critter-shop-wall-panel-072',ox,oy);
 for(const x of [1,W-2])fit('wall-column-080',x,0,1,3.5);
 for(const x of [3,W-7])fit('window-076',x,.6,3,2.2);
 fit('banner-048',W/2-1,.2,2,2.8);
 for(const x of [W/3,2*W/3])fit('hanging-lamp-060',x-.5,1.9,1,1.2);
 // Flat rug and wall-side decorative plants never modify collision.
 fit('rug-065',Math.max(1,exitX-1.5),H-4,4,2);
 for(const x of [.8,W-1.8])fit('plant-042',x,1.5,1,1.5);
 for(const o of interiorObjects)drawInteriorAsset(s.area,o,X(o.x),Y(o.y),o.w*S,o.h*S);
 ctx.restore();
}
function drawInteriorDetails(ox,oy,viewW,viewH){
 if(!isInterior(s.area))return;
 if(shopInterior(s.area))return drawShopInterior(ox,oy,viewW,viewH);
 if(clinicalInterior(s.area))return drawClinicalInterior(ox,oy,viewW,viewH);
 const X=x=>x*S-ox,Y=y=>y*S-oy,estate=s.area==='homesteadHome';
 const color=(slot,fallback)=>estate?cosmeticColor(slot,fallback):fallback;
 const box=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(X(x),Y(y),w*S,h*S)};
 ctx.save();ctx.beginPath();ctx.rect(X(0),Y(0),W*S,H*S);ctx.clip();
 box(0,0,W,H,color('floor','#ae9474'));
 for(let y=0;y<H;y+=.75)box(0,y,W,.025,'#795d4333');
 const exitX=TOWN_ROOMS[s.area]?roomExit(s.area)[0]:17;
 connectedInteriorWalls(ox,oy,color('wall','#77614e'),'#493d33',exitX);
 const picture=s.area==='home'?'wall-family-portrait':s.area==='neighbor'?'wall-scroll-a':'wall-floral-picture';
 drawUploadedFit(picture,X(W/2-1),Y(.4),2*S,2*S);
 for(const x of [3,W-5])drawUploadedFit('wall-scroll-b',X(x),Y(.4),2*S,2*S);
 for(const x of [W/3,W*2/3])drawUploadedFit('square-lantern',X(x-.5),Y(2),S,S);
 if(!(estate&&activeCosmetic('rug')))drawUploadedFit(s.area==='home'?'round-rug-cream':'round-rug-blue',X(W/2-2),Y(H-7),4*S,3*S);
 if(estate)drawInteriorDecor(ox,oy);
 for(const o of interiorObjects)drawInteriorAsset(s.area,o,X(o.x),Y(o.y),o.w*S,o.h*S);
 ctx.restore();
}


// Phase 5: Cosmetic local-world day/night clock. One real second advances one
// in-game minute; time is saved on existing save events. No battle/calendar effects.
let atmospherePreviousFrame=0;
const atmosphericIndoor=()=>isInterior(s.area)||['gym','cave','grotto','ruins','cavern','willowHollow'].includes(s.area);
function tickAtmosphere(now=performance.now()){
 if(!s)return;
 if(!atmospherePreviousFrame){atmospherePreviousFrame=now;return}
 const seconds=Math.max(0,Math.min((now-atmospherePreviousFrame)/1000,0.15));
 atmospherePreviousFrame=now;
 if(screen!=='game'||modal||battle||document.hidden)return;
 const m=(s.worldMinutes||0)+seconds;
 if(m>=1440){s.worldMinutes=m%1440;s.worldDay=(s.worldDay||1)+1}
 else s.worldMinutes=m;
}
function worldHour(){return ((s?.worldMinutes??480)%1440)/60}
// Weather is deterministic from saved world time, independent of encounter RNG.
const WEATHER_PROFILES={
 village:[65,22,5,8,0],town:[65,23,5,7,0],garden:[60,25,5,10,0],
 route1:[60,26,5,9,0],route2:[48,26,8,18,0],forest:[40,27,8,25,0],
 route3:[43,13,8,13,23],route4:[58,27,5,10,0],ridge:[53,17,7,16,7],homestead:[65,22,5,8,0]
};
const WEATHER_NAMES=['clear','rain','storm','fog','snow'];
const WEATHER_LABELS={clear:'Clear',rain:'Rain',storm:'Thunderstorm',fog:'Fog',snow:'Snow',sheltered:'Sheltered'};
const weatherCache=new Map();
let weatherCachePeriod='';
function regionalWeather(area=s?.area,day=s?.worldDay||1,minutes=s?.worldMinutes??480){
 const profile=WEATHER_PROFILES[area];if(!profile)return 'sheltered';
 const period=day+':'+Math.floor(minutes/180);if(period!==weatherCachePeriod){weatherCache.clear();weatherCachePeriod=period}
 if(weatherCache.has(area))return weatherCache.get(area);
 const zone=['village','town','route1','homestead'].includes(area)?'valley':area;
 let hash=2166136261;for(const ch of zone+':'+day+':'+Math.floor(minutes/180)){hash=Math.imul(hash^ch.charCodeAt(0),16777619)}
 let roll=(hash>>>0)%100;
 for(let i=0;i<profile.length;i++){roll-=profile[i];if(roll<0){weatherCache.set(area,WEATHER_NAMES[i]);return WEATHER_NAMES[i]}}
 return 'clear';
}
function weatherWind(){const weather=regionalWeather();return weather==='storm'?2.8:weather==='rain'?1.7:weather==='snow'?1.2:1}
function drawWeather(w,h,now=performance.now()){
 const weather=regionalWeather();if(weather==='clear'||weather==='sheltered')return;
 ctx.save();
 if(weather==='fog'){
  ctx.fillStyle='rgba(194,214,215,.14)';ctx.fillRect(0,0,w,h);
  for(let i=0;i<4;i++){const x=((now*.018+i*w*.39)%(w+300))-150;
   const g=ctx.createRadialGradient(x,h*(.25+i*.18),8,x,h*(.25+i*.18),Math.max(90,w*.34));
   g.addColorStop(0,'rgba(220,232,230,.24)');g.addColorStop(1,'rgba(220,232,230,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}
 }else{
  const snow=weather==='snow',storm=weather==='storm';
  ctx.fillStyle=snow?'rgba(200,220,238,.13)':'rgba(35,57,83,.12)';ctx.fillRect(0,0,w,h);
  const count=Math.min(150,Math.max(28,Math.floor(w*h/(snow?4200:storm?2300:3400))));
  ctx.strokeStyle=storm?'rgba(185,212,239,.55)':'rgba(180,214,240,.4)';ctx.lineWidth=1;ctx.beginPath();
  for(let i=0;i<count;i++){
   const speed=snow?.035:storm?.65:.42;
   const y=(i*97.13+now*speed)%(h+36)-18;
   const x=((i*173.71+now*(snow?.018:storm?.16:.085)+Math.sin(i+now*.001)*8)%(w+30))-15;
   if(snow){ctx.fillStyle='rgba(245,250,255,.8)';ctx.fillRect(x,y,i%3+1,i%3+1)}
   else{ctx.moveTo(x,y);ctx.lineTo(x-(storm?7:4),y-(storm?20:13))}
  }
  ctx.stroke();
  // Restrained single lightning pulse, rather than rapid strobing.
  if(storm){const pulse=now%17000;if(pulse<180){ctx.fillStyle='rgba(215,230,255,'+(.13*(1-pulse/180))+')';ctx.fillRect(0,0,w,h)}}
 }
 ctx.restore();
}
// Optional synthesized ambience, unlocked by a player gesture on mobile.
let ambientAudio=null,ambientGain=null,ambientFilter=null,ambientLast=0,ambientVolume=.35;
try{const saved=localStorage.getItem('critters-ambient-volume');if(saved!==null&&Number.isFinite(Number(saved)))ambientVolume=Math.max(0,Math.min(1,Number(saved)))}catch{}
function unlockAmbient(){
 if(!ambientVolume)return;
 try{
  if(!ambientAudio){
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   ambientAudio=new Audio();
   const buffer=ambientAudio.createBuffer(1,ambientAudio.sampleRate*3,ambientAudio.sampleRate),samples=buffer.getChannelData(0);
   for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
   const source=ambientAudio.createBufferSource();source.buffer=buffer;source.loop=true;
   ambientFilter=ambientAudio.createBiquadFilter();ambientFilter.type='lowpass';
   ambientGain=ambientAudio.createGain();ambientGain.gain.value=0;
   source.connect(ambientFilter);ambientFilter.connect(ambientGain);ambientGain.connect(ambientAudio.destination);source.start();
  }
  if(ambientAudio.state==='suspended')ambientAudio.resume().catch(()=>{});
 }catch{}
}
function tickAmbient(now=performance.now()){
 if(!ambientAudio||!ambientGain||!ambientFilter||now-ambientLast<250)return;ambientLast=now;
 const weather=regionalWeather(),active=screen==='game'&&!modal&&!battle&&!document.hidden&&weather!=='sheltered';
 const gain={clear:.025,rain:.10,storm:.15,fog:.018,snow:.012}[weather]||0;
 const freq={clear:350,rain:2400,storm:1100,fog:240,snow:500}[weather]||300;
 ambientGain.gain.setTargetAtTime(active?gain*ambientVolume:0,ambientAudio.currentTime,.2);
 ambientFilter.frequency.setTargetAtTime(freq,ambientAudio.currentTime,.4);
}
window.addEventListener('pointerdown',unlockAmbient,{passive:true});
window.addEventListener('keydown',unlockAmbient);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ambientGain)ambientGain.gain.setTargetAtTime(0,ambientAudio.currentTime,.05)});
function worldPhase(){
 const h=worldHour();
 return h<5?'Night':h<7?'Dawn':h<17?'Day':h<19?'Dusk':'Night';
}
function skyDarkness(){
 const h=worldHour();
 if(h>=20||h<5)return .52;
 if(h<7)return .52-(h-5)/2*.52;
 if(h<17)return 0;
 if(h<20)return (h-17)/3*.52;
 return .52;
}
function atmosphericLight(x,y,radius,warmth=1){
 const rad=ctx.createRadialGradient?.(x,y,3,x,y,radius);
 if(rad){
  rad.addColorStop(0,'rgba(255,220,150,'+(0.32*warmth).toFixed(3)+')');
  rad.addColorStop(.35,'rgba(255,196,104,'+(0.14*warmth).toFixed(3)+')');
  rad.addColorStop(1,'rgba(255,175,80,0)');
  ctx.fillStyle=rad;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
 }else{
  ctx.fillStyle='rgba(246,210,152,'+(0.09*warmth)+')';
  ctx.beginPath();ctx.arc(x,y,Math.min(radius,30),0,Math.PI*2);ctx.fill();
 }
}
// Decorative wind field shared by rice, grass and trees; all map hitboxes stay fixed.
function windAt(x,y,now){
 const t=now*.001;
 return (.72*Math.sin(t*1.55-x*.33-y*.12)+.40*Math.sin(t*.83-x*.14+y*.22))*weatherWind();
}
function drawRiceClump(sx,sy,x,y,now){
 const gust=windAt(x,y,now);
 for(let k=0;k<5;k++){
  const rootX=sx+4+k*6+(x*7+y*3+k*11)%3,rootY=sy+25+(k+y)%4;
  const length=16+(k*7+x+y)%8,bend=gust*(4.1+length*.13);
  ctx.strokeStyle=k%3===0?'#a7bb59':k%2===0?'#729d48':'#91b953';
  ctx.lineWidth=k%3===0?2:1.55;
  ctx.beginPath();ctx.moveTo(rootX,rootY);
  ctx.quadraticCurveTo(rootX+bend*.24,rootY-length*.53,rootX+bend,rootY-length);ctx.stroke();
  ctx.strokeStyle=k%2?'#c1ca69':'#609348';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(rootX+bend*.3,rootY-length*.55);
  ctx.quadraticCurveTo(rootX+bend*.28-4,rootY-length*.62,rootX+bend*.2-6,rootY-length*.35);ctx.stroke();
  ctx.beginPath();ctx.moveTo(rootX+bend*.45,rootY-length*.66);
  ctx.quadraticCurveTo(rootX+bend*.55+5,rootY-length*.75,rootX+bend*.5+7,rootY-length*.49);ctx.stroke();
  if((k+x*3+y)%3!==0){
   ctx.strokeStyle='#e1c77a';ctx.lineWidth=1.35;
   ctx.beginPath();ctx.moveTo(rootX+bend,rootY-length);
   ctx.quadraticCurveTo(rootX+bend+3,rootY-length-4,rootX+bend+5+gust*2,rootY-length+1);ctx.stroke();
   ctx.fillStyle='#dbc277';
   for(let n=0;n<3;n++)ctx.fillRect(rootX+bend+1+n*1.5,rootY-length-2+n*1.4,2.2,2.6);
  }
 }
}
function drawAtmosphericMotion(ox,oy,w,h,now){
 if(atmosphericIndoor())return;
 const lowX=Math.max(0,Math.floor(ox/S)-1),hiX=Math.min(W,Math.ceil((ox+w)/S)+1);
 const lowY=Math.max(0,Math.floor(oy/S)-1),hiY=Math.min(H,Math.ceil((oy+h)/S)+1);
 for(let y=lowY;y<hiY;y++)for(let x=lowX;x<hiX;x++){
  const t=tiles[y]?.[x];
  if(t!==T.tall&&t!==T.rice&&t!==T.water&&t!==T.tree)continue;
  const sx=x*S-ox,sy=y*S-oy,gust=windAt(x,y,now);
  if(t===T.rice){
   ctx.strokeStyle='rgba(213,239,206,.32)';ctx.lineWidth=1;
   const ripple=(now/400+x*11+y*7)%23;
   ctx.beginPath();ctx.moveTo(sx+2+ripple*.3,sy+29);ctx.lineTo(sx+8+ripple*.3,sy+29);ctx.stroke();
   if(!naturalTileReady(T.rice,x,y))drawRiceClump(sx,sy,x,y,now);
  }else if(t===T.water){
   // Only narrow existing channels, not whole ponds, receive the animated tile.
   const horizontal=tiles[y]?.[x-1]===T.water&&tiles[y]?.[x+1]===T.water&&tiles[y-1]?.[x]!==T.water&&tiles[y+1]?.[x]!==T.water;
   if(horizontal&&(s.area==='route1'||s.area==='village')){
    const frames=['1','2','3','4'].map(n=>'water-channel-flow-'+n);warmFrames(frames);
    if(drawUploadedArt(loopArt(frames,210,x*31),sx,sy,S,S))continue;
   }
   const ripple=(now/235+x*11+y*17)%25;
   ctx.strokeStyle='rgba(234,255,237,.45)';ctx.lineWidth=1.2;
   ctx.beginPath();ctx.moveTo(sx+3+ripple,sy+9+(x+y)%9);ctx.lineTo(sx+9+ripple,sy+9+(x+y)%9);ctx.stroke();
  }else if(t===T.tall){
   if(naturalTileReady(T.tall,x,y))continue;
   for(let k=0;k<4;k++){
    const rootX=sx+5+k*7,rootY=sy+26-k%2*3;
    ctx.strokeStyle=k%2?'#9ac76b':'#66994f';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(rootX,rootY);
    ctx.quadraticCurveTo(rootX+gust*2,rootY-8,rootX+gust*5,rootY-15);ctx.stroke();
   }
  }else if(t===T.tree&&s.area!=='village'&&!treeArtReady()){
   ctx.strokeStyle='rgba(162,206,123,.34)';ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(sx+14+gust*1.2,sy+12,11,3.45,5.5);ctx.stroke();
  }
 }
 const motes=Math.min(23,Math.ceil(w*h/23000));
 for(let i=0;i<motes;i++){
  const mx=((i*173.1+Math.sin(i*33)*135+now/160*(i%3+1))%(W*S)+W*S)%(W*S)-ox;
  const my=((i*89.7+Math.cos(i*19)*77-now/380)%(H*S)+H*S)%(H*S)-oy;
  if(mx<0||my<0||mx>w||my>h)continue;
  ctx.fillStyle=worldPhase()==='Night'?'#eddca765':'#f2f4d13b';
  ctx.fillRect(mx,my,i%4===0?2:1,1.5);
 }
}
function drawRegionAtmosphere(ox,oy,w,h,now){
 if(atmosphericIndoor())return;
 const hour=worldHour(),daylight=hour>=6&&hour<19;
 const haze=s.area==='forest'?.075:s.area==='cave'?.10:s.area==='route2'?.05:s.area==='route1'?.035:.025;
 ctx.fillStyle=s.area==='cave'?'rgba(95,118,139,'+haze+')':'rgba(232,245,203,'+haze+')';ctx.fillRect(0,0,w,h);

}
function drawAtmosphereOverlay(ox,oy,w,h){
 const inside=atmosphericIndoor();
 const darkness=skyDarkness();
 if(!inside){
  const phase=worldPhase();
  if(phase==='Dawn'||phase==='Dusk'){
   ctx.fillStyle=phase==='Dawn'?'rgba(236,154,91,.10)':'rgba(220,124,77,.14)';
   ctx.fillRect(0,0,w,h);
  }
  if(darkness){
   ctx.fillStyle='rgba(12,26,53,'+darkness.toFixed(3)+')';
   ctx.fillRect(0,0,w,h);
  }
 }else{
  ctx.fillStyle='rgba(237,174,91,.055)';ctx.fillRect(0,0,w,h);
  if(darkness>.12){
   ctx.fillStyle='rgba(18,24,43,'+(darkness*.24).toFixed(3)+')';ctx.fillRect(0,0,w,h);
  }
 }
 // Only real outdoor lanterns emit light, and only after dark.
 if(!inside&&s.area==='village'&&darkness>.18)for(const [x,y] of VILLAGE_LANTERNS){
  if(buildingSceneryReserved(s.area,x,y))continue;
  const sx=(x+.5)*S-ox,sy=(y+.1)*S-oy;
  if(sx>=-85&&sy>=-85&&sx<=w+85&&sy<=h+85)atmosphericLight(sx,sy,60,Math.min(1,darkness/.52));
 }

}
function drawAtmosphereHUD(){
 const h=worldHour(),hours=Math.floor(h),minutes=Math.floor((h-hours)*60);
 const clock=String(hours).padStart(2,'0')+':'+String(minutes).padStart(2,'0');
 const timeLabel='Day '+(s.worldDay||1)+' · '+clock+' · '+WEATHER_LABELS[regionalWeather()];
 const location=TOWN_ROOMS[s.area]?.name||SECRET_AREAS[s.area]?.name||(s.area==='homestead'&&s.homestead?.owned?'Personal Home':REGION_MAP_PLACES.find(p=>p.id===s.area)?.name)
  ||REGION_MAP_INTERIORS.find(p=>p.id===s.area)?.name
  ||'The Valley';
 const zoom=Math.max(.85,Math.min(2.25,Math.min(C.width/600,C.height/440)));
 const viewportWidth=C.width/zoom;
 ctx.save();
 ctx.font='bold 11px system-ui';
 const clockWidth=ctx.measureText(timeLabel).width,locationWidth=ctx.measureText(location).width;
 const width=Math.min(viewportWidth-10,clockWidth+locationWidth+37);
 const x=Math.max(5,viewportWidth-width-8),y=6;
 ctx.fillStyle='#162d36e9';ctx.fillRect(x,y,width,25);
 ctx.fillStyle='#f4e3b1';
 const spaceForLocation=width-clockWidth-27;
 ctx.save();ctx.beginPath();ctx.rect(x+7,y+2,Math.max(0,spaceForLocation),21);ctx.clip();
 ctx.fillText(location,x+9,y+17);
 ctx.restore();
 ctx.fillStyle='#9bbeb7';ctx.fillRect(x+width-clockWidth-17,y+5,1,15);
 ctx.textAlign='right';ctx.fillStyle='#f4e3b1';
 ctx.fillText(timeLabel,x+width-8,y+17);
 ctx.restore();
}

let canvasSizeDirty=true;
function resizeGameCanvas(){
 const width=Math.max(1,Math.round(C.clientWidth||C.getBoundingClientRect().width));
 const height=Math.max(1,Math.round(C.clientHeight||C.getBoundingClientRect().height));
 if(C.width!==width||C.height!==height){C.width=width;C.height=height;ctx.imageSmoothingEnabled=false}canvasSizeDirty=false;
}
function draw(){
 if(screen!=='game'||!s)return;
 if(canvasSizeDirty)resizeGameCanvas();
 tickAtmosphere();
 updateVisual();
 updateInteractVisibility();
 if(OUTDOOR_GRID[s.area])return drawOutdoorWorld();
 const zoom=Math.max(0.85,Math.min(2.25,Math.min(C.width/600,C.height/440)));
 const viewportWidth=C.width/zoom,viewportHeight=C.height/zoom;
 const ox=visual.x*S+S/2-viewportWidth/2;
 const oy=visual.y*S+S/2-viewportHeight/2;
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#6b9e60';ctx.fillRect(0,0,C.width,C.height);ctx.setTransform(zoom,0,0,zoom,0,0);
 if(!isInterior(s.area))for(let y=Math.max(0,Math.floor(oy/S));y<Math.min(H,Math.ceil((oy+viewportHeight)/S));y++)for(let x=Math.max(0,Math.floor(ox/S));x<Math.min(W,Math.ceil((ox+viewportWidth)/S));x++)drawTile(tiles[y][x],x*S-ox,y*S-oy,x,y);
 startSceneryLayer(visual.x*S+16-ox,visual.y*S+32-oy);
 if(s.area==='village')drawVillageDetails(ox,oy,viewportWidth,viewportHeight);
 if(isInterior(s.area))drawInteriorDetails(ox,oy,viewportWidth,viewportHeight);
 if(s.area==='gym')drawGymDecor(ox,oy);
 if(s.area==='route1')drawRoute1Details(ox,oy,viewportWidth,viewportHeight);
 drawCinematicTrees(ox,oy,viewportWidth,viewportHeight,performance.now());
 drawEnvironmentalDetails(ox,oy,viewportWidth,viewportHeight);
 drawExplorationSites(ox,oy);
 drawAtmosphericMotion(ox,oy,viewportWidth,viewportHeight,performance.now());
 drawRegionAtmosphere(ox,oy,viewportWidth,viewportHeight,performance.now());
 for(const p of npcs){
 if((p.kind==='gymtrainer'||p.kind==='routetrainer')&&s.defeated[p.id]){ /* Trainer remains visible for rematches. */ }
 const pos=npcVisualPosition(p),x=pos.x*S+16-ox,y=pos.y*S+32-oy;
 queueWorldActor(y,()=>{drawNpc(p,x,y);drawNpcActivity(p,x,y);});
 if((p.kind==='gymtrainer'||p.kind==='routetrainer')&&!s.defeated[p.id]&&!(p.alertUntil>performance.now())&&trainerApproach?.p!==p){
  ctx.fillStyle='#fff1a0';ctx.font='bold 14px monospace';ctx.fillText('!',x-4,y-43);
 }
}
 const isMoving=(stickActive&&!!stickDirection)||Object.values(held).some(Boolean)||Math.abs(visual.x-s.x)+Math.abs(visual.y-s.y)>.015;
 const walkFrame=playerGaitFrame();
 queueWorldActor(visual.y*S+32-oy,()=>sprite(s.gender,visual.x*S+16-ox,visual.y*S+32-oy,s.face,walkFrame,1.25));
 finishSceneryLayer();
 drawAtmosphereOverlay(ox,oy,viewportWidth,viewportHeight);
 drawWeather(viewportWidth,viewportHeight);
 drawAtmosphereHUD()
}

/* Two interconnected loops: forest/rice/town/bamboo and town/bamboo/foothills/garden.
   Outdoor maps are separate simulation chunks but share one continuous camera. */
const OUTDOOR_GRID=Object.freeze({
 homestead:[0,1],village:[1,1],route1:[2,1],town:[3,1],route4:[4,1],garden:[5,1],
 forest:[2,0],route2:[3,0],route3:[5,0],ridge:[4,0]
});
const INTERIOR_REGION_IDS=new Set(['home','neighbor','lab','gym','cave','homesteadHome','grotto','ruins','cavern','willowHollow',...Object.keys(TOWN_ROOMS)]);

/* Per-column widths and per-row heights keep outdoor sections edge-aligned
   while giving the seven areas substantially different playable footprints. */
const OUTDOOR_COL_WIDTHS=[36,40,44,51,44,46],OUTDOOR_ROW_HEIGHTS=[34,40];
function outdoorSize(area){
 const grid=OUTDOOR_GRID[area];
 return grid?{w:OUTDOOR_COL_WIDTHS[grid[0]],h:OUTDOOR_ROW_HEIGHTS[grid[1]]}:roomSize(area);
}
function outdoorOrigin(area){
 const grid=OUTDOOR_GRID[area];
 if(!grid)return {x:0,y:0};
 return {x:OUTDOOR_COL_WIDTHS.slice(0,grid[0]).reduce((a,b)=>a+b,0),
         y:OUTDOOR_ROW_HEIGHTS.slice(0,grid[1]).reduce((a,b)=>a+b,0)};
}
function outdoorWorldBounds(){
 return {width:OUTDOOR_COL_WIDTHS.reduce((a,b)=>a+b,0),
         height:OUTDOOR_ROW_HEIGHTS.reduce((a,b)=>a+b,0)};
}
function applyAreaSize(area){
 const size=outdoorSize(area);W=size.w;H=size.h;
}
/* Authored interior and classic 34x26 area content remains in place.
   Irregular coastlines, forest fringes, and winding paths fill new space. */
function decorateExpandedOutdoor(){
 if(!OUTDOOR_GRID[s.area])return;
 const area=s.area;
 if(area==='homestead')return;
 const forest=area==='forest'||area==='route2';
 const rocky=area==='route3';
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  if(x<34&&y<26)continue;
  const seed=(x*67+y*113+x*y*17+(area.length*31))%131;
  // Undulating, asymmetric natural edges, not identical rectangular tree walls.
  const rightIndent=1+((Math.floor(y/4)+area.length)%4);
  const lowerIndent=1+((Math.floor(x/7)+area.length)%3);
  if(x>=W-rightIndent||y>=H-lowerIndent){
   tiles[y][x]=rocky?T.rock:forest?T.tree:seed%3===0?T.rock:T.tree;
  }else if(seed<12){tiles[y][x]=rocky?T.rock:forest?T.tree:T.tall}
  else if(seed>=12&&seed<22){tiles[y][x]=forest?T.tall:rocky?T.stone:T.flower}
  else if(area==='route1'&&seed%5===0)tiles[y][x]=T.rice;
 }
 // Meandering access to expanded corners and alternate routes.
 const paving=(x,y)=>{if(x>0&&x<W-1&&y>0&&y<H-1){tiles[y][x]=T.path;villageObstacles.delete(key(x,y));route1Blocked.delete(key(x,y))}};
 for(let x=32;x<W-1;x++)for(let y=12;y<=14;y++)paving(x,y);
 for(let y=24;y<H-1;y++)for(let x=16;x<=18;x++)paving(x,y);
 if(area==='route1'||area==='forest'||area==='route2'||area==='route3'){
  for(let x=7;x<W-4;x++)for(let y=H-9;y<=H-7;y++)paving(x,y);
  for(let y=14;y<H-8;y++)for(let x=10;x<=12;x++)paving(x,y);
  for(let y=14;y<H-8;y++)for(let x=W-10;x<=W-8;x++)paving(x,y);
 }
}

const OUTDOOR_LINKS={
 homestead:{right:['village',12,14]},
 village:{left:['homestead',12,14],right:['route1',12,14]},
 route1:{left:['village',12,14],right:['town',12,14],up:['forest',15,18]},
 town:{left:['route1',12,14],right:['route4',12,14],up:['route2',16,18]},
 route4:{left:['town',12,14],right:['garden',12,14]},
 forest:{down:['route1',15,18],right:['route2',12,14]},
 route2:{left:['forest',12,14],right:['ridge',12,14],down:['town',16,18]},
 ridge:{left:['route2',12,14],right:['route3',12,14]},
 route3:{left:['ridge',12,14],down:['garden',17,19],up:['cave',19,21]},
 garden:{left:['route4',12,14],up:['route3',17,19]}
};
const outdoorChunks=new Map();
let worldTransitionBusy=false,worldFadeTimer=null;
function fadeWorldChange(effect){
 if(worldTransitionBusy)return;
 worldTransitionBusy=true;releaseMovement();
 const curtain=document.getElementById('worldFade');
 if(!curtain){try{effect()}finally{worldTransitionBusy=false}return}
 curtain.classList.add('active');
 worldFadeTimer=setTimeout(()=>{
  try{effect()}finally{
   worldFadeTimer=setTimeout(()=>{
    curtain.classList.remove('active');
    worldFadeTimer=setTimeout(()=>{worldTransitionBusy=false;worldFadeTimer=null},770);
   },35);
  }
 },770);
}
function carveOutdoorPortal(side,a,b){
 for(let n=a;n<=b;n++)for(let t=0;t<3;t++){
  const x=side==='left'?t:side==='right'?W-1-t:n;
  const y=side==='up'?t:side==='down'?H-1-t:n;
  if(x<0||y<0||x>=W||y>=H)continue;
  tiles[y][x]=T.path;
  villageObstacles.delete(key(x,y));route1Blocked.delete(key(x,y));
 }
}
function prepareOutdoorPortals(){
 if(!OUTDOOR_GRID[s.area])return;
 const links=OUTDOOR_LINKS[s.area]||{};
 for(const [side,[dest,a,b]] of Object.entries(links))carveOutdoorPortal(side,a,b);
 // Cut authored, walkable corridors to their edge openings. Do not create
 // disconnected portals into thick trees, hedges or decorative rock.
 const vertical=(x1,x2,y1,y2)=>{for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++){
  tiles[y][x]=T.path;villageObstacles.delete(key(x,y));route1Blocked.delete(key(x,y));
 }};
 const horizontal=(x1,x2,y1,y2)=>{for(let x=x1;x<=x2;x++)for(let y=y1;y<=y2;y++){
  tiles[y][x]=T.path;villageObstacles.delete(key(x,y));route1Blocked.delete(key(x,y));
 }};
 if(s.area==='route1')vertical(15,18,0,14);
 if(s.area==='forest'){vertical(15,18,10,H-1);horizontal(15,W-1,12,14);}
 if(s.area==='town')vertical(16,18,0,14);
 if(s.area==='route2')vertical(16,18,12,H-1);
 if(s.area==='route3')vertical(17,19,12,H-1);
 if(s.area==='garden')vertical(17,19,0,14);
 if(s.area==='route4'||s.area==='ridge')horizontal(0,W-1,12,14);
}
function outdoorChunk(area){
 if(area==='homestead'&&outdoorChunks.get(area)?.constructionKey!==homesteadGeometryKey())outdoorChunks.delete(area);
 if(outdoorChunks.has(area))return outdoorChunks.get(area);
 const current={area:s.area,x:s.x,y:s.y,tiles,npcs,villageObstacles,route1Blocked,interiorObjects,interiorBlocked,w:W,h:H,constructionKey:s.area==='homestead'?homesteadGeometryKey():null};
 try{
  s.area=area;s.x=17;s.y=13;
  build(true); // Preview geometry without migrating, saving or discovering areas.
  const result={tiles,npcs,villageObstacles,route1Blocked,interiorObjects,interiorBlocked,w:W,h:H,constructionKey:s.area==='homestead'?homesteadGeometryKey():null};
  outdoorChunks.set(area,result);
  return result;
 }finally{
  s.area=current.area;s.x=current.x;s.y=current.y;W=current.w;H=current.h;
  tiles=current.tiles;npcs=current.npcs;villageObstacles=current.villageObstacles;
  route1Blocked=current.route1Blocked;interiorObjects=current.interiorObjects;interiorBlocked=current.interiorBlocked;
 }
}
function tryOutdoorExit(d,x,y){
 if(!OUTDOOR_GRID[s.area]||x>=0&&y>=0&&x<W&&y<H)return false;
 const [dest,start,end]=OUTDOOR_LINKS[s.area]?.[d]||[];
 if(!dest)return true;
 const cross=d==='left'||d==='right'?y:x;
 if(cross<start||cross>end)return true;
 if(s.area==='village'&&!s.introComplete){
  say(['Complete the laboratory tutorial before exploring the region.']);return true;
 }
 if(dest==='cave'){
  if(!s.cut){notifyWorld(['Thick vines block the mountain cave. The first badge unlocks the vegetation cutter.']);return true}
  recordWalkingStep();region('cave',17,23,'You enter Mountain Cave.');return true;
 }
 if(s.area==='forest'&&dest==='route2'&&!s.cut){
  notifyWorld(['Overgrown bamboo blocks the woodland shortcut. The first badge will let you clear it.']);return true;
 }
 if(s.area==='route2'&&dest==='forest'&&!s.cut){
  notifyWorld(['The western bamboo path is tangled in vines. Come back after the first badge.']);return true;
 }
 const destinationSize=outdoorSize(dest);
 const targetX=d==='right'?0:d==='left'?destinationSize.w-1:x;
 const targetY=d==='down'?0:d==='up'?destinationSize.h-1:y;
 recordWalkingStep();region(dest,targetX,targetY);
 return true;
}
// Persist the outdoor camera between chunks; never re-center it when an
// adjoining area becomes current. Damping smooths minor tile-step timing.
const outdoorCamera={x:0,y:0,last:0,ready:false};
function resetOutdoorCamera(){outdoorCamera.ready=false;outdoorCamera.last=0}
function followOutdoorCamera(targetX,targetY,now=performance.now()){
 if(!outdoorCamera.ready){
  outdoorCamera.x=targetX;outdoorCamera.y=targetY;
  outdoorCamera.ready=true;outdoorCamera.last=now;
 }else{
  const dt=Math.max(0,Math.min(70,now-outdoorCamera.last));
  const factor=1-Math.exp(-dt/85);
  outdoorCamera.x+=(targetX-outdoorCamera.x)*factor;
  outdoorCamera.y+=(targetY-outdoorCamera.y)*factor;
  outdoorCamera.last=now;
 }
 return outdoorCamera;
}
function buildFarmGrounds(){
 const cap=farmCapacity();if(!cap.pairs)return;
 rect(16,14,2,24,T.path);rect(2,16,30,2,T.path);rect(2,27,30,2,T.path);
 houses([[24,5,8,5]]);rect(28,12,2,4,T.path);rect(18,14,12,2,T.path);
 for(const [x,y,w,h] of FARM_PASTURES.slice(0,cap.pairs)){
  rect(x,y,w,h,T.hedge);rect(x+1,y+1,w-2,h-2,T.grass);put(x+Math.floor(w/2),y,T.gate);
 }
}
// Pasture animation is strictly visual: no timers, breeding effects, or save writes.
const pastureActors=new Map(),pastureImages=new Map();
function pastureBounds(i){
 const [x,y,w,h]=FARM_PASTURES[i];
 return {left:x+1.65,right:x+w-1.65,top:y+2.35,bottom:y+h-1.35};
}
function pasturePoint(i,j,roll=Math.random){
 const b=pastureBounds(i),mid=(b.left+b.right)/2;
 const left=j===0?b.left:mid+.25,right=j===0?mid-.25:b.right;
 return {x:left+(right-left)*roll(),y:b.top+(b.bottom-b.top)*roll()};
}
function pastureActorState(p,i,j,now){
 const key=i+':'+j;let a=pastureActors.get(key);
 if(!a||a.parent!==p){
  const q=pasturePoint(i,j);
  a={parent:p,i,j,x:q.x,y:q.y,fromX:q.x,fromY:q.y,toX:q.x,toY:q.y,state:'idle',start:now,end:now+800+j*300,face:1,greetUntil:0};
  pastureActors.set(key,a);
 }
 if(now<a.greetUntil){a.state='play';return a}
 if(a.state==='walk'){
  const t=Math.max(0,Math.min(1,(now-a.start)/Math.max(1,a.end-a.start)));
  a.x=a.fromX+(a.toX-a.fromX)*t;a.y=a.fromY+(a.toY-a.fromY)*t;
 }
 if(now>=a.end){
  const night=worldHour()>=20||worldHour()<5,roll=Math.random();
  a.start=now;
  if(night&&roll<.65){a.state='sleep';a.end=now+4500+Math.random()*3500}
  else if(roll<.50){
   const q=pasturePoint(i,j);a.fromX=a.x;a.fromY=a.y;a.toX=q.x;a.toY=q.y;
   a.face=q.x<a.x?-1:1;a.state='walk';a.end=now+Math.max(650,Math.hypot(q.x-a.x,q.y-a.y)*900);
  }else if(roll<.72){a.state='rest';a.end=now+1800+Math.random()*2200}
  else if(roll<.85){a.state='play';a.end=now+900+Math.random()*700}
  else{a.state='idle';a.end=now+1000+Math.random()*1500}
 }
 return a;
}
function livingPastureActors(now){
 const active=[],used=new Set(),pairs=s?.homestead?.pairs||[];
 for(let i=0;i<farmCapacity().pairs;i++)for(let j=0;j<2;j++){
  const p=pairs[i]?.parents?.[j];if(!p)continue;
  used.add(i+':'+j);active.push(pastureActorState(p,i,j,now));
 }
 for(const key of pastureActors.keys())if(!used.has(key))pastureActors.delete(key);
 return active.sort((a,b)=>a.y-b.y);
}
function pastureImage(p){
 const path=critterSpritePath(p);if(!path)return null;
 if(!pastureImages.has(path)){const image=new Image();image.src=path;pastureImages.set(path,image)}
 const im=pastureImages.get(path);return im.complete&&im.naturalWidth>0?im:null;
}
function drawPastureCreature(a,ox,oy,now){
 const x=a.x*S-ox,y=a.y*S-oy,im=pastureImage(a.parent);
 const walking=a.state==='walk',resting=a.state==='sleep'||a.state==='rest';
 const hop=a.state==='play'?Math.abs(Math.sin((now-a.start)/130))*6:walking?Math.abs(Math.sin((now-a.start)/115))*2:0;
 const breathe=Math.sin(now/650+a.j)*.025,scaleY=resting?.73:1+breathe;
 ctx.save();
 ctx.translate(x,y-hop);ctx.scale(a.face,scaleY);ctx.imageSmoothingEnabled=false;
 if(im){const size=36,k=size/Math.max(im.naturalWidth,im.naturalHeight),w=im.naturalWidth*k,h=im.naturalHeight*k;ctx.drawImage(im,-w/2,-h,w,h)}
 else{
  // Neutral placeholder for species with no approved sprite; no new asset required.
  ctx.fillStyle='#e0c99b';ctx.strokeStyle='#3d5641';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(0,-13,12,11,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#36483c';ctx.beginPath();ctx.arc(-4,-15,1.5,0,Math.PI*2);ctx.arc(4,-15,1.5,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
 if(a.state==='sleep'||a.state==='play'||now<a.greetUntil){
  ctx.save();ctx.textAlign='center';ctx.font='bold 12px system-ui';ctx.fillStyle=a.state==='sleep'?'#e1efff':'#fff0b5';
  ctx.strokeStyle='#3d5641';ctx.lineWidth=2;const symbol=a.state==='sleep'?'zZ':now<a.greetUntil?'♥':'♪';ctx.strokeText(symbol,x,y-39-hop);ctx.fillText(symbol,x,y-39-hop);ctx.restore();
 }
}
function drawLivingPastures(ox,oy,vw,vh,now=performance.now()){
 for(const a of livingPastureActors(now)){
  const x=a.x*S-ox,y=a.y*S-oy;if(x<-45||x>vw+45||y<-45||y>vh+45)continue;
  drawPastureCreature(a,ox,oy,now);
 }
}
function pastureGateAt(x,y){
 if(s?.area!=='homestead'||!s.homestead?.owned)return -1;
 return FARM_PASTURES.slice(0,farmCapacity().pairs).findIndex(([px,py,w])=>x===px+Math.floor(w/2)&&y===py);
}
function greetPasture(i){
 if(i<0||i>=farmCapacity().pairs)return;
 const parents=(s.homestead?.pairs?.[i]?.parents||[]).filter(Boolean);
 if(!parents.length)return notifyWorld('This pasture is empty.');
 const now=performance.now();
 for(const a of livingPastureActors(now).filter(a=>a.i===i)){
  a.state='play';a.start=now;a.end=now+1600;a.greetUntil=now+1600;
 }
 return notifyWorld(parents.map(p=>p.name||p.type).join(' and ')+' happily greet you from the pasture.');
}
// Cosmetic sprites are chosen only from the existing purchased/active styles.
function estateArt(id){
 return {'style-22':'flagstone-grass','style-23':'brick-path','style-24':'flowerbed-pink','style-25':'flowerbed-sunflower','style-26':'pond-waterfall','style-27':'fountain-stone','style-28':'lantern-post','style-29':'shrub-white-flowers','style-32':'fence-white-horizontal','style-33':'fence-timber-horizontal','style-34':'hay-shelter','style-35':'stone-water-trough','style-36':'open-shelter','style-37':'windmill','style-38':'flowers-yellow','style-9':'rug-blue','style-10':'rug-red','style-13':'plant-terracotta'}[id]||null;
}
function farmFenceKind(x,y,w,h,xx,yy){
 if(yy===y&&xx===x+Math.floor(w/2))return 'gate';
 if(yy===y||yy===y+h-1)return 'horizontal';
 if(xx===x||xx===x+w-1)return 'vertical';
 return null;
}
function estateFit(name,x,y,w,h,ox,oy){
 return !!name&&drawUploadedFit(name,x*S-ox,y*S-oy,w*S,h*S);
}
function drawEstateExterior(ox,oy){
 if(!s.homestead?.owned)return;
 const box=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x*S-ox,y*S-oy,w*S,h*S)};
 const fit=(name,x,y,w,h)=>estateFit(name,x,y,w,h,ox,oy);
 const art=slot=>estateArt(activeCosmetic(slot)?.id);
 function styledHouse(x,y,w,h,roof,wall){
  box(x,y,w,Math.max(1,h-1),roof);box(x,y+h-1,w,1,wall);
  for(let yy=y+.2;yy<y+h-1;yy+=.45)box(x,yy,w,.055,'#00000025');
 }
 // Keep independent roof/siding selections visible even when there is no exact combined PNG.
 if(activeCosmetic('roof')||activeCosmetic('house'))styledHouse(6,5,6,3,cosmeticColor('roof','#8d614e'),cosmeticColor('house','#cfb48c'));
 if(activeCosmetic('porch')){box(7.3,8.2,3.4,.6,'#b08b60');for(let i=0;i<5;i++)box(7.4+i*.65,8.3,.06,.45,'#805b37')}
 if(activeCosmetic('path'))for(let x=15;x<W-1;x++)for(let y=12;y<=14;y++)if(tiles[y]?.[x]===T.path){
  if(!drawUploadedArt(art('path'),x*S-ox,y*S-oy,S,S)){box(x,y,1,1,cosmeticColor('path','#c5b38e'));box(x,y+.05,1,.055,'#00000022')}
 }
 const garden=activeCosmetic('garden');if(garden)for(let i=0;i<2;i++){
  if(!fit(art('garden'),4.2+i*2,11.2,1.8,1.3))for(let j=0;j<5;j++){box(4.4+i*2+(j%3)*.5,11.5+Math.floor(j/3)*.4,.22,.28,'#487344');box(4.3+i*2+(j%3)*.5,11.35+Math.floor(j/3)*.4,.4,.25,garden.color)}
 }
 const water=activeCosmetic('water');if(water&&!fit(art('water'),3.5,13,3,2)){box(3.5,13,3,2,'#b2ac91');box(3.7,13.2,2.6,1.6,water.color);if(water.stage===3){box(4.75,13.4,.5,1,'#ddd6c5');box(4.4,13.4,1.2,.18,'#d2edee')}}
 if(activeCosmetic('lantern'))for(const x of [18,23,28,33])if(!fit(art('lantern'),x-.25,10.1,.7,1.7)){box(x,11,.12,.8,'#6e5139');box(x-.15,10.7,.42,.4,'#f6c36d')}
 if(activeCosmetic('landscape'))for(const x of [4,6,8,10,12])if(!fit(art('landscape'),x,2.1,.9,1))box(x,2.4,.75,.65,'#759e6b');
 if(farmStage()>=2&&activeCosmetic('barn'))styledHouse(24,5,8,5,cosmeticColor('barn','#a45246'),'#d0b392');
 if(activeCosmetic('windmill')&&!fit(art('windmill'),32,27,2,4)){
  box(32,29,1.2,3,'#cbbba0');const cx=32.6*S-ox,cy=28.8*S-oy;ctx.save();ctx.translate(cx,cy);ctx.rotate(performance.now()/2400);ctx.fillStyle='#e0d4b8';for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillRect(-3,-30,6,30)}ctx.restore();
 }
 if(activeCosmetic('field'))for(let i=0;i<20;i++){const x=2+(i%5)*.65,y=30+Math.floor(i/5)*.6;if(!fit(art('field'),x,y,.6,.6))box(x,y,.27,.32,'#d2a45c')}
}
function drawFarmGrounds(ox,oy){
 const box=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x*S-ox,y*S-oy,w*S,h*S)};
 const fit=(name,x,y,w,h)=>estateFit(name,x,y,w,h,ox,oy);
 const fence=estateArt(activeCosmetic('fence')?.id)||'fence-timber-horizontal';
 for(const [x,y,w,h] of FARM_PASTURES.slice(0,farmCapacity().pairs)){
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
   const kind=farmFenceKind(x,y,w,h,xx,yy);if(!kind)continue;
   const actual=tiles[yy]?.[xx];if(actual!==T.hedge&&actual!==T.gate)continue;
   const name=kind==='gate'?'gate-timber-closed':fence;
   const im=uploadedArt(name);
   if(im){
    box(xx,yy,1,1,palette[T.grass]||'#5f8e5f');drawTerrainArt('grass-plain',xx*S-ox,yy*S-oy);
    if(kind==='vertical'){
     // No matching side-view fence uploaded: draw narrow rails rather than rotating a front-view sprite.
     box(xx+.35,yy,.14,1,cosmeticColor('fence','#805b37'));box(xx+.63,yy,.12,1,cosmeticColor('fence','#a98150'));box(xx+.29,yy+.07,.43,.16,cosmeticColor('fence','#c49a64'));
    }else drawUploadedArt(name,xx*S-ox,yy*S-oy,S,S);
   }else{
    box(xx,yy+.32,1,.14,cosmeticColor('fence','#805b37'));box(xx,yy+.66,1,.12,cosmeticColor('fence','#a98150'));box(xx+.08,yy+.12,.16,.78,cosmeticColor('fence','#c49a64'));
   }
  }
  if(!activeCosmetic('trough')||!fit('stone-water-trough',x+1.1,y+1.05,1.6,.85)){box(x+1.3,y+1.3,1.1,.42,'#85653f');box(x+1.4,y+1.4,.88,.22,'#7c9b9d')}
  const hay=activeCosmetic('hay')?'hay-shelter':'hay-bale';
  if(!fit(hay,x+w-2.6,y+1.1,1.3,1.25))box(x+w-2.4,y+1.3,.8,.55,cosmeticColor('hay','#c9ae56'));
  if(activeCosmetic('nest')&&!fit('open-shelter',x+w-2.5,y+h-2.6,1.5,1.4)){box(x+w-2.3,y+h-2.2,1.1,.65,'#947150');box(x+w-2.45,y+h-2.4,1.4,.2,'#674b37')}
 }
}
function drawHomesteadConstruction(ox,oy){
 const stage=homesteadConstructionStage();
 if(stage>=4)return;
 const box=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x*S-ox,y*S-oy,w*S,h*S)};
 // Materials and scaffold remain inside the fenced, inaccessible lot.
 for(let i=0;i<3;i++)box(4.2,4.3+i*.27,1.3,.18,'#87623e');
 if(stage>=1&&stage<=3){
  for(const x of [5.8,12.1]){box(x,4.5,.12,4.9,'#7b5433');for(let y=5;y<9.3;y+=.7)box(x,y,.55,.09,'#bc925b')}
  box(5.8,4.7,6.8,.12,'#ad8553');
 }
}
function drawOutdoorWorld(){
 const zoom=Math.max(.85,Math.min(2.25,Math.min(C.width/600,C.height/440)));
 const vw=C.width/zoom,vh=C.height/zoom;
 const position=outdoorOrigin(s.area),worldX=(position.x+visual.x)*S,worldY=(position.y+visual.y)*S;
 const bounds=outdoorWorldBounds();
 const minX=0,maxX=bounds.width*S,minY=0,maxY=bounds.height*S;
 const targetX=worldX+S/2-vw/2;
 const targetY=worldY+S/2-vh/2;
 const camera=followOutdoorCamera(targetX,targetY);
 const ox=camera.x,oy=camera.y;
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#5f8e5f';ctx.fillRect(0,0,C.width,C.height);
 ctx.setTransform(zoom,0,0,zoom,0,0);
 startSceneryLayer(worldX+16-ox,worldY+32-oy);
 const restore={area:s.area,tiles,npcs,villageObstacles,route1Blocked,interiorObjects,interiorBlocked,w:W,h:H,constructionKey:s.area==='homestead'?homesteadGeometryKey():null};
 // Nearby chunks are rendered within the same continuous world coordinate system.
 try{for(const [area,grid] of Object.entries(OUTDOOR_GRID)){
  const location=outdoorOrigin(area),size=outdoorSize(area);
  const px=location.x*S,py=location.y*S;
  if(px>ox+vw||py>oy+vh||px+size.w*S<ox||py+size.h*S<oy)continue;
  const chunk=outdoorChunk(area);
  s.area=area;W=chunk.w;H=chunk.h;tiles=chunk.tiles;npcs=chunk.npcs;
  villageObstacles=chunk.villageObstacles;route1Blocked=chunk.route1Blocked;
  const localOX=ox-px,localOY=oy-py;
  const x1=Math.max(0,Math.floor(localOX/S)),x2=Math.min(W,Math.ceil((localOX+vw)/S));
  const y1=Math.max(0,Math.floor(localOY/S)),y2=Math.min(H,Math.ceil((localOY+vh)/S));
  for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++)drawTile(tiles[y][x],x*S-localOX,y*S-localOY,x,y);
  if(area==='village')drawVillageDetails(localOX,localOY,vw,vh);
  if(area==='route1')drawRoute1Details(localOX,localOY,vw,vh);
  if(area==='town'||area==='garden')drawTownExteriors(localOX,localOY,vw,vh);
  if(area==='homestead'){drawHomesteadConstruction(localOX,localOY);drawFarmGrounds(localOX,localOY);drawEstateExterior(localOX,localOY);drawHomesteadBuildingExteriors(localOX,localOY)}
  drawNaturalDetails(localOX,localOY,vw,vh);
  drawCinematicTrees(localOX,localOY,vw,vh,performance.now());
  drawEnvironmentalDetails(localOX,localOY,vw,vh);
  drawExplorationSites(localOX,localOY);
  drawAtmosphericMotion(localOX,localOY,vw,vh,performance.now());
  if(area==='homestead'&&s.homestead?.owned)drawLivingPastures(localOX,localOY,vw,vh);
  for(const npc of npcs){
   if(npc.indoors)continue;
   const pos=npcVisualPosition(npc),x=pos.x*S+16-localOX,y=pos.y*S+32-localOY;
   if(x< -40||x>vw+40||y< -70||y>vh+40)continue;
   queueWorldActor(y,()=>{drawNpc(npc,x,y,area);drawNpcActivity(npc,x,y,performance.now(),area);});
   if((npc.kind==='gymtrainer'||npc.kind==='routetrainer')&&!s.defeated[npc.id]&&!(npc.alertUntil>performance.now())&&trainerApproach?.p!==npc){
    ctx.fillStyle='#fff1a0';ctx.font='bold 14px monospace';ctx.fillText('!',x-4,y-43);
   }
  }
 }}finally{
 s.area=restore.area;W=restore.w;H=restore.h;tiles=restore.tiles;npcs=restore.npcs;
 villageObstacles=restore.villageObstacles;route1Blocked=restore.route1Blocked;
 interiorObjects=restore.interiorObjects;interiorBlocked=restore.interiorBlocked;
 }
 const moving=(stickActive&&!!stickDirection)||Object.values(held).some(Boolean)||Math.abs(visual.x-s.x)+Math.abs(visual.y-s.y)>.015;
 const step=playerGaitFrame();
 queueWorldActor(worldY+32-oy,()=>sprite(s.gender,worldX+16-ox,worldY+32-oy,s.face,step,1.25));
 finishSceneryLayer();
 drawAtmosphereOverlay(ox-position.x*S,oy-position.y*S,vw,vh);
 drawWeather(vw,vh);
 drawAtmosphereHUD();
}

function region(area,x,y,textLine='',forceFade=false){
 if(worldTransitionBusy)return;
 const previous=s.area,old=OUTDOOR_GRID[previous],next=OUTDOOR_GRID[area];
 // Capture the exact on-screen position before rebuilding either chunk.
 // A rebuild snaps the normal local animation; the saved WORLD position
 // prevents that snap from showing as a jump at a section boundary.
 if(old&&next&&!forceFade)updateVisual();
 const origin=outdoorOrigin(previous);
 const beginX=old?origin.x+visual.x:null,beginY=old?origin.y+visual.y:null;
 const change=()=>{
  doorTransition=null;s.area=area;s.x=x;s.y=y;ensureMapDiscovery();build();save();
  if(old&&next&&!forceFade){
   const targetOrigin=outdoorOrigin(area);
   const endX=targetOrigin.x+x,endY=targetOrigin.y+y;
   const tilesToTravel=Math.hypot(endX-beginX,endY-beginY);
   visual.x=beginX-targetOrigin.x;visual.y=beginY-targetOrigin.y;
   visual.fromX=visual.x;visual.fromY=visual.y;
   visual.toX=x;visual.toY=y;visual.start=performance.now();
   visual.duration=Math.max(movementStepDuration(),Math.min(300,tilesToTravel*movementStepDuration()));
   visual.ready=true;
   // Deliberately do not reset outdoorCamera here.
  }else{
   resetOutdoorCamera();
  }
  // Arrival popups remain disabled.
 };
 if(forceFade||!old||!next)return fadeWorldChange(change);
 change();
}

function move(d){
 if(screen!=='game'||modal||doorTransition||worldTransitionBusy||narratorBlocking()||trainerApproachLocked())return;
 s.face=d;const v=dirs[d],x=s.x+v[0],y=s.y+v[1];
 if(tryOutdoorExit(d,x,y))return;
 const townRoom=townDoorAt(x,y);if(townRoom)return enterTownRoom(townRoom);
 if(TOWN_ROOMS[s.area]&&x===roomExit(s.area)[0]&&y===roomExit(s.area)[1])return exitTownRoom();
 if(s.area==='homestead'&&x===9&&y===9&&s.homestead?.owned){recordWalkingStep();return region('homesteadHome',17,23)}
 if(s.area==='homesteadHome'&&x===17&&y===25){recordWalkingStep();return region('homestead',9,10)}
 if(s.area==='garden'&&d==='up'&&x===24&&(y===10||y===9))return enterGym();
 if(s.area==='gym'&&d==='down'&&x===17&&y>=25){recordWalkingStep();return region('garden',24,12)}
 if(SECRET_AREAS[s.area]&&x===17&&y===25)return exitSecret();
 if(s.area==='cave'&&d==='down'&&y>=H-2&&x>=15&&x<=18){recordWalkingStep();return region('route3',20,2)}
 if(x<0||y<0||x>=W||y>=H)return;
 const door=villageDoorAt(x,y);
 if(door){recordWalkingStep();openVillageDoor(door);return}
 if(npcs.some(p=>(p.x===x&&p.y===y)||(p.walking&&p.fromX===x&&p.fromY===y))||solidAt(x,y))return;
 const t=tiles[y][x];
 beginStep(x,y);s.x=x;s.y=y;frame=(frame+1)%4;recordWalkingStep();
 // Village doors use the shared door interaction and short opening animation.
 if(['lab','home','neighbor'].includes(s.area)&&x===17&&y===25){
  const h=VILLAGE_HOUSES.find(b=>b.kind===s.area);
  return region('village',h.door,h.y+h.h+2);
 }
 if(checkTrainerSight())return;
 if(s.area==='garden'&&!s.rivalPassed&&Math.abs(s.x-24)+Math.abs(s.y-11)<=3)return rivalGardenScene();
 
 const exploration=explorationSiteAt(s.area,s.x,s.y);
 if(exploration&&discoverExplorationSite(exploration))return;
 if((['route1','route2','route3','forest','cave','grotto','cavern'].includes(s.area)&&[T.tall,T.rice,T.stone].includes(t)||s.area==='garden'&&t===T.flower)&&s.introComplete){
 const first=s.area==='route1'&&!s.earlyJourney?.firstEncounter;
 if(first){s.earlyJourney=s.earlyJourney||{};s.earlyJourney.fieldSteps=(s.earlyJourney.fieldSteps||0)+1}
 // Roll independently on each eligible wild tile. Retain the first Route 1
 // encounter guarantee so the opening capture tutorial cannot stall.
 s.wildStepsSinceEncounter=(s.wildStepsSinceEncounter||0)+1;
 const guaranteed=first&&s.earlyJourney.fieldSteps>=5;
 if(guaranteed||Math.random()<wildEncounterChance(s.area))startWild();
}
}

function canInteractAhead(){
 if(!s||screen!=='game'||modal||doorTransition||worldTransitionBusy||trainerApproachLocked())return false;
 if(narratorBlocking())return true; // Interact advances dialogue.
 const offset=dirs[s.face];
 if(!offset)return false;
 const x=s.x+offset[0],y=s.y+offset[1];
 if(npcs.some(p=>p.x===x&&p.y===y))return true;
 if(pastureGateAt(x,y)>=0)return true;
 if(s.area==='homestead'&&s.homestead?.owned&&x===9&&y===9)return true;
 if(s.area==='homesteadHome'&&x===17&&y===25)return true;
 if(villageDoorAt(x,y)||townDoorAt(x,y))return true;
 if(TOWN_ROOMS[s.area]&&x===roomExit(s.area)[0]&&y===roomExit(s.area)[1])return true;
 if(['lab','home','neighbor'].includes(s.area)&&x===17&&y===25)return true;
 if(isInterior(s.area)&&interiorObjectAt(x,y))return true;
 if(route1SiteAt(x,y)||explorationObjectAt(s.area,x,y)||secretEntranceAt(s.area,x,y))return true;
 if(SECRET_AREAS[s.area]&&x===17&&y===25)return true;
 if(s.area==='garden'&&x===24&&y===10)return true;
 if(s.area==='gym'&&x===17&&y===25)return true;
 return false;
}
let lastInteractAvailable=null;
function updateInteractVisibility(){
 const available=canInteractAhead();
 if(available===lastInteractAvailable)return;
 lastInteractAvailable=available;
 const button=$('talk');
 if(!button)return;
 button.classList.toggle('interactable',available);
 button.setAttribute('aria-disabled',String(!available));
 button.setAttribute('aria-label',available?'Interact with the object ahead':'Nothing to interact with ahead');
}
function interact(){
 if(modal||doorTransition||worldTransitionBusy||trainerApproachLocked())return;if(narratorBlocking())return advance();
 const v=dirs[s.face],x=s.x+v[0],y=s.y+v[1],p=npcs.find(q=>q.x===x&&q.y===y);
 const pasture=pastureGateAt(x,y);if(pasture>=0)return greetPasture(pasture);
 if(p)pauseNpcForInteraction(p);
 if(p){if(p.kind==='property-sign')return talkPropertyAgent();if(s.area==='home'&&p.homeX===14&&p.homeY===11&&s.badges>=4)return talkMomProperty();if(p.kind==='sidequest')return questHub(p.id);
 if(p.kind==='researcher')return researcherStoryDialogue();
 if(p.kind==='center')return center();
 if(p.kind==='shop')return shop();
 if(p.kind==='gymtrainer'||p.kind==='routetrainer')return s.defeated[p.id]?say(['Trainer: Good match! Want a rematch?'],()=>rematchMenu(p.id)):say(p.text,()=>startTrainer(p.id));
 if(p.kind==='leader')return s.badges?say(['Gym Leader: Your first badge is well earned.']):!s.defeated.g1||!s.defeated.g2||!s.defeated.g3||!s.puzzles.gate?say(['Gym Leader: Defeat all three trainers and open the garden mechanism first.']):startTrainer('leader');
 if(p.kind==='switch'){if(s.defeated.g1&&s.defeated.g2&&s.defeated.g3){s.puzzles.gate=true;build();save();return notifyWorld(['You activate the garden mechanism. The roots withdraw!'])}return say(['The mechanism is tangled in roots. Defeat all three Gym trainers first.'])}
 return say(npcRoutineDialogue(p))}
 if(s.area==='homestead'&&s.homestead?.owned&&x===9&&y===9)return region('homesteadHome',17,23);
 if(s.area==='homesteadHome'&&x===17&&y===25)return region('homestead',9,10);
 const townRoom=townDoorAt(x,y);if(townRoom)return enterTownRoom(townRoom);
 if(TOWN_ROOMS[s.area]&&x===roomExit(s.area)[0]&&y===roomExit(s.area)[1])return exitTownRoom();
 const door=villageDoorAt(x,y);
 if(door)return openVillageDoor(door);
 if(['lab','home','neighbor'].includes(s.area)&&x===17&&y===25){
  const h=VILLAGE_HOUSES.find(b=>b.kind===s.area);
  return region('village',h.door,h.y+h.h+2);
 }
 const object=interiorObjectAt(x,y);
 if(object&&isInterior(s.area))return inspectInterior(object);
 const secret=secretEntranceAt(s.area,x,y);if(secret)return enterSecret(...secret);
 if(SECRET_AREAS[s.area]&&x===17&&y===25)return exitSecret();
 const extra=explorationObjectAt(s.area,x,y);if(extra)return inspectExplorationObject(extra);
 const routeSite=route1SiteAt(x,y);
 if(routeSite)return inspectRoute1Site(routeSite);
 if(s.area==='garden'&&x===24&&y===10)return beginDoorAnimation('grass-gym',24,10,enterGym);
 if(s.area==='gym'&&x===17&&y===25)return region('garden',24,12);
}
// Homestead ownership is independent of breeding and expansion mechanics.
const HOMESTEAD_PRICE=10000;
const FARM_STAGES=Object.freeze([{name:'Unowned',price:0,pairs:0,incubators:0},{name:'Personal Home',price:10000,pairs:0,incubators:0},{name:'Breeding Farm',price:10000,pairs:1,incubators:2},{name:'Expanded Farm',price:25000,pairs:3,incubators:4},{name:'Advanced Ranch',price:50000,pairs:5,incubators:8}]);
const FARM_PASTURES=[[3,18,8,8],[13,18,8,8],[23,18,8,8],[8,29,8,8],[20,29,8,8]];
function farmStage(){return s?.homestead?.owned?Math.max(1,Math.min(4,Math.floor(Number(s.homestead.stage)||1))):0}
function farmCapacity(){return FARM_STAGES[farmStage()]}
function farmSlots(){
 const home=s.homestead,cap=farmCapacity();
 home.pairs=Array.isArray(home.pairs)?home.pairs:[];home.incubators=Array.isArray(home.incubators)?home.incubators:[];
 while(home.pairs.length<cap.pairs)home.pairs.push(null);
 while(home.incubators.length<cap.incubators)home.incubators.push(null);
 return home;
}
const BREED_STEPS={common:500,uncommon:750,rare:1000,'very rare':1500};
function breedingBase(sp){
 const seen=new Set();while(sp?.evolvesFrom){if(seen.has(sp.speciesId))return null;seen.add(sp.speciesId);sp=speciesRegistry.get(sp.evolvesFrom);if(!sp)return null}return sp;
}
function breedingLegendary(sp){return !!sp&&(sp.types?.some(t=>['Dragon','Primordial','Beast'].includes(t))||sp.habitats?.some(h=>h.rarity==='legendary')||sp.rarity==='legendary')}
function breedingRarity(sp){
 const norm=x=>String(x||'').toLowerCase().replace(/[-_]/g,' ');
 const direct=norm(sp.rarity);if(BREED_STEPS[direct])return direct;
 const known=(sp.habitats||[]).map(h=>norm(h.rarity)).filter(v=>BREED_STEPS[v]);
 return known.sort((a,b)=>BREED_STEPS[a]-BREED_STEPS[b])[0]||'common';
}
function breedingCompatible(a,b){
 if(!a||!b||a===b||!a.speciesId||a.speciesId!==b.speciesId||!['male','female'].includes(a.gender)||!['male','female'].includes(b.gender)||a.gender===b.gender)return false;
 const sp=speciesRegistry.get(a.speciesId),base=breedingBase(sp);
 return !!sp&&!!base&&!breedingLegendary(sp)&&!breedingLegendary(base);
}
function farmAccess(){return s?.area==='homesteadHome'&&!!s.homestead?.owned&&farmCapacity().pairs>0}
function validPasture(i){return Number.isInteger(i)&&i>=0&&i<farmCapacity().pairs}
function assignFarmPair(i,maleIndex,femaleIndex){
 if(!farmAccess()||!validPasture(i)||!Number.isInteger(maleIndex)||!Number.isInteger(femaleIndex)||maleIndex===femaleIndex)return false;
 const home=farmSlots(),old=home.pairs[i];if(old)return false;
 const male=s.storage[maleIndex],female=s.storage[femaleIndex];
 if(male?.gender!=='male'||female?.gender!=='female'||!breedingCompatible(male,female))return false;
 const base=breedingBase(speciesRegistry.get(male.speciesId)),rarity=breedingRarity(base);
 home.pairs[i]={parents:[male,female],progress:0,required:BREED_STEPS[rarity],speciesId:base.speciesId,rarity,egg:null};
 for(const index of [maleIndex,femaleIndex].sort((a,b)=>b-a))s.storage.splice(index,1);
 save();return true;
}
function retrieveFarmParent(i,parentIndex){
 if(!farmAccess()||!validPasture(i)||!Number.isInteger(parentIndex)||parentIndex<0||parentIndex>1)return false;
 const home=farmSlots(),pair=home.pairs[i],p=pair?.parents?.[parentIndex];if(!p)return false;
 s.storage.push(p);pair.parents[parentIndex]=null;pair.progress=0;
 if(!pair.parents.some(Boolean)&&!pair.egg)home.pairs[i]=null;
 save();return true;
}
function replaceFarmParent(i,index){
 if(!farmAccess()||!validPasture(i)||!Number.isInteger(index))return false;
 const pair=farmSlots().pairs[i],p=s.storage[index];if(!pair?.parents||!p)return false;
 const missing=pair.parents.findIndex(x=>!x);if(missing<0||!breedingCompatible(p,pair.parents[1-missing]))return false;
 pair.parents[missing]=s.storage.splice(index,1)[0];pair.progress=0;save();return true;
}
function advanceFarmBreeding(){
 if(!s?.homestead?.owned||!farmCapacity().pairs)return;
 let completed=false;
 for(const pair of farmSlots().pairs.slice(0,farmCapacity().pairs)){
  if(!pair||pair.egg||!breedingCompatible(pair.parents?.[0],pair.parents?.[1]))continue;
  if(!Number.isFinite(pair.required)||pair.required<1)continue;
  pair.progress=Math.min(pair.required,(Number(pair.progress)||0)+1);
  if(pair.progress>=pair.required){
   pair.egg={speciesId:pair.speciesId,rarity:pair.rarity,parents:pair.parents.map(p=>JSON.parse(JSON.stringify(p))),progress:0};
   normalizeEggGenetics(pair.egg);normalizeEggGender(pair.egg);normalizeEggMove(pair.egg);
   completed=true;notifyWorld('An egg is ready to collect at your farm!');
  }
 }
 if(completed)save();
}
// Incubation uses integer units: walking with an egg adds two, farm adds one.
const HATCH_STEPS={common:5000,uncommon:7500,rare:10000,'very rare':15000};
function isEgg(p){return p?.isEgg===true&&!!p.egg}
function normalizeEggGenetics(e){
 if(!e.genetics)e.genetics=inheritGenetics(e.parents);
 e.genetics=Object.fromEntries(COMBAT_STAT_NAMES.map(k=>[k,geneticValue(e.genetics[k])]));return {...e.genetics};
}
function eggRequired(e){return 2*(HATCH_STEPS[e.rarity]||HATCH_STEPS.common)}
function eggUnits(e){return Math.max(0,Math.min(eggRequired(e),Math.floor(Number(e.incubationUnits)||0)))}
function eggReady(e){return !!e&&eggUnits(e)>=eggRequired(e)}
function eggLabel(e){return escapeHtml(e.rarity||'common')+' egg'}
function eggProgress(e,party){const rate=party?2:1;return Math.floor(eggUnits(e)/rate).toLocaleString()+' / '+(eggRequired(e)/rate).toLocaleString()+' steps'}
function eggPartyEntry(e){return {isEgg:true,egg:e,name:'Egg',type:'Egg',types:[],hp:-1,maxHp:0,level:0,moves:[],movePP:{},xp:0}}
function validIncubator(i){return Number.isInteger(i)&&i>=0&&i<farmCapacity().incubators}
function collectFarmEgg(i,destination){
 if(!farmAccess()||!validPasture(i))return false;
 const home=farmSlots(),pair=home.pairs[i];if(!pair?.egg)return false;
 if(destination==='party'){if(s.party.length>=PARTY_LIMIT)return false;s.party.push(eggPartyEntry(pair.egg))}
 else{if(!validIncubator(destination)||home.incubators[destination])return false;home.incubators[destination]=pair.egg}
 pair.egg=null;pair.progress=0;if(!pair.parents?.some(Boolean))home.pairs[i]=null;save();return true;
}
function transferEgg(from,index,to){
 if(!farmAccess()||!Number.isInteger(index))return false;
 const home=farmSlots();
 if(from==='party'){
  if(!isEgg(s.party[index])||!validIncubator(to)||home.incubators[to])return false;
  home.incubators[to]=s.party.splice(index,1)[0].egg;
 }else if(from==='farm'){
  if(!validIncubator(index)||!home.incubators[index]||s.party.length>=PARTY_LIMIT)return false;
  s.party.push(eggPartyEntry(home.incubators[index]));home.incubators[index]=null;
 }else return false;
 save();return true;
}
function advanceEggIncubation(){
 if(!s?.homestead?.owned)return;
 let ready=false;
 const step=(e,rate)=>{if(!e||eggReady(e))return;e.incubationUnits=Math.min(eggRequired(e),eggUnits(e)+rate);if(eggReady(e)){ready=true;notifyWorld(rate===2?'An egg in your party is ready to hatch!':'An egg at your farm is ready to hatch!')}};
 for(const p of s.party)if(isEgg(p))step(p.egg,2);
 for(const e of farmSlots().incubators.slice(0,farmCapacity().incubators))step(e,1);
 if(ready)save();
}
function hatchEgg(from,i){
 if(!Number.isInteger(i)||i<0||battle)return null;
 const party=from==='party';if(!party&&(from!=='farm'||!farmAccess()||!validIncubator(i)))return null;
 const home=farmSlots(),e=party?(isEgg(s.party[i])?s.party[i].egg:null):home.incubators[i];
 if(!eggReady(e)||!speciesRegistry.has(e.speciesId))return null;
 const newborn=critter(e.speciesId,1);
 newborn.gender=normalizeEggGender(e);newborn.genetics=normalizeEggGenetics(e);newborn.hp=newborn.maxHp=combatStat(newborn,'hp');
 newborn.breedingParents=e.parents||[];
 newborn.inheritedMoveId=normalizeEggMove(e);normalizeMoves(newborn);
 if(party)s.party[i]=newborn;else{home.incubators[i]=null;s.storage.push(newborn)}
 const c=collectionData(),stamp=encounterStamp(),id=newborn.speciesId;
 if(!c.seen[id])c.seen[id]={firstArea:stamp.area,firstDay:stamp.day,encounters:0,discoveredBy:'hatching'};
 if(!c.caught[id])c.caught[id]={firstArea:stamp.area,firstDay:stamp.day,firstLevel:1,captures:0,obtainedBy:'hatching'};
 save();return newborn;
}
function hatchEggUI(from,i){
 if(battle)return;
 const e=from==='party'?s.party[i]?.egg:farmSlots().incubators[i];if(!eggReady(e))return;
 open('Egg Hatching','<div class="eggHatchArt">🥚</div><p>Your egg is ready to hatch!</p><button class="btn primary" id="eggHatchConfirm">Hatch Egg</button>');
 $('eggHatchConfirm').onclick=()=>{const p=hatchEgg(from,i);if(!p)return;open('Egg Hatched','<div class="eggHatchArt eggReveal">'+(critterSpriteTag(p,'eggHatchSprite')||symbols[p.type]||'✦')+'</div><h3>'+escapeHtml(p.name)+' · Level 1</h3><p>'+(from==='farm'?'Sent to home storage.':'Joined your party.')+'</p><button class="btn primary" id="eggDone">Continue</button>');$('eggDone').onclick=()=>{close();indexNotice(p.name+' hatched!')}};
}
function recordWalkingStep(){s.steps=(s.steps||0)+1;advanceFarmBreeding();advanceEggIncubation();if(s.steps%10===0)save()}
function canUpgradeFarm(next){return s?.area==='homesteadHome'&&!!s.homestead?.owned&&Number.isInteger(next)&&next===farmStage()+1&&next>=2&&next<=4&&s.money>=FARM_STAGES[next].price}
function purchaseFarmUpgrade(next){
 if(!canUpgradeFarm(next))return false;
 s.money-=FARM_STAGES[next].price;s.homestead.stage=next;farmSlots();outdoorChunks.delete('homestead');build();save();return true;
}
function homesteadConstructionStage(){return Math.max(0,Math.min(4,Math.floor(Number(s?.badges)||0)))}
function homesteadGeometryKey(){return homesteadConstructionStage()+':'+farmStage()}
function migrateHomestead(){
 const old=s.homestead&&typeof s.homestead==='object'?s.homestead:{};
 s.homestead={...old,offered:!!old.offered||!!old.owned,owned:!!old.owned,stage:old.owned?Math.max(1,Math.min(4,Math.floor(Number(old.stage)||1))):0};
 if(s.area==='homesteadHome'&&!s.homestead.owned){s.area='homestead';s.x=17;s.y=13}
 const home=farmSlots();cosmeticState();
 for(const pair of home.pairs){if(pair?.egg){normalizeEggGenetics(pair.egg);normalizeEggGender(pair.egg);normalizeEggMove(pair.egg)}for(const p of pair?.parents||[])if(p){normalizeGenetics(p);normalizeCritterGender(p)}}
 for(const e of home.incubators)if(e){normalizeEggGenetics(e);normalizeEggGender(e);normalizeEggMove(e)}
 for(const p of s.party||[])if(isEgg(p)){normalizeEggGenetics(p.egg);normalizeEggGender(p.egg);normalizeEggMove(p.egg)}
}
function talkMomProperty(){
 if(s.homestead.owned)return say(['Mom: I hope you are enjoying your new home!']);
 return say(['Mom: I have some exciting news! The new property west of the village is finished and available to purchase.','Mom: It costs 10,000. Speak with the caretaker there if you would like a place of your own.'],()=>{s.homestead.offered=true;save()});
}
function canBuyHomestead(){return homesteadConstructionStage()===4&&s.homestead?.offered&&!s.homestead.owned&&s.money>=HOMESTEAD_PRICE}
function purchaseHomestead(){
 if(!canBuyHomestead())return false;
 s.money-=HOMESTEAD_PRICE;s.homestead.owned=true;s.homestead.stage=1;
 s.discoveredAreas.homestead=true;outdoorChunks.delete('homestead');build();save();
 return true;
}
function talkPropertyAgent(){
 if(s.homestead?.owned)return say(['Caretaker: Enjoy your new home!']);
 if(homesteadConstructionStage()<4||!s.homestead?.offered)return say(['Caretaker: The work here is finished. Have a pleasant day.']);
 return say(['Caretaker: Your mother mentioned you might be interested in this property.'],()=>{
  open('Purchase Property','<p>Personal Home — 10,000 money.</p><p>Available funds: '+s.money+'</p><button class="btn primary" id="buyEstate" '+(canBuyHomestead()?'':'disabled')+'>Purchase Home</button> <button class="btn" id="cancelEstate">Not now</button>');
  $('cancelEstate').onclick=close;
  $('buyEstate').onclick=()=>{if(!purchaseHomestead())return;close();indexNotice('Personal Home purchased. Fast Travel unlocked!')};
 });
}
const HOMESTEAD_COSMETICS=[{"id":"style-1","slot":"floor","group":"Interior","name":"Cedar flooring","stage":1,"price":800,"color":"#a67e57"},{"id":"style-2","slot":"floor","group":"Interior","name":"Dark oak flooring","stage":1,"price":1200,"color":"#62493d"},{"id":"style-3","slot":"wall","group":"Interior","name":"Sage wallpaper","stage":1,"price":650,"color":"#83977e"},{"id":"style-4","slot":"wall","group":"Interior","name":"Cream wallpaper","stage":1,"price":900,"color":"#d5c29e"},{"id":"style-5","slot":"bed","group":"Interior","name":"Blue bedding","stage":1,"price":500,"color":"#638cb0"},{"id":"style-6","slot":"bed","group":"Interior","name":"Crimson bedding","stage":1,"price":850,"color":"#a65e61"},{"id":"style-7","slot":"table","group":"Interior","name":"Walnut furniture","stage":1,"price":1000,"color":"#745343"},{"id":"style-8","slot":"table","group":"Interior","name":"Ivory furniture","stage":1,"price":1500,"color":"#d2c2a2"},{"id":"style-9","slot":"rug","group":"Interior","name":"Woven blue rug","stage":1,"price":750,"color":"#647c9d"},{"id":"style-10","slot":"rug","group":"Interior","name":"Floral rug","stage":1,"price":1250,"color":"#a65e79"},{"id":"style-11","slot":"lights","group":"Interior","name":"Amber lamps","stage":1,"price":650,"color":"#ffc47d"},{"id":"style-12","slot":"lights","group":"Interior","name":"Jade lanterns","stage":1,"price":1000,"color":"#a5dec4"},{"id":"style-13","slot":"plants","group":"Interior","name":"Potted greenery","stage":1,"price":500,"color":"#5d925a"},{"id":"style-14","slot":"fireplace","group":"Interior","name":"Stone fireplace","stage":2,"price":2000,"color":"#8b8c87"},{"id":"style-15","slot":"kitchen","group":"Interior","name":"Kitchen display","stage":2,"price":1800,"color":"#b88d61"},{"id":"style-16","slot":"trophy","group":"Interior","name":"Trophy display","stage":3,"price":2500,"color":"#ddbb66"},{"id":"style-17","slot":"roof","group":"Exterior","name":"Terracotta roof","stage":1,"price":900,"color":"#ae6147"},{"id":"style-18","slot":"roof","group":"Exterior","name":"Slate roof","stage":1,"price":1300,"color":"#536579"},{"id":"style-19","slot":"house","group":"Exterior","name":"Cream siding","stage":1,"price":800,"color":"#e5d1a5"},{"id":"style-20","slot":"house","group":"Exterior","name":"Sage siding","stage":1,"price":1200,"color":"#8caa84"},{"id":"style-21","slot":"porch","group":"Exterior","name":"Timber porch","stage":1,"price":1500,"color":"#b08b60"},{"id":"style-22","slot":"path","group":"Exterior","name":"Flagstone paths","stage":1,"price":1000,"color":"#a9a49a"},{"id":"style-23","slot":"path","group":"Exterior","name":"Brick paths","stage":1,"price":1400,"color":"#aa795e"},{"id":"style-24","slot":"garden","group":"Exterior","name":"Flower garden","stage":1,"price":800,"color":"#d489aa"},{"id":"style-25","slot":"garden","group":"Exterior","name":"Sunflower garden","stage":1,"price":1200,"color":"#e2b83d"},{"id":"style-26","slot":"water","group":"Exterior","name":"Garden pond","stage":2,"price":2200,"color":"#578b9c"},{"id":"style-27","slot":"water","group":"Exterior","name":"Stone fountain","stage":3,"price":3500,"color":"#a0bfc9"},{"id":"style-28","slot":"lantern","group":"Exterior","name":"Path lanterns","stage":1,"price":1000,"color":"#f6c36d"},{"id":"style-29","slot":"landscape","group":"Exterior","name":"Ornamental shrubs","stage":2,"price":1500,"color":"#759e6b"},{"id":"style-30","slot":"barn","group":"Farm","name":"Red barn","stage":2,"price":1500,"color":"#a45246"},{"id":"style-31","slot":"barn","group":"Farm","name":"Blue barn","stage":3,"price":2000,"color":"#536d8c"},{"id":"style-32","slot":"fence","group":"Farm","name":"White fences","stage":2,"price":1000,"color":"#e7e1cf"},{"id":"style-33","slot":"fence","group":"Farm","name":"Dark timber fences","stage":2,"price":1200,"color":"#62483c"},{"id":"style-34","slot":"hay","group":"Farm","name":"Covered hay rack","stage":2,"price":750,"color":"#d3ad60"},{"id":"style-35","slot":"trough","group":"Farm","name":"Stone troughs","stage":2,"price":1000,"color":"#929c9b"},{"id":"style-36","slot":"nest","group":"Farm","name":"Nesting shelters","stage":3,"price":2200,"color":"#947150"},{"id":"style-37","slot":"windmill","group":"Farm","name":"Decorative windmill","stage":4,"price":5000,"color":"#cbbba0"},{"id":"style-38","slot":"field","group":"Farm","name":"Decorative flower field","stage":4,"price":3000,"color":"#d2a45c"}];
function cosmeticState(){
 const home=s.homestead;
 if(!home.cosmetics||typeof home.cosmetics!=='object'||Array.isArray(home.cosmetics))home.cosmetics={};
 const c=home.cosmetics;
 if(!Array.isArray(c.owned))c.owned=[];
 if(!c.active||typeof c.active!=='object'||Array.isArray(c.active))c.active={};
 return c;
}
function cosmeticItem(id){return HOMESTEAD_COSMETICS.find(v=>v.id===id)}
function activeCosmetic(slot){
 const c=s?.homestead?.cosmetics;if(!s?.homestead?.owned||!c)return null;
 const item=cosmeticItem(c.active?.[slot]);
 return item&&item.slot===slot&&item.stage<=farmStage()&&c.owned?.includes(item.id)?item:null;
}
function cosmeticColor(slot,fallback){return activeCosmetic(slot)?.color||fallback}
function canDecorate(){return s?.area==='homesteadHome'&&!!s.homestead?.owned}
function applyCosmetic(id){
 if(!canDecorate())return false;
 const item=cosmeticItem(id),c=cosmeticState();
 if(!item||item.stage>farmStage())return false;
 if(!c.owned.includes(id)){
  if(s.money<item.price)return false;
  s.money-=item.price;c.owned.push(id);
 }
 c.active[item.slot]=id;save();return true;
}
function resetCosmetic(slot){
 if(!canDecorate()||!HOMESTEAD_COSMETICS.some(i=>i.slot===slot))return false;
 delete cosmeticState().active[slot];save();return true;
}
function homeDecorations(group='Interior'){
 if(!canDecorate()||!['Interior','Exterior','Farm'].includes(group))return;
 const c=cosmeticState(),items=HOMESTEAD_COSMETICS.filter(i=>i.group===group);
 const rows=items.map(i=>{
  const owned=c.owned.includes(i.id),selected=c.active[i.slot]===i.id,locked=i.stage>farmStage();
  return '<div class="centerPartyRow decorRow"><span class="decorSwatch" style="background:'+i.color+'"></span><b>'+i.name+'</b><small>'+ (locked?'Requires '+FARM_STAGES[i.stage].name:selected?'Selected':owned?'Owned · free to switch':i.price.toLocaleString()+' money')+'</small><button class="btn" data-decor="'+i.id+'" '+(locked||selected||(!owned&&s.money<i.price)?'disabled':'')+'>'+(selected?'Equipped':owned?'Apply':'Purchase')+'</button>'+(selected?'<button class="btn" data-decor-reset="'+i.slot+'">Default</button>':'')+'</div>';
 }).join('');
 open('Property Customization','<p>Money: '+s.money.toLocaleString()+' · '+c.owned.length+' / '+HOMESTEAD_COSMETICS.length+' unlocked</p><div class="options">'+['Interior','Exterior','Farm'].map(v=>'<button class="btn '+(v===group?'primary':'')+'" data-decor-group="'+v+'">'+v+'</button>').join('')+'</div>'+rows+'<button class="btn" id="estateBack">Back</button>');
 $('estateBack').onclick=homesteadTerminal;
 document.querySelectorAll('[data-decor-group]').forEach(el=>el.onclick=()=>homeDecorations(el.dataset.decorGroup));
 document.querySelectorAll('[data-decor-reset]').forEach(el=>el.onclick=()=>{if(resetCosmetic(el.dataset.decorReset))homeDecorations(group)});
 document.querySelectorAll('[data-decor]').forEach(el=>el.onclick=()=>{
  const i=cosmeticItem(el.dataset.decor);if(!i||i.stage>farmStage())return;
  if(c.owned.includes(i.id)){if(applyCosmetic(i.id))homeDecorations(group);return}
  open('Confirm Decoration','<h3>'+i.name+'</h3><p>Permanent cosmetic unlock: '+i.price.toLocaleString()+' money. Switching owned styles is free.</p><button class="btn primary" id="decorConfirm">Purchase and Apply</button><button class="btn" id="estateBack">Cancel</button>');
  $('estateBack').onclick=()=>homeDecorations(group);
  $('decorConfirm').onclick=()=>{if(applyCosmetic(i.id)){indexNotice(i.name+' unlocked and applied.');homeDecorations(group)}};
 });
}
function homesteadTerminal(){
 if(!s.homestead?.owned||s.area!=='homesteadHome')return;
 const current=farmStage(),cap=farmCapacity(),next=FARM_STAGES[current+1];farmSlots();
 const rows=FARM_STAGES.slice(1).map((p,i)=>'<div class="centerPartyRow"><b>'+p.name+'</b> · '+p.pairs+' pairs / '+p.incubators+' incubators · '+(i+1<=current?'Owned':p.price.toLocaleString()+' money')+'</div>').join('');
 open('Home Terminal','<h3>'+cap.name+'</h3><p>Money: '+s.money.toLocaleString()+'</p>'+rows+'<div class="options">'+(next?'<button class="btn primary" id="estateExpand">Upgrade to '+next.name+'</button>':'<p>All expansions purchased.</p>')+(cap.pairs?'<button class="btn" id="estatePairs">Breeding Pairs</button><button class="btn" id="estateIncubators">Incubators</button>':'')+'<button class="btn" id="estateDecor">Customize Property</button><button class="btn" id="estateStorage">Home Storage</button><button class="btn" id="estateClose">Close</button></div>');
 if($('estateExpand'))$('estateExpand').onclick=()=>confirmFarmUpgrade(current+1);
 if($('estatePairs'))$('estatePairs').onclick=()=>farmManagement('pairs');
 if($('estateIncubators'))$('estateIncubators').onclick=()=>farmManagement('incubators');
 $('estateDecor').onclick=()=>homeDecorations();$('estateStorage').onclick=homesteadStorage;$('estateClose').onclick=close;
}
function confirmFarmUpgrade(next){
 if(!s.homestead?.owned||s.area!=='homesteadHome'||next!==farmStage()+1||!FARM_STAGES[next])return;
 const p=FARM_STAGES[next];
 open('Confirm Expansion','<h3>'+p.name+'</h3><p>Cost: '+p.price.toLocaleString()+' money</p><p>Available: '+s.money.toLocaleString()+'</p><p>'+p.pairs+' pairs · '+p.incubators+' incubators</p><button class="btn primary" id="estateConfirm" '+(canUpgradeFarm(next)?'':'disabled')+'>Purchase Expansion</button> <button class="btn" id="estateBack">Back</button>');
 $('estateBack').onclick=homesteadTerminal;$('estateConfirm').onclick=()=>{if(!purchaseFarmUpgrade(next))return;close();indexNotice(p.name+' expansion complete!')};
}
function farmParentName(p){return p?escapeHtml(p.name||p.type)+critterGenderLabel(p)+' · Lv '+p.level+geneticsHTML(p)+inheritedMoveHTML(p):'Empty'}
function farmManagement(kind){
 if(!farmAccess()||!['pairs','incubators'].includes(kind))return;
 const count=farmCapacity()[kind],slots=farmSlots()[kind];
 if(!count)return homesteadTerminal();
 const rows=Array.from({length:count},(_,i)=>{
  const p=slots[i];
  if(kind==='incubators')return '<div class="centerPartyRow">Incubator '+(i+1)+' · '+(p?eggLabel(p)+' · '+eggProgress(p,false)+(eggReady(p)?' <button class="btn" data-farm-hatch="'+i+'">Hatch</button>':'')+' <button class="btn" data-farm-to-party="'+i+'" '+(s.party.length>=PARTY_LIMIT?'disabled':'')+'>Move to Party</button>':'Empty')+'</div>';
  if(!p)return '<div class="centerPartyRow"><b>Pasture '+(i+1)+'</b> · Empty <button class="btn" data-farm-assign="'+i+'">Assign Parents</button></div>';
  return '<div class="centerPartyRow"><b>Pasture '+(i+1)+'</b><p>'+farmParentName(p.parents?.[0])+' / '+farmParentName(p.parents?.[1])+'</p><p>'+(p.egg?'Egg ready — breeding paused':p.parents?.every(Boolean)?(p.progress||0)+' / '+p.required+' steps':'Waiting for compatible parent')+'</p>'
  +[0,1].map(j=>p.parents?.[j]?'<button class="btn" data-farm-return="'+i+':'+j+'">Return '+(j===0?'male':'female')+' to storage</button>':'').join('')+(p.egg?'<button class="btn primary" data-collect-egg="'+i+'">Collect Egg</button>':'')+(p.parents?.filter(Boolean).length===1?'<button class="btn" data-farm-replace="'+i+'">Assign replacement</button>':'')+'</div>';
 }).join('');
 open(kind==='pairs'?'Breeding Pairs':'Farm Incubators','<p>'+slots.slice(0,count).filter(Boolean).length+' / '+count+' occupied</p>'+rows+(kind==='pairs'?'<p>Parents must be the same species and opposite genders. Select from shared home storage. Completed eggs remain safe until collected.</p>':'<p>Farm eggs incubate at half party speed.</p>'+s.party.map((p,i)=>isEgg(p)?'<div class="centerPartyRow">Party slot '+(i+1)+' · '+eggProgress(p.egg,true)+' <button class="btn" data-party-to-farm="'+i+'">Move to Incubator</button></div>':'').join('')+'')+'<button class="btn" id="estateBack">Back</button>');
 $('estateBack').onclick=homesteadTerminal;
 document.querySelectorAll('[data-collect-egg]').forEach(el=>el.onclick=()=>eggDestination('collect',Number(el.dataset.collectEgg)));
 document.querySelectorAll('[data-party-to-farm]').forEach(el=>el.onclick=()=>eggDestination('transfer',Number(el.dataset.partyToFarm)));
 document.querySelectorAll('[data-farm-to-party]').forEach(el=>el.onclick=()=>{if(transferEgg('farm',Number(el.dataset.farmToParty)))farmManagement('incubators')});
 document.querySelectorAll('[data-farm-hatch]').forEach(el=>el.onclick=()=>hatchEggUI('farm',Number(el.dataset.farmHatch)));
 document.querySelectorAll('[data-farm-assign]').forEach(el=>el.onclick=()=>farmChooseParents(Number(el.dataset.farmAssign)));
 document.querySelectorAll('[data-farm-replace]').forEach(el=>el.onclick=()=>farmChooseReplacement(Number(el.dataset.farmReplace)));
 document.querySelectorAll('[data-farm-return]').forEach(el=>el.onclick=()=>{const [i,j]=el.dataset.farmReturn.split(':').map(Number);open('Return Parent','<p>Returning a parent cancels unfinished breeding progress. A completed egg is retained.</p><button class="btn primary" id="farmReturnConfirm">Return Parent</button><button class="btn" id="estateBack">Cancel</button>');$('estateBack').onclick=()=>farmManagement('pairs');$('farmReturnConfirm').onclick=()=>{if(retrieveFarmParent(i,j)){indexNotice('Parent returned to home storage.');farmManagement('pairs')}}});
}
function eggDestination(mode,i){
 if(!farmAccess())return;
 const slots=farmSlots().incubators.slice(0,farmCapacity().incubators);
 open('Choose Egg Destination','<p>Incubation progress is preserved when transferring.</p>'+(mode==='collect'?'<button class="btn" data-egg-dest="party" '+(s.party.length>=PARTY_LIMIT?'disabled':'')+'>Party</button>':'')+slots.map((e,j)=>'<button class="btn" data-egg-dest="'+j+'" '+(e?'disabled':'')+'>Incubator '+(j+1)+(e?' (occupied)':'')+'</button>').join('')+'<button class="btn" id="estateBack">Back</button>');
 $('estateBack').onclick=()=>farmManagement(mode==='collect'?'pairs':'incubators');
 document.querySelectorAll('[data-egg-dest]').forEach(el=>el.onclick=()=>{const dest=el.dataset.eggDest==='party'?'party':Number(el.dataset.eggDest);if(mode==='collect'?collectFarmEgg(i,dest):transferEgg('party',i,dest)){indexNotice('Egg moved to '+(dest==='party'?'party':'farm incubator')+'.');farmManagement(mode==='collect'?'pairs':'incubators')}});
}
function farmChooseParents(i,maleIndex=null){
 if(!farmAccess()||!validPasture(i)||farmSlots().pairs[i])return;
 const candidates=s.storage.map((p,j)=>({p,j})).filter(({p,j})=>maleIndex===null?p.gender==='male'&&s.storage.some(q=>q.gender==='female'&&breedingCompatible(p,q)):p.gender==='female'&&breedingCompatible(s.storage[maleIndex],p));
 open(maleIndex===null?'Choose Male Parent':'Choose Female Parent','<p>Select a compatible Critter from home storage.</p>'+ (candidates.map(({p,j})=>'<div class="centerPartyRow">'+farmParentName(p)+' <button class="btn" data-farm-parent="'+j+'">Select</button></div>').join('')||'<p>No compatible parents in storage. Transfer Critters to storage at a Critter Center.</p>')+'<button class="btn" id="estateBack">Back</button>');
 $('estateBack').onclick=()=>maleIndex===null?farmManagement('pairs'):farmChooseParents(i);
 document.querySelectorAll('[data-farm-parent]').forEach(el=>el.onclick=()=>{const j=Number(el.dataset.farmParent);if(maleIndex===null)return farmChooseParents(i,j);if(assignFarmPair(i,maleIndex,j)){indexNotice('Breeding pair assigned. Walk or run to produce an egg.');farmManagement('pairs')}});
}
function farmChooseReplacement(i){
 if(!farmAccess()||!validPasture(i))return;
 const pair=farmSlots().pairs[i];if(!pair?.parents||pair.parents.filter(Boolean).length!==1)return;
 const existing=pair.parents.find(Boolean);
 const candidates=s.storage.map((p,j)=>({p,j})).filter(({p})=>breedingCompatible(existing,p));
 open('Choose Replacement Parent',(candidates.map(({p,j})=>'<div class="centerPartyRow">'+farmParentName(p)+' <button class="btn" data-farm-replacement="'+j+'">Select</button></div>').join('')||'<p>No compatible Critters in home storage.</p>')+'<button class="btn" id="estateBack">Back</button>');
 $('estateBack').onclick=()=>farmManagement('pairs');
 document.querySelectorAll('[data-farm-replacement]').forEach(el=>el.onclick=()=>{if(replaceFarmParent(i,Number(el.dataset.farmReplacement))){indexNotice('Replacement parent assigned.');farmManagement('pairs')}});
}
function homesteadStorage(){
 if(!s.homestead?.owned)return;
 // Shared storage is viewable at home; party maintenance still requires a Center.
 open('Home Storage','<p>Stored Critters: '+s.storage.length+'</p>'+s.storage.map(p=>'<div class="centerPartyRow">'+escapeHtml(p.name||p.type)+' · Lv '+p.level+geneticsHTML(p)+inheritedMoveHTML(p)+'</div>').join('')+'<p>Visit a Critter Center to change your active party.</p><button class="btn" id="estateBack">Back</button>');
 $('estateBack').onclick=homesteadTerminal;
}
function rematchMenu(id){open('Trainer Rematch','<p>Challenge this trainer again? Their Critters may be stronger.</p><button class="btn primary" id="yesRematch">Battle</button> <button class="btn" id="noRematch">Not now</button>');$('yesRematch').onclick=()=>{close();startTrainer(id)};$('noRematch').onclick=close}
function enterGym(){if(!s.rivalPassed)return rivalGardenScene();return region('gym',17,23,'Grass Gym — Find all three trainers in the hedge maze.')}
function open(title,body){
 suspendWorldNotice();releaseMovement();modal=true;
 const host=$('shade'),panel=host.querySelector('.modal'),watch=body.includes('class="watchShell"');
 const preserve=watch&&panel&&host.classList.contains('show')&&panel.dataset?.screenMode==='watch';
 const previous=preserve?panel.scrollTop:0;
 $('modalTitle').textContent=title;$('modalBody').innerHTML=body;host.classList.add('show');
 if(panel){panel.dataset.screenMode=watch?'watch':'other';panel.scrollTop=preserve?previous:0}
}
function close(){if(battle)return;modal=false;$('shade').classList.remove('show');$('close').hidden=false;releaseMovement();pumpWorldNarrator()}
function firstAlive(){return s.party.findIndex(p=>!isEgg(p)&&p.hp>0)}
function lead(){return s.party[firstAlive()]}
// Phase 1 battle-stat engine: every Critter has an independent six-stat profile.
// Archived/placeholder Critters get stable neutral defaults, without altering their
// original HP or the established 15-type strengths and weaknesses.
const BATTLE_BASE_DEFAULT={hp:20,attack:13,defense:13,specialAttack:13,specialDefense:13,speed:13};
const COMBAT_STAT_NAMES=['hp','attack','defense','specialAttack','specialDefense','speed'];
function safeBaseStat(v,defaultValue){
 return Number.isFinite(v)&&v>0?Math.min(250,Math.max(1,v)):defaultValue;
}
function statProfile(p){
 const fromSpecies=speciesFor(p)?.baseStats;
 const base=p?.baseStats||fromSpecies||{};
 return Object.fromEntries(COMBAT_STAT_NAMES.map(key=>[key,safeBaseStat(base[key],BATTLE_BASE_DEFAULT[key])]));
}
// Genetics remain separate from species base stats and survive evolution.
const GENETIC_CAP=10;
function geneticValue(value){return Math.max(0,Math.min(GENETIC_CAP,Math.round(Number(value)||0)))}
function normalizeGenetics(p){
 if(!p||isEgg(p))return p;
 p.genetics=Object.fromEntries(COMBAT_STAT_NAMES.map(k=>[k,geneticValue(p.genetics?.[k])]));return p;
}
function inheritGenetics(parents,rng=Math.random){
 const [a,b]=parents||[];
 return Object.fromEntries(COMBAT_STAT_NAMES.map(k=>{
  const av=geneticValue(a?.genetics?.[k]),bv=geneticValue(b?.genetics?.[k]);
  const variation=Math.floor(Math.max(0,Math.min(.999999,rng()))*5)-2;
  return [k,geneticValue((av+bv)/2+variation)];
 }));
}
function geneticsHTML(p){
 if(!p||isEgg(p))return '';
 const labels={hp:'HP',attack:'ATK',defense:'DEF',specialAttack:'S.ATK',specialDefense:'S.DEF',speed:'SPD'};
 return '<div class="geneticsStats"><strong>Genetics · max +10% each</strong><div>'+COMBAT_STAT_NAMES.map(k=>'<span>'+labels[k]+' <b>+'+geneticValue(p.genetics?.[k])+'%</b></span>').join('')+'</div></div>';
}
function combatStat(p,key){
 const profile=statProfile(p),lvl=Math.max(1,Number.isFinite(p?.level)?p.level:1);
 const normal=Math.max(1,Math.round(profile[key]+(lvl-1)*(key==='hp'?4:1.25)));
 return normal+Math.floor(normal*geneticValue(p?.genetics?.[key])/100);
}
function syncGeneticHP(p){
 if(!p||isEgg(p)||!geneticValue(p.genetics?.hp)||!speciesFor(p))return;
 const max=combatStat(p,'hp'),oldMax=Number(p.maxHp)||max;
 p.hp=p.hp<=0?0:Math.max(1,Math.min(max,max-Math.max(0,oldMax-p.hp)));p.maxHp=max;
}
function defendTypes(p){
 // A second type is considered only if it is a valid distinct elemental type.
 const arr=Array.isArray(p)?p:(Array.isArray(p?.types)&&p.types.length?p.types:[p?.type]);
 const chosen=[];
 for(const t of arr)if(isKnownType(t)&&!chosen.includes(t)&&chosen.length<2)chosen.push(t);
 return chosen.length?chosen:['Grass']; // unavailable old-save metadata remains playable
}
function typeMatchup(atk,def){
 if(!isKnownType(atk))return 1;
 if(strengths[atk]?.includes(def))return 2;
 if(strengths[def]?.includes(atk))return .5;
 return 1;
}
function mult(atk,def){
 // Classic combination: 2×2=4; 2×½=1; ½×½=¼.
 return defendTypes(def).reduce((value,type)=>value*typeMatchup(atk,type),1);
}
function statDamageRatio(attacker,defender,offenseKey,defenseKey){
 // Level-one reference stats matter immediately; gains are gradual per level.
 // sqrt dampens extreme early-game stat differences without discarding them.
 const atk=combatStat(attacker,offenseKey),def=combatStat(defender,defenseKey);
 return Math.max(.4,Math.min(2.5,Math.sqrt(atk/Math.max(1,def))));
}
function combatSpeed(side,index){
 const actor=getCombatant(side,index);
 return actor?combatStat(actor,'speed')*statFactor(side,index,'speed'):0;
}
function refreshSpeciesMetadata(p){
 if(!p||isEgg(p))return p;
 normalizeGenetics(p);
 normalizeCritterGender(p);
 const species=speciesFor(p);
 if(species){
  p.type=species.types[0];
  p.types=species.types.slice(0,2);
  p.baseStats={...species.baseStats};
  p.name=species.name;
  syncGeneticHP(p);
 }else{
  p.types=defendTypes(p);
  p.baseStats={...statProfile(p)};
 }
 return p;
}

function activeModifier(side){let value=0;for(const m of s.installed){if(!m)continue;if(m==='Power Coil')value+=side==='ally'?0.12:0;if(m==='Guard Plate')value+=side==='enemy'?-0.1:0;if(m==='Weakening Field')value+=side==='ally'?0.1:0}return Math.max(0.5,1+value)}

// Phase 4 — Index is a read-only wrist device outside a Critter Center.
// Party swapping and module configuration remain Center-exclusive.
let indexTab='clock',indexSelection=0;
let playerIndexSection='bag',encyclopediaSection='critters';
const INDEX_TABS=[['clock','Index'],['player','Player'],['encyclopedia','Encyclopedia'],['settings','Settings']];
const INDEX_SECTIONS=[['clock','Critters'],['tools','Tools'],['map','Map']];
let indexMainSection='clock',settingsSavedMessage=false;
const PLAYER_INDEX_SECTIONS=[['bag','Bag'],['records','Records'],['trainer','Trainer'],['wardrobe','Wardrobe']];
const TRAINER_OUTFITS=[{id:'original',name:'Original',color:null},{id:'explorer',name:'Forest Explorer',color:'#54865b'},{id:'researcher',name:'Field Researcher',color:'#577fa8'},{id:'challenger',name:'Gym Challenger',color:'#ad594b'},{id:'veteran',name:'Veteran Traveler',color:'#8a729c'},{id:'caretaker',name:'Community Helper',color:'#c4a05d'}];
const TRAINER_ACHIEVEMENTS=[
 {id:'first-catch',name:'First Capture',goal:1,metric:'captures',credits:50},
 {id:'collector',name:'Field Researcher',goal:10,metric:'unique',credits:150,outfit:'researcher'},
 {id:'explorer',name:'Forest Explorer',goal:5,metric:'finds',credits:100,outfit:'explorer'},
 {id:'badge',name:'Gym Challenger',goal:1,metric:'badges',credits:150,outfit:'challenger'},
 {id:'traveler',name:'Veteran Traveler',goal:2000,metric:'steps',credits:150,outfit:'veteran'},
 {id:'helper',name:'Community Helper',goal:5,metric:'quests',credits:200,outfit:'caretaker'},
 {id:'trainer',name:'Battle Tested',goal:10,metric:'wins',credits:200},
 {id:'estate',name:'A Place of Your Own',goal:1,metric:'estate',credits:250,decor:'style-9'}
];
function normalizeTrainerProgress(){
 const p=s.trainerProgress&&typeof s.trainerProgress==='object'&&!Array.isArray(s.trainerProgress)?s.trainerProgress:{};
 s.trainerProgress=p;
 p.claimed=Array.isArray(p.claimed)?p.claimed.filter(id=>TRAINER_ACHIEVEMENTS.some(a=>a.id===id)):[];
 p.outfits=Array.isArray(p.outfits)?p.outfits.filter(id=>TRAINER_OUTFITS.some(o=>o.id===id)):['original'];
 if(!p.outfits.includes('original'))p.outfits.push('original');
 if(!p.outfits.includes(p.outfit))p.outfit='original';
 p.wins=Number.isFinite(p.wins)?Math.max(0,Math.floor(p.wins)):Object.keys(s.defeated||{}).filter(id=>s.defeated[id]&&id!=='tutorial').length;
 p.losses=Math.max(0,Math.floor(Number(p.losses)||0));
 p.indexStyle=p.indexStyle==='jade'||p.indexStyle==='slate'?p.indexStyle:'classic';
}
function trainerMetrics(){return {captures:s.captureCount||0,unique:collectionCounts().captured,finds:allExplorationFinds().filter(o=>s.discoveries?.[o.id]).length,badges:s.badges||0,steps:s.steps||0,quests:SIDE_QUESTS.filter(q=>s.sideQuests?.[q.id]?.status==='complete').length,wins:s.trainerProgress.wins,estate:s.homestead?.owned?1:0}}
function trainerProfile(){
 const m=trainerMetrics(),p=s.trainerProgress;
 return '<div class="watchSectionTitle">Trainer profile · '+escapeHtml(s.name)+'</div><div class="watchMetrics">'+[['Steps',m.steps],['Trainer wins',m.wins],['Battle losses',p.losses],['Quests',m.quests],['Badges',m.badges],['Discoveries',m.finds]].map(([k,v])=>'<div><strong>'+v.toLocaleString()+'</strong><span>'+k+'</span></div>').join('')+'</div><div class="watchSectionTitle">Achievements</div>'+TRAINER_ACHIEVEMENTS.map(a=>'<div class="watchToolCard"><strong>'+a.name+'</strong><p>'+Math.min(a.goal,m[a.metric])+' / '+a.goal+' · '+a.metric+' · Reward '+a.credits+' money'+(a.outfit?' + outfit':a.decor?' + home decoration':'')+'</p>'+(p.claimed.includes(a.id)?'<span>Claimed</span>':'<button class="btn" data-achievement="'+a.id+'" '+(m[a.metric]<a.goal?'disabled':'')+'>Claim reward</button>')+'</div>').join('');
}
function claimTrainerAchievement(id){
 const a=TRAINER_ACHIEVEMENTS.find(a=>a.id===id),p=s.trainerProgress;
 if(!a||p.claimed.includes(id)||trainerMetrics()[a.metric]<a.goal)return;
 p.claimed.push(id);s.money+=a.credits;
 if(a.outfit&&!p.outfits.includes(a.outfit))p.outfits.push(a.outfit);
 if(a.decor&&s.homestead?.owned){const c=cosmeticState();if(!c.owned.includes(a.decor))c.owned.push(a.decor)}
 save();renderIndex();
}
function trainerWardrobe(){
 const p=s.trainerProgress;
 return '<div class="watchSectionTitle">Collectible outfits</div><p class="muted">Unlock cosmetic travel colors through achievements. No battle bonuses.</p>'+TRAINER_OUTFITS.map(o=>'<div class="watchToolCard"><strong>'+o.name+'</strong><p>'+(o.color?'<span style="display:inline-block;width:18px;height:18px;background:'+o.color+';border:1px solid #eee;border-radius:4px"></span> ':'')+(p.outfit===o.id?'Equipped':p.outfits.includes(o.id)?'Owned':'Achievement reward')+'</p><button class="btn" data-outfit="'+o.id+'" '+(!p.outfits.includes(o.id)||p.outfit===o.id?'disabled':'')+'>Equip</button></div>').join('');
}
function trainerOutfitColor(){return TRAINER_OUTFITS.find(o=>o.id===s?.trainerProgress?.outfit)?.color||null}

const ENCYCLOPEDIA_SECTIONS=[['critters','Critters'],['moves','Moves']];
function indexSectionNav(sections,selected,attribute,label){
 return '<nav class="watchInnerTabs" aria-label="'+label+'">'
  +sections.map(([key,title])=>'<button type="button" class="watchInnerTab '+(selected===key?'selected':'')+'" '+attribute+'="'+key+'" aria-pressed="'+(selected===key)+'">'+title+'</button>').join('')
  +'</nav>';
}
function indexPlayer(){
 return '<div class="watchPlayerMoney"><span>Money</span><strong>◇ '+s.money+'</strong></div>'
  +indexSectionNav(PLAYER_INDEX_SECTIONS,playerIndexSection,'data-player-section','Player sections')
  +(playerIndexSection==='records'?indexRecords():playerIndexSection==='trainer'?trainerProfile():playerIndexSection==='wardrobe'?trainerWardrobe():indexItems());
}
function indexEncyclopedia(){
 return indexSectionNav(ENCYCLOPEDIA_SECTIONS,encyclopediaSection,'data-encyclopedia-section','Encyclopedia sections')
  +(encyclopediaSection==='moves'?indexMoves():indexCritters());
}
function indexMain(){
 return indexSectionNav(INDEX_SECTIONS,indexMainSection,'data-index-section','Index sections')
  +(indexMainSection==='tools'?indexTools():indexMainSection==='map'?indexRegionMap():indexClock());
}

/* The illustrated map shows the existing region, not a newly generated world.
   Only towns with real Critter Center NPCs are valid travel destinations. */
const REGION_MAP_PLACES=[
 {id:'homestead',name:'Western Grounds',x:4,y:74,kind:'wild',spawn:[17,13]},
 {id:'village',name:'Starting Village',x:14,y:74,kind:'town'},
 {id:'route1',name:'Route 1 · Rice Fields',x:30,y:72,kind:'route'},
 {id:'town',name:'Small Town',x:48,y:73,kind:'center',spawn:[23,13]},
 {id:'route2',name:'Route 2 · Bamboo Forest',x:49,y:39,kind:'route'},
 {id:'forest',name:'Hidden Forest',x:30,y:36,kind:'wild'},
 {id:'route3',name:'Route 3 · Foothills',x:72,y:34,kind:'route'},
 {id:'cave',name:'Mountain Cave',x:89,y:20,kind:'wild'},
 {id:'route4',name:'Route 4 · Willow River Trail',x:64,y:73,kind:'route'},
 {id:'ridge',name:'Ridge Trail',x:62,y:39,kind:'route'},
 {id:'garden',name:'Garden Town',x:84,y:73,kind:'center',spawn:[14,14]}
];
const REGION_MAP_INTERIORS=[
 ...Object.entries(TOWN_ROOMS).map(([id,d])=>({id,name:d.name,parent:d.parent})),
 {id:'home',name:'Family Home',parent:'village'},
 {id:'homesteadHome',name:'Personal Home',parent:'homestead'},
 {id:'neighbor',name:'Village Home',parent:'village'},
 {id:'lab',name:'Research Laboratory',parent:'village'},
 {id:'gym',name:'Grass Gym',parent:'garden'},
 {id:'grotto',name:'Bamboo Grotto',parent:'route2'},
 {id:'willowHollow',name:'Willow Hollow',parent:'route4'},
 {id:'ruins',name:'Forgotten Ruins',parent:'forest'},
 {id:'cavern',name:'Crystal Cavern',parent:'cave'}
];
function ensureMapDiscovery(){
 if(!s)return;
 if(!s.discoveredAreas||typeof s.discoveredAreas!=='object'||Array.isArray(s.discoveredAreas))s.discoveredAreas={};
 if(!s.discoveredCenters||typeof s.discoveredCenters!=='object'||Array.isArray(s.discoveredCenters))s.discoveredCenters={};
 if(s.area)s.discoveredAreas[s.area]=true;
 // Existing saves record the most recently used Critter Center.
 if(s.lastCenter&&REGION_MAP_PLACES.some(p=>p.kind==='center'&&p.id===s.lastCenter)){
  s.discoveredAreas[s.lastCenter]=true;s.discoveredCenters[s.lastCenter]=true;
 }
}
function mapCanFastTravel(id){
 if(battle||screen!=='game'||!s)return false;
 if(id==='homestead')return !!s.homestead?.owned&&s.area!=='homestead'&&s.area!=='homesteadHome';
 return !!s.discoveredCenters?.[id]&&REGION_MAP_PLACES.some(p=>p.id===id&&p.kind==='center'&&p.spawn);
}
function regionalPlaceName(p){return p.id==='homestead'&&s?.homestead?.owned?'Personal Home':p.name}
function regionalPlaceUnlocked(p){return p.id==='homestead'?!!s.homestead?.owned:p.kind==='center'&&!!s.discoveredCenters?.[p.id]}
let mapTravelSelection=null;
function indexRegionMap(){
 ensureMapDiscovery();
 const destination=REGION_MAP_PLACES.find(p=>p.id===mapTravelSelection);
 const nodes=REGION_MAP_PLACES.map(p=>{
  const seen=!!s.discoveredAreas[p.id],unlocked=regionalPlaceUnlocked(p);
  const selected=p.id===mapTravelSelection,here=p.id===s.area;
  return '<button type="button" class="regionMapPin '+(seen?'discovered ':'fogged ')+(unlocked?'unlocked ':'')+(here?'here ':'')+(selected?'picked':'')+'"'
   +' data-map-place="'+p.id+'" aria-pressed="'+selected+'" aria-label="'+escapeHtml(seen?regionalPlaceName(p):'Undiscovered location')+'"'
   +' style="left:'+p.x+'%;top:'+p.y+'%"><span class="regionMapPinSymbol">'+(p.kind==='center'?'✚':p.kind==='town'?'⌂':p.kind==='route'?'◆':'▲')+'</span>'
   +'<span class="regionMapPinName">'+escapeHtml(seen?regionalPlaceName(p):'Unknown')+'</span></button>';
 }).join('');
 const discovered=REGION_MAP_PLACES.filter(p=>s.discoveredAreas[p.id]).map(p=>
  '<div class="regionMapLocation"><strong>'+escapeHtml(p.name)+'</strong>'
  +(p.id==='homestead'&&s.homestead?.owned?'<small>Fast Travel unlocked</small>':p.kind==='center'?'<small>'+(s.discoveredCenters[p.id]?'Fast Travel unlocked':'Visit the Critter Center to unlock Fast Travel')+'</small>':'')+'</div>').join('');
 const interiors=REGION_MAP_INTERIORS.filter(p=>s.discoveredAreas[p.id]).map(p=>
  '<div class="regionMapLocation"><strong>'+escapeHtml(p.name)+'</strong><small>'+escapeHtml(REGION_MAP_PLACES.find(a=>a.id===p.parent)?.name||'Location')+'</small></div>').join('');
 const canTravel=destination&&mapCanFastTravel(destination.id);
 return '<div class="regionMapIntro"><strong>THE VALLEY REGION</strong><span>Locations appear as you explore · Centers unlock when visited</span></div>'
  +'<div class="regionMapBoard" role="group" aria-label="Top-down regional map with locations and Critter Centers">'
  +'<img class="regionMapArt" src="assets/region-map.svg?v=83-varied-districts" alt="Illustrated top-down map of the valley, rice paddies, forests, river, mountain cave, trails and towns">'
  +nodes+'</div>'
  +'<div class="regionMapLegend"><span>◆ Route</span><span>⌂ Town</span><span>▲ Landmark</span><span>✚ Center</span><span>● You</span></div>'
  +(destination?'<div class="regionMapTravel" role="status"><strong>'+escapeHtml(regionalPlaceName(destination))+'</strong>'
    +'<p>'+(destination.id==='homestead'?(s.homestead?.owned?(canTravel?'Fast Travel home?':'You are already home.'):'Western grounds.'):destination.kind!=='center'?'Not a fast travel destination.':canTravel?'Fast Travel to this Critter Center?':'Find and speak to the Critter Center technician to unlock Fast Travel.')+'</p>'
    +(canTravel?'<button type="button" class="btn primary" id="regionMapConfirm">Confirm Fast Travel</button>':'')
    +'<button type="button" class="btn" id="regionMapCancel">Cancel</button></div>':'')
  +'<div class="watchSectionTitle">Discovered locations</div><div class="regionMapLocationList">'
  +(discovered+interiors||'<div class="watchEmpty">Explore to discover places.</div>')+'</div>';
}
function fastTravelToCenter(id){
 if(!mapCanFastTravel(id))return false;
 const place=REGION_MAP_PLACES.find(p=>p.id===id);
 const [x,y]=place.spawn;
 mapTravelSelection=null;
 close(); // Remove watch modal before using the existing region transition.
 const room=id==='town'?'townCenter':id==='garden'?'gardenCenter':id==='homestead'?'homesteadHome':null;
 const spawn=room?[roomExit(room)[0],roomExit(room)[1]-2]:[x,y];region(room||id,...spawn,'',true);indexNotice('Fast Travel complete — '+regionalPlaceName(place)+'.');
 s.face='up';save();
 return true;
}

function indexSettings(){
 return '<div class="watchSectionTitle">Game settings · v1.44</div>'
   +''
  +'<div class="watchToolCard watchSettingsCard"><strong>Save game</strong><p>Save your adventure, party, inventory, and progress.</p><button type="button" class="btn primary" id="settingsSaveGame">Save Game</button></div>'
  +'<div class="watchToolCard watchSettingsCard"><strong>Controls</strong><p><b>Move:</b> Touch and slide anywhere on the overworld. Hold to keep moving; release to stop.</p><p><b>Run / Walk:</b> Double-tap an empty part of the overworld to switch speed.</p><p><b>Interact:</b> Face an NPC or object and tap Interact. Tap Interact or the narrator to advance dialogue.</p><p><b>Critter Index:</b> Tap Index to open your watch.</p><p><b>Keyboard:</b> WASD or arrow keys to move, E / Enter / Space to interact, I for Index, Esc to close menus.</p></div>'
  +'<div class="watchToolCard watchSettingsCard"><strong>Environmental audio</strong><p>Ambient wind and weather sound.</p><label>Volume <input id="ambientVolume" type="range" min="0" max="100" value="'+Math.round(ambientVolume*100)+'"></label></div>'
  +'<div class="watchToolCard watchSettingsCard"><strong>Main menu</strong><p>Save your progress and return to the title screen.</p><button type="button" class="btn" id="settingsReturnTitle">Save & Return to Title</button></div>';
}
let moveBookType='Water';
let critterBookType='All',critterBookArea='all',critterBookPage=0,critterBookSelected=null,critterBookSearch='';

function index(){if(trainerApproachLocked())return;
 if(screen!=='game'||battle||narratorBlocking())return;
 routeEvolutionNotices();
 indexTab='clock';indexMainSection='clock';mapTravelSelection=null;settingsSavedMessage=false;playerIndexSection='bag';fieldBagItem=null;fieldBagTarget=null;fieldBagResult='';indexSelection=0;renderIndex();
}
function indexSlotContent(i){
 if(i<8){
  const p=s.party[i];
  if(isEgg(p))return '<span class="watchSlotIcon">🥚</span><span class="watchSlotName">Egg</span><small>'+eggProgress(p.egg,true)+'</small>';
  return p?'<span class="watchSlotIcon">'+(critterSpriteTag(p,'watchSlotSprite')||symbols[p.type]||'◇')+'</span><span class="watchSlotName">'+escapeHtml(p.name||p.type)+critterGenderLabel(p)+'</span><small>Lv '+p.level+'</small>'
   :'<span class="watchSlotIcon empty">◇</span><span class="watchSlotName">Empty</span>';
 }
 const module=s.installed[i-8];
 return '<span class="watchSlotIcon moduleSymbol">✧</span><span class="watchSlotName">'+(module?escapeHtml(module):'Open slot')+'</span>';
}
function indexClock(){
 let clock='<div class="watchClock" role="group" aria-label="Critter Index 12 clock slots">'
  +'<div class="watchDialInner"><span class="watchDialText">CRITTER INDEX</span><strong>'+s.party.length+' / 8</strong><small>ACTIVE PARTY</small>'
  +'<span class="watchDialDivider"></span><span class="watchDialModules">MODULES '+s.installed.filter(Boolean).length+' / 4</span></div>';
 for(let i=0;i<12;i++){
  const angle=(i+1)*Math.PI/6-Math.PI/2;
  const x=50+39*Math.cos(angle),y=50+39*Math.sin(angle);
  clock+='<button type="button" class="watchPosition '+(i>=8?'isModule ':'')+(indexSelection===i?'selected':'')+'" data-index-slot="'+i+'" '
    +'style="left:'+x.toFixed(2)+'%;top:'+y.toFixed(2)+'%" aria-label="'+(i+1)+' o’clock slot">'
    +'<span class="watchTime">'+(i+1)+'</span><span class="watchTinyIcon">'+(i<8?(s.party[i]?(isEgg(s.party[i])?'🥚':critterSpriteTag(s.party[i],'watchTinySprite'))||symbols[s.party[i].type]||'◇':'·'):'✧')+'</span></button>';
 }
 clock+='</div>';
 const i=indexSelection,p=s.party[i],mod=s.installed[i-8];
 let detail;
 if(i<8&&isEgg(p))detail='<div class="watchSelectionHeading">🥚 Egg</div><p>'+eggProgress(p.egg,true)+'</p>'+(!battleIndexActive()&&eggReady(p.egg)?'<button class="btn" data-hatch-party="'+i+'">Hatch Egg</button>':'');
 else if(i<8&&p){
  const pct=Math.max(0,Math.min(100,Math.round(p.hp/Math.max(1,p.maxHp)*100)));
  detail='<div class="watchSelectionHeading">'+(symbols[p.type]||'◇')+' '+escapeHtml(p.type)+' <span>Lv '+p.level+'</span></div>'
   +'<div class="watchMeter"><div style="width:'+pct+'%"></div></div><div class="watchSelectionStats">HP '+p.hp+' / '+p.maxHp+' · XP '+(p.xp||0)+' / '+p.level*12+'</div>'
   +'<div class="watchSelectionStats">Status: '+escapeHtml(p.status||'Healthy')+'</div>'+(!battleIndexActive()?geneticsHTML(p)+inheritedMoveHTML(p):'');
 }else if(i<8){
  detail='<div class="watchSelectionHeading">Empty party position</div><p>Capture a wild Critter to fill this slot.</p>';
 }else{
  detail='<div class="watchSelectionHeading">Module socket '+(i+1)+'</div><p>'+(mod?escapeHtml(mod):'No module installed')+'</p>'
   +'<small>Module changes are available only at a Critter Center.</small>';
 }
 return beamMeterHTML()+'<div class="watchClockLayout">'+clock+'<div class="watchSelection">'
  +'<span class="watchEyebrow">'+(i+1)+' O’CLOCK '+(i<8?'· PARTY':'· MODULE')+'</span>'+detail
  +(battleIndexActive()&&i<8&&p&&!isEgg(p)
     ?'<div class="watchSelectionStats">'+escapeHtml(p.name||p.type)+' · '+escapeHtml(defendTypes(p).join('/'))+'</div>'
      +(battle.allySlots.includes(i)?'<div class="watchSelectionStats">Currently battling</div>'
       :p.hp<=0?'<div class="watchSelectionStats">Fainted — cannot switch</div>'
       :battle.pending.some(q=>q.kind==='switch'&&q.target===i)?'<div class="watchSelectionStats">Already selected to switch</div>'
       :'<button type="button" class="btn watchBattleAction" data-index-battle-switch="'+i+'">Switch into battle</button>')
     :(!battleIndexActive()&&i>=8?'<button type="button" class="btn watchMinor" id="watchViewTab">View modules</button>':''))
  +'</div></div>';
}
function battleIndexActive(){return !!(battle&&battle.phase==='choose'&&battle.indexOpen)}
function openBattleIndex(tab='party'){
 if(!battle||battle.phase!=='choose')return;
 battle.indexOpen=true;indexTab=tab==='items'?'items':'clock';indexSelection=battle.allySlots?.[battle.acting]??0;battle.ppPicker=false;renderIndex();
}
function returnFromBattleIndex(){
 if(!battle||!battle.indexOpen)return;
 battle.indexOpen=false;battle.ppPicker=false;battle.uiMenu='root';renderBattle();
}
function indexParty(){
 const cards=Array.from({length:8},(_,i)=>{
  const p=s.party[i];
  if(!p)return '<div class="watchPartyCard empty"><span>Slot '+(i+1)+'</span><strong>◇ Empty</strong></div>';
  if(isEgg(p))return '<div class="watchPartyCard"><strong>🥚 Egg · Slot '+(i+1)+'</strong><p>'+eggProgress(p.egg,true)+'</p>'+(!battleIndexActive()&&eggReady(p.egg)?'<button class="btn" data-hatch-party="'+i+'">Hatch Egg</button>':'')+'</div>';
  const pct=Math.round(100*p.hp/Math.max(1,p.maxHp));
  return '<div class="watchPartyCard"><div><span class="watchPartyNumber">'+(i+1)+'</span><strong>'+(critterSpriteTag(p,'watchPartySprite')||symbols[p.type]||'◇')+' '+escapeHtml(p.name||p.type)+critterGenderLabel(p)+'</strong>'
   +'<small>Lv '+p.level+'</small></div><div class="watchPartyMeta">'+escapeHtml(defendTypes(p).join(' / '))+'</div><div class="watchMeter"><div style="width:'+pct+'%"></div></div>'
   +'<div class="watchPartyMeta">HP '+p.hp+'/'+p.maxHp+' · '+escapeHtml(p.status||'Healthy')+'</div>'
    +'<div class="watchPartyMeta">'+(p.level>=MAX_CRITTER_LEVEL?'MAX LEVEL · Lv 100':'XP '+Math.floor(p.xp||0)+' / '+experienceToNextLevel(p)+' to Lv '+(p.level+1))+'</div>'
    +'<div class="watchMeter"><div style="width:'+(p.level>=MAX_CRITTER_LEVEL?100:Math.min(100,Math.max(0,Math.round(100*(p.xp||0)/experienceToNextLevel(p)))))+'%"></div></div>'
    +'<div class="watchPartyMeta">'+(nextLevelMove(p)?'Next move: '+escapeHtml(getMove(p,nextLevelMove(p).moveId).name)+' at Lv '+nextLevelMove(p).level:'No further level-up moves assigned')+'</div>'
   +(battleIndexActive()?'<div class="watchPartyMeta">'+(battle.allySlots.includes(i)?'Currently battling':p.hp>0?'Available to switch':'Fainted')+'</div>'+(p.hp>0&&!battle.allySlots.includes(i)&&!battle.pending.some(q=>q.kind==='switch'&&q.target===i)?'<button type="button" class="btn watchBattleAction" data-index-battle-switch="'+i+'">Switch into battle</button>':''):'')
    +'<div class="watchPartyMeta">ATK '+combatStat(p,'attack')+' · DEF '+combatStat(p,'defense')+' · S.ATK '+combatStat(p,'specialAttack')+' · S.DEF '+combatStat(p,'specialDefense')+' · SPD '+combatStat(p,'speed')+'</div>'
   +'<div class="watchPartyMeta">'+(p.moves||[]).map(id=>{const m=getMove(p,id);return escapeHtml(m.name)+' ('+(p.movePP?.[id]??m.pp)+' PP)'}).join(' · ')+'</div>'
   +(battleIndexActive()?'':geneticsHTML(p)+inheritedMoveHTML(p)+partyEvolutionControls(p,i))+'</div>';
 }).join('');
 return '<div class="watchSectionTitle">Active party <small>'+s.party.length+' / 8</small></div>'
  +'<div class="watchPartyGrid">'+cards+'</div><div class="watchReadOnly">⌁ Party rearranging and home storage retrieval require a Critter Center. Stored at home: '+s.storage.length+'</div>';
}

let fieldBagItem=null,fieldBagTarget=null,fieldBagResult='';
function fieldBagItemUsable(name){
 if(!s||battle||!s.inventory?.[name])return false;
 if(name==='Potion')return s.party.some(p=>p.hp>0&&p.hp<p.maxHp);
 if(name==='Revive')return s.party.some(p=>p.hp===0);
 if(name==='PP Potion')return s.party.some(p=>{
  if(isEgg(p)||p.hp<=0)return false;
  normalizeMoves(p);
  return p.moves.some(id=>p.movePP[id]<getMove(p,id).pp);
 });
 if(EVOLUTION_STONES[name])return s.party.some(p=>evolutionRule(p)?.stone===name&&evolutionReady(p,true));
 return false;
}
function fieldBagTargets(name){
 return s.party.map((p,i)=>({p,i})).filter(({p})=>{
  if(!p||isEgg(p)||!s.inventory?.[name])return false;
  if(name==='Potion')return p.hp>0&&p.hp<p.maxHp;
  if(name==='Revive')return p.hp===0;
  if(name==='PP Potion')return p.hp>0&&p.moves.some(id=>(p.movePP?.[id]??getMove(p,id).pp)<getMove(p,id).pp);
  return !!EVOLUTION_STONES[name]&&evolutionRule(p)?.stone===name&&evolutionReady(p,true);
 });
}
function useFieldBagItem(name,target,moveId=null){
 if(battle||!s||!Number.isInteger(target)||!s.inventory?.[name])return false;
 const p=s.party[target];
 if(!p||!fieldBagTargets(name).some(candidate=>candidate.i===target))return false;
 if(name==='Potion')p.hp=Math.min(p.maxHp,p.hp+20);
 else if(name==='Revive')p.hp=Math.max(1,Math.floor(p.maxHp/2));
 else if(name==='PP Potion'){
  normalizeMoves(p);
  if(!moveId||!p.moves.includes(moveId))return false;
  const m=getMove(p,moveId),current=p.movePP[moveId];
  if(current>=m.pp)return false;
  p.movePP[moveId]=Math.min(m.pp,current+10);
 }else if(EVOLUTION_STONES[name]){
  const results=tryEvolveChain(p,1,true);
  if(!results.length)return false;
  routeEvolutionNotices();
  fieldBagItem=null;fieldBagTarget=null;save();return true;
 }else return false;
 s.inventory[name]--;
 indexNotice('Used '+name+' on '+(p.name||p.type)+'.');
 fieldBagItem=null;fieldBagTarget=null;
 save();return true;
}
function fieldBagUI(){
 if(!fieldBagItem)return '';
 const name=fieldBagItem;
 if(!s.inventory?.[name]){fieldBagItem=null;fieldBagTarget=null;return ''}
 const targets=fieldBagTargets(name);
 const header='<div class="watchSectionTitle">Use '+escapeHtml(name)+' on which Critter?</div>';
 const back='<button type="button" class="btn watchMinor" id="fieldItemCancel">Back to bag</button>';
 if(name==='PP Potion'&&Number.isInteger(fieldBagTarget)){
  const p=s.party[fieldBagTarget];
  if(!p||!targets.some(x=>x.i===fieldBagTarget)){fieldBagTarget=null;return fieldBagUI()}
  normalizeMoves(p);
  const moves=p.moves.filter(id=>p.movePP[id]<getMove(p,id).pp).map(id=>{
   const m=getMove(p,id);
   return '<button type="button" class="btn" data-field-move="'+escapeHtml(id)+'">'+escapeHtml(m.name)+' · '+p.movePP[id]+'/'+m.pp+' PP</button>';
  }).join('');
  return '<div class="watchSectionTitle">Restore PP to '+escapeHtml(p.name||p.type)+'</div><div class="fieldBagTargets">'+moves+'</div>'+back;
 }
 return header+'<div class="fieldBagTargets">'+(targets.length?targets.map(({p,i})=>
  '<button type="button" class="btn" data-field-target="'+i+'">'+escapeHtml(p.name||p.type)+critterGenderLabel(p)+' · Lv '+p.level+' · HP '+p.hp+'/'+p.maxHp+'</button>').join('')
  :'<div class="watchEmpty">No eligible Critters.</div>')+'</div>'+back;
}

function indexItems(){
 const items=Object.entries(s.inventory||{}).filter(([,v])=>v>0);
 const list=items.length?items.map(([k,v])=>'<div class="watchRow"><span>▣ '+escapeHtml(k)+'</span><strong>×'+v+'</strong></div>').join(''):'<div class="watchEmpty">Your bag is empty.</div>';
 const modules=['Power Coil','Guard Plate','Weakening Field'];
 const owned=modules.map(m=>{const count=s.modules.filter(x=>x===m).length;return count?'<div class="watchRow"><span>✧ '+escapeHtml(m)+'</span><strong>×'+count+'</strong></div>':''}).join('');
 const current=battleIndexActive()?battle.allySlots[battle.acting]:-1;
 const ppCritter=s.party[current];
 const ppMoves=ppCritter?(ppCritter.moves||[]).map(id=>{
  const m=getMove(ppCritter,id),remaining=ppCritter.movePP?.[id]??m.pp;
  return '<button type="button" class="btn watchBattleAction" data-battle-pp-move="'+escapeHtml(id)+'" '+(remaining>=m.pp||!itemQty('PP Potion')?'disabled':'')+'>'
   +escapeHtml(m.name)+' · '+remaining+'/'+m.pp+' PP</button>';
 }).join(''):'';
 const battleTools=battleIndexActive()?'<div class="watchSectionTitle">Available battle items</div><div class="battleBagActions">'
   +'<button type="button" class="btn" id="watchBattlePotion" '+(!itemQty('Potion')||ppCritter?.hp>=ppCritter?.maxHp?'disabled':'')+'>Potion · Heal 20 HP ('+itemQty('Potion')+')</button>'
   +'<button type="button" class="btn" id="watchBattleRevive" '+(!itemQty('Revive')||!s.party.some(p=>p.hp===0)?'disabled':'')+'>Revive · Restore fainted Critter ('+itemQty('Revive')+')</button>'
   +'<button type="button" class="btn" id="watchBattlePP" '+(!itemQty('PP Potion')||!(ppCritter?.moves||[]).some(id=>(ppCritter.movePP?.[id]??getMove(ppCritter,id).pp)<getMove(ppCritter,id).pp)?'disabled':'')+'>PP Potion · Restore 10 PP ('+itemQty('PP Potion')+')</button>'
   +beamBattleButton('watchBattleBeam')
   +'</div>'
   +(battle.ppPicker?'<div class="watchSectionTitle">Choose a move to restore PP</div><div class="watchPartyGrid">'+ppMoves+'</div><button type="button" class="btn watchMinor" id="watchPPCancel">Back to bag</button>':'')
   :'';

 if(battleIndexActive())return battleTools;
 const fieldList=items.length?items.map(([name,count])=>{
  const usable=fieldBagItemUsable(name);
  return '<div class="watchRow fieldBagRow"><span>'+escapeHtml(name)+' ×'+count+'</span>'
   +(usable?'<button type="button" class="btn watchMinor" data-field-item="'+escapeHtml(name)+'">Use</button>':
    '<small>'+((name==='Potion'||name==='Revive'||name==='PP Potion'||EVOLUTION_STONES[name])?'No eligible Critter':'Not usable in the field')+'</small>')+'</div>';
 }).join(''):'<div class="watchEmpty">Your bag is empty.</div>';
 return '<div class="watchSectionTitle">Bag</div>'
   +''
  +(fieldBagItem?fieldBagUI():fieldList)
  +'<div class="watchSectionTitle">Available modules</div>'+(owned||'<div class="watchEmpty">No uninstalled modules owned.</div>')
  +'<div class="watchReadOnly">Use healing supplies, PP Potions, Revives, and eligible evolution stones from the bag. Capture Beam is available during wild battles; modules are installed at Critter Centers.</div>';
}

// Collection phase: species IDs are the permanent keys, not editable names.
// Older saves backfill only provable captured species, never guessed type placeholders.
const COLLECTION_MILESTONES=[
 {count:5,credits:100,potions:2,revives:0},
 {count:10,credits:200,potions:3,revives:0},
 {count:25,credits:400,potions:4,revives:1},
 {count:50,credits:800,potions:5,revives:2},
 {count:100,credits:1600,potions:8,revives:3},
 {count:150,credits:2400,potions:10,revives:4},
 {count:200,credits:4000,potions:15,revives:5}
];
const COLLECTION_STATUS=['all','unseen','seen','captured'];
let critterBookDiscovery='all';
function collectionData(){
 if(!s)return {seen:{},caught:{},claimedMilestones:[]};
 if(!s.collection||typeof s.collection!=='object'||Array.isArray(s.collection))s.collection={};
 const c=s.collection;
 if(!c.seen||typeof c.seen!=='object'||Array.isArray(c.seen))c.seen={};
 if(!c.caught||typeof c.caught!=='object'||Array.isArray(c.caught))c.caught={};
 if(!Array.isArray(c.claimedMilestones))c.claimedMilestones=[];
 c.claimedMilestones=[...new Set(c.claimedMilestones.filter(n=>Number.isInteger(n)&&COLLECTION_MILESTONES.some(m=>m.count===n)))];
 return c;
}
function validCollectionSpecies(id){return typeof id==='string'&&id.length>0&&speciesRegistry.has(id)}
function discoveryStatus(id){
 if(!validCollectionSpecies(id))return 'unseen';
 const c=collectionData();
 return c.caught[id]?'captured':c.seen[id]?'seen':'unseen';
}
function collectionCounts(){
 const c=collectionData(),ids=[...speciesRegistry.keys()];
 return {total:ids.length,seen:ids.filter(id=>!!c.seen[id]||!!c.caught[id]).length,captured:ids.filter(id=>!!c.caught[id]).length};
}
function encounterStamp(){return {day:Number.isFinite(s?.worldDay)?Math.max(1,Math.floor(s.worldDay)):1,area:SECRET_AREAS[s?.area]?.parent||s?.area||'unknown'}}
function noteCritterSeen(p){
 const id=p?.speciesId;
 if(!validCollectionSpecies(id))return false;
 const c=collectionData(),stamp=encounterStamp();
 if(!c.seen[id]){
  c.seen[id]={firstArea:stamp.area,firstDay:stamp.day,encounters:1,lastArea:stamp.area};
  return true;
 }
 c.seen[id].encounters=Math.max(0,Number(c.seen[id].encounters)||0)+1;
 c.seen[id].lastArea=stamp.area;
 return false;
}
function noteCritterCaptured(p){
 const id=p?.speciesId;
 if(!validCollectionSpecies(id))return false;
 const c=collectionData(),stamp=encounterStamp();
 if(!c.seen[id])noteCritterSeen(p);
 if(!c.caught[id]){
  c.caught[id]={firstArea:stamp.area,firstDay:stamp.day,firstLevel:p.level||1,captures:1};
  return true;
 }
 c.caught[id].captures=Math.max(0,Number(c.caught[id].captures)||0)+1;
 return false;
}
function migrateCollection(){
 const c=collectionData();
 // A stored Critter proves capture; an old capture-log entry proves capture.
 // We cannot infer identity from legacy type-only records or defeated trainers.
 const known=[];
 for(const p of [...(s.party||[]),...(s.storage||[])])if(p?.speciesId)known.push({speciesId:p.speciesId,level:p.level,area:s.area});
 for(const entry of s.captureLog||[])if(entry?.speciesId)known.push({speciesId:entry.speciesId,level:entry.level,area:entry.area});
 for(const p of known){
  if(!validCollectionSpecies(p.speciesId))continue;
  const entry=c.seen[p.speciesId]||{firstArea:p.area||'unknown',firstDay:null,encounters:0,lastArea:p.area||'unknown'};
  c.seen[p.speciesId]=entry;
  c.caught[p.speciesId]=c.caught[p.speciesId]||{firstArea:p.area||'unknown',firstDay:null,firstLevel:p.level||1,captures:1,imported:true};
 }
}
function milestonePrize(m){
 return [m.credits+' money',m.potions?m.potions+' Potions':'',m.revives?m.revives+' Revives':''].filter(Boolean).join(' · ');
}
function claimCollectionMilestone(count){
 const m=COLLECTION_MILESTONES.find(x=>x.count===count),c=collectionData();
 if(!m||c.claimedMilestones.includes(count)||collectionCounts().captured<count)return false;
 c.claimedMilestones.push(count);
 s.money+=m.credits;
 s.inventory=s.inventory||{};
 s.inventory.Potion=(s.inventory.Potion||0)+m.potions;
 s.inventory.Revive=(s.inventory.Revive||0)+m.revives;
 save();
 return true;
}
function collectionProgressUI(){
 const count=collectionCounts(),pct=count.total?Math.round(count.captured/count.total*100):0;
 return '<div class="collectionProgress"><div class="collectionProgressNums"><strong>'+count.captured+' captured</strong><span>'+count.seen+' seen · '+count.total+' total</span></div>'
   +'<div class="watchMeter"><div style="width:'+pct+'%"></div></div><small>'+pct+'% collection complete</small></div>';
}
function collectionMilestonesUI(){
 const count=collectionCounts().captured,c=collectionData();
 return '<div class="watchSectionTitle">Collection milestones</div>'
  +'<div class="collectionMilestones">'+COLLECTION_MILESTONES.map(m=>{
   const claimed=c.claimedMilestones.includes(m.count),unlocked=count>=m.count;
   return '<div class="collectionMilestone"><div><strong>'+m.count+' unique species</strong><small>'+escapeHtml(milestonePrize(m))+'</small></div>'
    +(claimed?'<span class="collectionClaimed">Claimed</span>':unlocked?'<button class="btn" type="button" data-collection-claim="'+m.count+'">Claim reward</button>'
      :'<span class="collectionLocked">'+count+'/'+m.count+'</span>')+'</div>';
  }).join('')+'</div>';
}

function allExplorationFinds(){return [...EXPLORATION_SITES,...ROUTE1_SITES.filter(o=>o.reward),...EXPLORATION_OBJECTS.filter(o=>o.reward||o.credits),...Object.entries(SECRET_AREAS).map(([id,d])=>({id:'secret-'+id,title:d.name}))]}
function indexRecords(){
 const log=(s.captureLog||[]).slice(-12).reverse();
 const history=log.length?log.map(q=>'<div class="watchRow"><span>'+(symbols[q.type]||'◇')+' '+escapeHtml(q.name||q.type)+' <small>Lv '+Number(q.level||1)+'</small></span><span class="watchRecordLocation">'+escapeHtml(q.area||'Unknown')+' · '+escapeHtml(q.storage||'Party')+'</span></div>').join('')
  :'<div class="watchEmpty">New captures will appear here. Older saves retain their capture totals, but individual capture histories were not previously stored.</div>';
 return '<div class="watchMetrics">'
  +'<div><strong>'+s.captureCount+'</strong><span>Total captures</span></div>'
  +'<div><strong>'+s.storage.length+'</strong><span>Home storage</span></div>'
  +'<div><strong>'+s.badges+'</strong><span>Badges</span></div>'
   +'<div><strong>'+allExplorationFinds().filter(o=>s.discoveries?.[o.id]).length+'/'+allExplorationFinds().length+'</strong><span>Exploration finds</span></div>'
  +'</div><div class="watchSectionTitle">Recent capture registrations</div>'+history
  +'<div class="watchSectionTitle">Landmark discoveries</div>'
   +allExplorationFinds().map(o=>'<div class="watchRow"><span>'+escapeHtml(s.discoveries?.[o.id]?o.title:'Undiscovered location')+'</span><span>'+(s.discoveries?.[o.id]?'Discovered':'Not yet found')+'</span></div>').join('')
   +sideQuestIndex()+collectionProgressUI()+collectionMilestonesUI()
  +'<div class="watchReadOnly">Only distinct registered species count toward milestones. Your previous captures are credited when their species IDs are available.</div>';
}
function indexMoves(){
 const types=Object.keys(strengths).concat('Typeless');
 if(!types.includes(moveBookType))moveBookType='Water';
 const buttons=types.map(type=>'<button type="button" class="watchTypeButton '+(moveBookType===type?'selected':'')+'" data-move-type="'+escapeHtml(type)+'">'+escapeHtml(type)+'</button>').join('');
 const list=[...moveRegistry.values()].filter(m=>m.type===moveBookType).sort((a,b)=>(a.requiredLevelGuide||0)-(b.requiredLevelGuide||0));
 const content=list.map(m=>'<div class="watchMoveRow"><div class="watchMoveTop"><strong>'+escapeHtml(m.name)+'</strong><span>'+escapeHtml(m.category)+' · '+(m.pp||0)+' PP</span></div>'
 +'<div class="watchMoveStats">Power '+(m.power||'—')+' · Accuracy '+(m.accuracy??100)+'% · '+escapeHtml(m.target||'enemy')+'</div>'
 +'<p>'+escapeHtml(m.description||'No description')+'</p></div>').join('');
 return '<div class="watchSectionTitle">Move library <small>'+moveRegistry.size+' registered</small></div>'
  +'<div class="watchTypeButtons">'+buttons+'</div>'+content
  +'<div class="watchReadOnly">This is a reference catalog. Each species learns its own curated moves at specific levels. Move editing happens in the repository.</div>';
}

// The 200-species library is a view of the live registry, not a hard-coded
// duplicate. Names, artwork, habitat and learnsets update from critters.json.
const CRITTER_AREA_LABELS={all:'All areas',route1:'Route 1 · Rice Fields',route2:'Route 2 · Bamboo Forest',forest:'Hidden Forest',route3:'Route 3 · Foothills',cave:'Mountain Cave',garden:'Garden Town Outskirts'};
const LIBRARY_PAGE_SIZE=16;
function critterArtwork(sp){
 const artwork=critterSpriteTag(sp,'speciesPortrait');
 return artwork||'<div class="speciesSilhouette" role="img" aria-label="Artwork pending"><span>◇</span><small>ART PENDING</small></div>';
}
function critterStatTable(sp){
 const fields=[['hp','HP'],['attack','Attack'],['defense','Defense'],['specialAttack','Sp. Atk'],['specialDefense','Sp. Def'],['speed','Speed']];
 const stats=sp.baseStats||{};
 return '<div class="speciesStatGrid">'+fields.map(([key,label])=>{
  const val=Number.isFinite(stats[key])?stats[key]:0;
  return '<div class="speciesStat"><span>'+label+'</span><strong>'+val+'</strong><div class="speciesStatTrack"><i style="width:'+Math.min(100,Math.max(0,val/50*100))+'%"></i></div></div>';
 }).join('')+'</div>';
}
function collectionSpeciesHistory(id){
 const c=collectionData(),seen=c.seen[id],caught=c.caught[id];
 if(!seen&&!caught)return '<div class="watchReadOnly">Not encountered yet. Explore the listed habitat to discover this species.</div>';
 const a=seen?.firstArea||caught?.firstArea||'unknown';
 return '<div class="collectionHistory"><strong>Discovery record</strong><span>First sighting: '+escapeHtml(CRITTER_AREA_LABELS[a]||a)
  +(seen?.firstDay?' · Day '+seen.firstDay:'')+'</span>'
  +'<span>Encounters recorded: '+(seen?.encounters||0)+'</span>'
  +(caught?'<span>'+(caught.obtainedBy==='evolution'?'First obtained through evolution':'First capture')+': '+escapeHtml(CRITTER_AREA_LABELS[caught.firstArea]||caught.firstArea)
   +' · Lv '+(caught.firstLevel||'?')+'</span><span>Capture-beam catches recorded: '+Math.max(0,caught.captures||0)+'</span>':'<span>Not captured yet</span>')
  +'</div>';
}
function indexCritters(){
 const all=[...speciesRegistry.values()].sort((a,b)=>critterIndexNumber(a)-critterIndexNumber(b));
 const filtered=all.filter(sp=>{
  const byType=critterBookType==='All'||sp.types?.includes(critterBookType);
  const byArea=critterBookArea==='all'||sp.habitats?.some(h=>h.areaId===critterBookArea);
  const term=critterBookSearch.trim().toLowerCase();
  const bySearch=!term||String(sp.name).toLowerCase().includes(term)||String(critterIndexNumber(sp)).includes(term)||String(sp.speciesId).includes(term);
  return byType&&byArea&&bySearch&&(critterBookDiscovery==='all'||discoveryStatus(sp.speciesId)===critterBookDiscovery);
 });
 const selection=critterBookSelected?speciesRegistry.get(critterBookSelected):null;
 const types=Object.keys(strengths);
 const typeFilters=['All',...types].map(type=>'<option value="'+escapeHtml(type)+'" '+(critterBookType===type?'selected':'')+'>'+escapeHtml(type)+'</option>').join('');
 const areaFilters=Object.entries({...CRITTER_AREA_LABELS,lab:'Research Laboratory — Starters'}).map(([id,name])=>'<option value="'+id+'" '+(critterBookArea===id?'selected':'')+'>'+escapeHtml(name)+'</option>').join('');
 const collectionOptions=[['all','All discoveries'],['unseen','Unseen'],['seen','Seen only'],['captured','Captured']].map(([id,label])=>'<option value="'+id+'" '+(critterBookDiscovery===id?'selected':'')+'>'+label+'</option>').join('');
 const search='<div class="collectionDiscoverFilter"><label>Discovery status<select id="critterDiscoveryFilter" aria-label="Filter discovery status">'+collectionOptions+'</select></label></div>'
  +'<div class="speciesFilters"><label>Type<select id="critterTypeFilter" aria-label="Filter Critter type">'+typeFilters+'</select></label>'
  +'<label>Habitat<select id="critterAreaFilter" aria-label="Filter habitat">'+areaFilters+'</select></label></div>'
  +'<div class="speciesSearch"><input id="critterSearch" aria-label="Search Critters" placeholder="Search name or number" value="'+escapeHtml(critterBookSearch)+'">'
  +'<button type="button" class="btn" id="critterSearchGo">Find</button><button type="button" class="btn" id="critterReset">Reset</button></div>';
 let body='';
 if(selection){
  const locations=(selection.habitats||[]).map(h=>'<li>'+escapeHtml(h.areaName||CRITTER_AREA_LABELS[h.areaId]||h.areaId)
   +' · Lv '+h.minLevel+'–'+h.maxLevel+' · '+escapeHtml(h.rarity||'common')+encounterConditionsLabel(selection.encounterConditions)+encounterConditionsLabel(h.encounterConditions)+'</li>').join('');
  const moveRows=registeredLearnset(selection).map(e=>{
   const move=validMove(e.moveId);
   return '<div class="speciesMoveLine"><span>Lv '+e.level+'</span><strong>'+escapeHtml(move?.name||e.moveId)+'</strong><small>'+escapeHtml(move?.type||'Unknown')+'</small></div>';
  }).join('');
  body='<button class="btn speciesBack" type="button" id="critterBack">← Back to all Critters</button>'
   +'<div class="speciesIdentity">'+critterArtwork(selection)+'<div><span class="speciesNumber">#'+String(critterIndexNumber(selection)).padStart(3,'0')+'</span>'
   +'<h3>'+escapeHtml(selection.name)+'</h3><p>'+selection.types.map(escapeHtml).join(' / ')+'</p>'
   +'<small>'+escapeHtml(selection.role||'balanced')+' · '+(completeCritterArt(selection.art)?'Art uploaded':'Awaiting front and rear art')+'</small>'
   +'<div class="collectionStatus '+discoveryStatus(selection.speciesId)+'">'+discoveryStatus(selection.speciesId).toUpperCase()+'</div></div></div>'
   +'<div class="watchSectionTitle">Level 1 base stats</div>'+critterStatTable(selection)
   +collectionSpeciesHistory(selection.speciesId)
   +'<div class="watchSectionTitle">Where to find it</div><ul class="speciesHabitats">'+locations+'</ul>'
   +evolutionChainInfo(selection)
   +'<div class="watchSectionTitle">Level-up learnset</div><div class="speciesLearnset">'+moveRows+'</div>'
   +'<div class="watchReadOnly">Draft species. Cody and Kyle can revise its name, types, stats, habitat and learnset in the species registry.</div>';
 }else{
  const maxPage=Math.max(0,Math.ceil(filtered.length/LIBRARY_PAGE_SIZE)-1);
  critterBookPage=Math.min(Math.max(0,critterBookPage),maxPage);
  const slice=filtered.slice(critterBookPage*LIBRARY_PAGE_SIZE,(critterBookPage+1)*LIBRARY_PAGE_SIZE);
  const list=slice.map(sp=>{
   const first=sp.habitats?.[0];
   return '<button type="button" class="speciesTile" data-critter-id="'+escapeHtml(sp.speciesId)+'">'
    +'<span class="speciesMiniIcon">'+(critterSpriteTag(sp,'speciesMiniSprite')||symbols[sp.types?.[0]]||'◇')+'</span><span><small>#'+String(critterIndexNumber(sp)).padStart(3,'0')+'</small><strong>'+escapeHtml(sp.name)+'</strong>'
    +'<em>'+sp.types.map(escapeHtml).join(' / ')+'</em><small>'+escapeHtml(first?.areaName||'Undiscovered area')+'</small>'
    +'<small class="collectionStatus '+discoveryStatus(sp.speciesId)+'">'+discoveryStatus(sp.speciesId).toUpperCase()+'</small></span><span class="speciesArrow">›</span></button>';
  }).join('')||'<div class="watchEmpty">No Critters match these filters.</div>';
  body='<div class="speciesResults">Showing '+filtered.length+' of '+all.length+' Critters</div>'+collectionProgressUI()
   +'<div class="speciesGrid">'+list+'</div>'
   +'<div class="speciesPager"><button type="button" class="btn" id="critterPrev" '+(!critterBookPage?'disabled':'')+'>Previous</button>'
   +'<span>Page '+(critterBookPage+1)+' / '+(maxPage+1)+'</span>'
   +'<button type="button" class="btn" id="critterNext" '+(critterBookPage>=maxPage?'disabled':'')+'>Next</button></div>';
 }
 return '<div class="watchSectionTitle">Master Critter Index <small>'+all.length+' species</small></div><p class="muted">Species IDs #001–#009 are the three starter families. All other IDs follow likely discovery order, keeping evolution forms together. Starter names and artwork are reserved for your designs.</p>'+search+body;
}

function indexTools(){
 const cutter=!!s.cut,level=s.badges>=5?'Rare':s.badges>=2?'Advanced':'Basic';
 let modules=Array.from({length:4},(_,i)=>'<div class="watchModuleRow"><span>'+(i+9)+' O’CLOCK</span><strong>'+escapeHtml(s.installed[i]||'Empty module socket')+'</strong></div>').join('');
 return '<div class="watchSectionTitle">Critter Index maintenance</div>'
  +'<div class="watchToolCard"><strong>✧ Capture Beam</strong><span>'+(beamStatus().charge?'ONLINE':'EMPTY')+'</span><p>'+beamStatus().name+' · '+beamChargeLabel()+'. Recharge and upgrade at Critter Shops.</p>'+beamMeterHTML()+'</div>'
  +'<div class="watchToolCard"><strong>⚙ Vegetation Cutter</strong><span>'+(cutter?'UNLOCKED':'LOCKED')+'</span><p>'+(cutter?'First-badge cutting function is active.':'Earn the first Grass Gym badge to unlock vegetation cutting.')+'</p></div>'
  +'<div class="watchToolCard"><strong>◇ Module Access</strong><span>'+level.toUpperCase()+'</span><p>Basic at 0 badges · Advanced at 2 · Rare at 5.</p></div>'
  +'<div class="watchSectionTitle">Index appearance upgrades</div><div class="watchToolCard"><p>Earn the first badge to unlock Jade and Slate watch finishes. Cosmetic only.</p>'+['classic','jade','slate'].map(v=>'<button class="btn" data-index-style="'+v+'" '+(s.trainerProgress.indexStyle===v||v!=='classic'&&s.badges<1?'disabled':'')+'>'+v+'</button>').join('')+'</div><div class="watchSectionTitle">Module sockets</div>'+modules
  +'<div class="watchReadOnly">Your watch is read-only away from a Critter Center. Modules are automatic after installation.</div>';
}
function renderIndex(){
 if(!s||screen!=='game'||(battle&&!battleIndexActive()))return;
 const battleViewing=battleIndexActive();
 // Battle quick views remain strictly limited to the clock or battle-item screen.
 if(battleViewing)indexTab=indexTab==='items'?'items':'clock';
 else{
  if(indexTab==='party')indexTab='clock';
  if(indexTab==='items'||indexTab==='records'){playerIndexSection=indexTab==='records'?'records':'bag';indexTab='player';}
  if(indexTab==='moves'||indexTab==='critters'){encyclopediaSection=indexTab;indexTab='encyclopedia';}
  if(indexTab==='tools'){indexTab='clock';indexMainSection='tools';}
 }
 const tabs=battleViewing?'':INDEX_TABS.map(([key,label])=>'<button type="button" class="watchTab '+(indexTab===key?'selected':'')+'" data-watch-tab="'+key+'" aria-pressed="'+(indexTab===key)+'">'+(key==='player'?escapeHtml(s.name):label)+'</button>').join('');
 let content=battleViewing?(indexTab==='items'?indexItems():indexClock()):
   indexTab==='player'?indexPlayer():indexTab==='clock'?indexMain():indexTab==='encyclopedia'?indexEncyclopedia():indexSettings();
 open('Critter Index','<div class="watchShell index-finish-'+(s.trainerProgress?.indexStyle||'classic')+' '+(battleViewing?'battleIndexShell battleQuickView':'')+'">'
  +(battleViewing?'<div class="watchSectionTitle">'+(indexTab==='items'?'Use battle item':'Choose a Critter')+'</div>'
    :'<nav class="watchTabs" aria-label="Critter Index screens">'+tabs+'</nav>')
  +'<div class="watchScreen" role="region" aria-label="Critter Index '+escapeHtml(indexTab)+' screen">'+content+'</div>'
  +(battleViewing?'<div class="watchFooter"><button type="button" class="btn primary" id="watchReturnBattle">Return to Battle</button></div>':'')+'</div>');
 document.querySelectorAll('[data-watch-tab]').forEach(b=>b.onclick=()=>{
  if(battleViewing||!INDEX_TABS.some(([key])=>key===b.dataset.watchTab))return;
  indexTab=b.dataset.watchTab;renderIndex();
 });
 document.querySelectorAll('[data-index-section]').forEach(b=>b.onclick=()=>{
  if(battleViewing||indexTab!=='clock'||!INDEX_SECTIONS.some(([key])=>key===b.dataset.indexSection))return;
  indexMainSection=b.dataset.indexSection;if(indexMainSection!=='map')mapTravelSelection=null;renderIndex();
 });
 document.querySelectorAll('[data-map-place]').forEach(b=>b.onclick=()=>{
  if(battleViewing||indexTab!=='clock'||indexMainSection!=='map')return;
  if(!REGION_MAP_PLACES.some(p=>p.id===b.dataset.mapPlace))return;
  mapTravelSelection=b.dataset.mapPlace;renderIndex();
 });
 const mapConfirm=$('regionMapConfirm');if(mapConfirm)mapConfirm.onclick=()=>{
  if(mapTravelSelection)fastTravelToCenter(mapTravelSelection);
 };
 const mapCancel=$('regionMapCancel');if(mapCancel)mapCancel.onclick=()=>{mapTravelSelection=null;renderIndex()};
 document.querySelectorAll('[data-player-section]').forEach(b=>b.onclick=()=>{
  if(battleViewing||!PLAYER_INDEX_SECTIONS.some(([key])=>key===b.dataset.playerSection))return;
  playerIndexSection=b.dataset.playerSection;renderIndex();
 });
 document.querySelectorAll('[data-field-item]').forEach(b=>b.onclick=()=>{
  if(battleViewing||indexTab!=='player'||playerIndexSection!=='bag')return;
  const name=b.dataset.fieldItem;
  if(!fieldBagItemUsable(name))return;
  fieldBagItem=name;fieldBagTarget=null;fieldBagResult='';renderIndex();
 });
 document.querySelectorAll('[data-field-target]').forEach(b=>b.onclick=()=>{
  if(battleViewing||!fieldBagItem)return;
  const target=Number(b.dataset.fieldTarget);
  if(!Number.isInteger(target)||!fieldBagTargets(fieldBagItem).some(x=>x.i===target))return;
  if(fieldBagItem==='PP Potion'){fieldBagTarget=target;renderIndex();return;}
  if(useFieldBagItem(fieldBagItem,target))close();
 });
 document.querySelectorAll('[data-field-move]').forEach(b=>b.onclick=()=>{
  if(battleViewing||fieldBagItem!=='PP Potion'||!Number.isInteger(fieldBagTarget))return;
  if(useFieldBagItem('PP Potion',fieldBagTarget,b.dataset.fieldMove))close();
 });
 const fieldCancel=$('fieldItemCancel');if(fieldCancel)fieldCancel.onclick=()=>{
  fieldBagItem=null;fieldBagTarget=null;fieldBagResult='';renderIndex();
 };

 document.querySelectorAll('[data-encyclopedia-section]').forEach(b=>b.onclick=()=>{
  if(battleViewing||!ENCYCLOPEDIA_SECTIONS.some(([key])=>key===b.dataset.encyclopediaSection))return;
  encyclopediaSection=b.dataset.encyclopediaSection;renderIndex();
 });
 document.querySelectorAll('[data-move-type]').forEach(b=>b.onclick=()=>{
  if(!Object.keys(strengths).concat('Typeless').includes(b.dataset.moveType))return;
  moveBookType=b.dataset.moveType;renderIndex();
 });
 document.querySelectorAll('[data-hatch-party]').forEach(el=>el.onclick=()=>{if(!battleViewing)hatchEggUI('party',Number(el.dataset.hatchParty))});
 document.querySelectorAll('[data-evolve-party]').forEach(b=>b.onclick=()=>{
  if(battleViewing)return;
  const i=Number(b.dataset.evolveParty),p=s.party[i];if(!p||!evolutionReady(p,true))return;
  const result=tryEvolveChain(p,2,true);if(!result.length)return;
  routeEvolutionNotices();save();close();
 });
 document.querySelectorAll('[data-critter-id]').forEach(b=>b.onclick=()=>{
  if(!speciesRegistry.has(b.dataset.critterId))return;
  critterBookSelected=b.dataset.critterId;renderIndex();
 });
 const discoveryFilter=$('critterDiscoveryFilter');
 if(discoveryFilter)discoveryFilter.onchange=()=>{if(!COLLECTION_STATUS.includes(discoveryFilter.value))return;critterBookDiscovery=discoveryFilter.value;critterBookPage=0;critterBookSelected=null;renderIndex()};
 const crType=$('critterTypeFilter'),crArea=$('critterAreaFilter');
 if(crType)crType.onchange=()=>{critterBookType=crType.value;critterBookPage=0;critterBookSelected=null;renderIndex()};
 if(crArea)crArea.onchange=()=>{critterBookArea=crArea.value;critterBookPage=0;critterBookSelected=null;renderIndex()};
 const searchInput=$('critterSearch');
 const doSearch=()=>{critterBookSearch=searchInput?.value||'';critterBookPage=0;critterBookSelected=null;renderIndex()};
 const searchBtn=$('critterSearchGo'),resetBtn=$('critterReset');
 if(searchBtn)searchBtn.onclick=doSearch;
 if(searchInput)searchInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();doSearch()}};
 if(resetBtn)resetBtn.onclick=()=>{critterBookSearch='';critterBookArea='all';critterBookType='All';critterBookDiscovery='all';critterBookPage=0;critterBookSelected=null;renderIndex()};
 document.querySelectorAll('[data-collection-claim]').forEach(b=>b.onclick=()=>{if(claimCollectionMilestone(Number(b.dataset.collectionClaim))){indexNotice('Collection milestone reward received.');close()}});
 const back=$('critterBack');if(back)back.onclick=()=>{critterBookSelected=null;renderIndex()};
 const prev=$('critterPrev');if(prev)prev.onclick=()=>{critterBookPage=Math.max(0,critterBookPage-1);renderIndex()};
 const next=$('critterNext');if(next)next.onclick=()=>{critterBookPage++;renderIndex()};
 document.querySelectorAll('[data-index-slot]').forEach(b=>b.onclick=()=>{
  const n=Number(b.dataset.indexSlot);if(!Number.isInteger(n)||n<0||n>=12)return;
  indexSelection=n;renderIndex();
 });
 const view=$('watchViewTab');
 if(view)view.onclick=()=>{if(battleViewing)return;indexTab='clock';indexMainSection='tools';renderIndex()};
 if(battleViewing){
  $('watchReturnBattle').onclick=returnFromBattleIndex;
  document.querySelectorAll('[data-index-battle-switch]').forEach(el=>el.onclick=()=>{
   const target=Number(el.dataset.indexBattleSwitch);
   if(!Number.isInteger(target))return;
   battle.indexOpen=false;queueBattleAction({kind:'switch',target});
  });
  const potion=$('watchBattlePotion');if(potion)potion.onclick=()=>{
   const actor=battle.allySlots[battle.acting];
   if(!itemQty('Potion')||!s.party[actor]||s.party[actor].hp>=s.party[actor].maxHp)return;
   battle.indexOpen=false;queueBattleAction({kind:'potion',target:actor});
  };
  const pp=$('watchBattlePP');if(pp)pp.onclick=()=>{
   if(!itemQty('PP Potion'))return;
   battle.ppPicker=true;indexTab='items';renderIndex();
  };
  const cancelPP=$('watchPPCancel');if(cancelPP)cancelPP.onclick=()=>{battle.ppPicker=false;renderIndex()};
  document.querySelectorAll('[data-battle-pp-move]').forEach(el=>el.onclick=()=>{
   const id=el.dataset.battlePpMove,actor=battle.allySlots[battle.acting],cr=s.party[actor];
   if(!itemQty('PP Potion')||!cr||!cr.moves.includes(id)||(cr.movePP[id]??getMove(cr,id).pp)>=getMove(cr,id).pp)return;
   battle.ppPicker=false;battle.indexOpen=false;queueBattleAction({kind:'ppPotion',target:actor,moveId:id});
  });
  const beam=$('watchBattleBeam');if(beam)beam.onclick=()=>{
   if(battle.kind!=='wild')return;
   battle.indexOpen=false;queueBattleAction({kind:'capture'});
  };
  const revive=$('watchBattleRevive');if(revive)revive.onclick=selectRevive;
 }else{
  document.querySelectorAll('[data-achievement]').forEach(b=>b.onclick=()=>claimTrainerAchievement(b.dataset.achievement));
  document.querySelectorAll('[data-outfit]').forEach(b=>b.onclick=()=>{if(s.trainerProgress.outfits.includes(b.dataset.outfit)){s.trainerProgress.outfit=b.dataset.outfit;save();renderIndex()}});
  document.querySelectorAll('[data-index-style]').forEach(b=>b.onclick=()=>{const v=b.dataset.indexStyle;if(['classic','jade','slate'].includes(v)&&(v==='classic'||s.badges>=1)){s.trainerProgress.indexStyle=v;save();renderIndex()}});
  const volume=$('ambientVolume');if(volume)volume.oninput=()=>{ambientVolume=Number(volume.value)/100;try{localStorage.setItem('critters-ambient-volume',String(ambientVolume))}catch{}unlockAmbient()};
  const saveButton=$('settingsSaveGame');
  if(saveButton)saveButton.onclick=()=>{if(save()){indexNotice('Game saved successfully.');close()}else{close();notifyWorld('Game could not be saved.')}};
  const titleButton=$('settingsReturnTitle');
  if(titleButton)titleButton.onclick=()=>{if(save()){close();show('title')}else{close();notifyWorld('Game could not be saved. You are still in your adventure.')}};
 }
}
function inventoryText(){return Object.entries(s.inventory).filter(([,v])=>v>0).map(([k,v])=>k+' ×'+v).join(', ')||'Empty'}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

// Main story foundation: only the existing first-badge chapter is playable.
// Later gym types, Eclipse motives and legendary capture conditions are not inferred.
const STORY_STRUCTURE=Object.freeze({gymCount:8,firstGym:'Grass',eliteFourCount:4,championRole:'evolving rival',antagonist:'Team Eclipse',legendaryTypes:['Dragon','Primordial','Beast']});
function normalizeStoryState(){
 const old=s.story&&typeof s.story==='object'&&!Array.isArray(s.story)?s.story:{};
 const flags=old.flags&&typeof old.flags==='object'&&!Array.isArray(old.flags)?old.flags:{};
 s.story={...old,flags};
 if(s.introComplete)flags.tutorial=true;
 if(s.rivalPassed)flags.gardenRival=true;
 if(s.defeated?.rival)flags.rivalVictory=true;
 if(s.badges>=1)flags.grassBadge=true;
}
function storyFlag(id){return !!s.story?.flags?.[id]}
function markStory(id){normalizeStoryState();if(storyFlag(id))return false;s.story.flags[id]=true;save();return true}
function storyScene(id,lines,callback){
 if(storyFlag(id)){if(callback)callback();return false}
 say(lines,()=>{markStory(id);if(callback)callback()});return true;
}
function researcherStoryDialogue(){
 if(!s.starter)return say(['Welcome to the research laboratory!','Your Critter Index is a capture device, inventory and party manager.','Choose a Rock, Water or Electric starter.'],starterMenu);
 if(!s.introComplete)return say(['Researcher: Let us finish your introductory training match.'],()=>startTrainer('tutorial'));
 if(s.badges>=1&&!storyFlag('researchDebrief'))return storyScene('researchDebrief',[
  'Researcher: Congratulations on earning your first badge.',
  'There are eight regional Gyms. Every challenge will help you grow alongside your Critters.',
  'Our archives contain accounts of three legendary Critters. Their full story remains a subject of research.',
  'Researcher: If you hear the name Team Eclipse during your travels, remember it.'
 ]);
 return say(['Researcher: Your Critter Index is functioning well. Good luck!']);
}
function rivalGardenScene(){
 if(s.rivalPassed)return;
 s.rivalPassed=true;normalizeStoryState();save();
 say(['Your childhood rival greets you outside the Grass Gym.','Rival: We have both come a long way since the laboratory.','Rival: Let us see how much we have improved!'],()=>startTrainer('rival'));
}
function storyGrassBadgeScene(){
 if(s.badges<1)return;
 storyScene('grassCeremony',[
  'Grass Gym Leader: You have earned the first of the eight regional badges.',
  'Grass Gym Leader: Your Critter Index vegetation cutter is now unlocked.',
  'Grass Gym Leader: Keep exploring. Your journey is only beginning.'
 ]);
}
function tickStoryScenes(){
 if(!s||screen!=='game'||modal||battle||worldTransitionBusy||doorTransition||narratorBlocking()||trainerApproachLocked())return;
 if(s.area==='gym'&&s.badges>=1&&!storyFlag('grassCeremony'))storyGrassBadgeScene();
}
function storyArchiveDialogue(){
 return say(['The archive contains references to three legendary Critters: Dragon, Primordial and Beast.','The records do not reveal their full history or how to approach them.']);
}
function noteOpeningEvent(key){
 s.earlyJourney=s.earlyJourney&&typeof s.earlyJourney==='object'?s.earlyJourney:{};
 if(!s.earlyJourney[key]){s.earlyJourney[key]=true;save()}
}
function earlyBattleTip(){
 if(!battle)return '';
 if(battle.kind==='tutorial')return '<p class="openingTip">Training match: Try your starter’s attacks! Everyone will be healed afterward.</p>';
 if(battle.id==='rt1'&&!s.defeated?.rt1)return '<p class="openingTip">Trainer tip: Guard, switch Critters, or use a Potion if you need to.</p>';
 return '';
}

function starterMenu(){
 const choices=[['Water','Drizzlet','assets/critters/starters/water.png'],['Rock','Craglet','assets/critters/starters/rock.png'],['Electric','Sparkin','assets/critters/starters/electric.png']];
 open('Choose Your Starter','<p>Choose your first partner. The Critter Index holds your team, inventory, and capture beam.</p><div class="options starterChoices">'+choices.map(([type,name,path])=>'<button class="btn starterChoice" data-starter="'+type+'"><img src="'+path+'" alt="'+name+'" class="starterChoiceSprite"><strong>'+name+'</strong><small>'+type+' type</small></button>').join('')+'</div><p class="muted">Water beats Rock · Rock beats Electric · Electric beats Water</p>');
 document.querySelectorAll('[data-starter]').forEach(b=>b.onclick=()=>{s.starter=b.dataset.starter;const starterId=starterSpeciesId(s.starter);
  const partner=critter(starterId,5);
  if(!speciesRegistry.has(starterId)){partner.speciesId=starterId;partner.name={Water:'Drizzlet',Rock:'Craglet',Electric:'Sparkin'}[s.starter]||s.starter+' Starter';partner.type=s.starter;partner.types=[s.starter]}
  partner.starterOrigin=true;s.party=[partner];s.rival={Rock:'Water',Water:'Electric',Electric:'Rock'}[s.starter];save();close();say(['Your '+s.starter+' starter joins your Critter Index.','Your rival chooses '+s.rival+' — the advantageous starter type.','This is a friendly match. Your whole team will be healed afterward!'],()=>startTrainer('tutorial'))})
}
// World / encounter balancing (v31) — area-specific encounter density, species
// rarity, wild level ranges, and tiny novelty/time-of-day influences.
// None of these alter type strengths, battle turns, or party storage rules.
// Regional pacing: early routes remain gentle, while post-badge visits gradually
// reveal higher-level habitats. The authored species/habitat JSON is untouched.
const WILD_AREA_BALANCE={
 route1:{stepRate:.075,levels:[2,5],weights:{common:16,uncommon:4,rare:.7,legendary:0},novelty:1.6},
 route2:{stepRate:.09,levels:[5,10],weights:{common:14,uncommon:5,rare:1,legendary:0},novelty:1.5},
 forest:{stepRate:.105,levels:[7,14],weights:{common:12,uncommon:5,rare:1.35,legendary:.025},novelty:1.55},
 route3:{stepRate:.10,levels:[10,18],weights:{common:12,uncommon:5.5,rare:1.5,legendary:.03},novelty:1.45},
 garden:{stepRate:.08,levels:[12,20],weights:{common:14,uncommon:4.5,rare:1.25,legendary:0},novelty:1.5},
 cave:{stepRate:.11,levels:[15,22],weights:{common:11,uncommon:5.5,rare:1.8,legendary:.04},novelty:1.4}
};
function activeWildLevelRange(area){
 const config=WILD_AREA_BALANCE[area];
 if(!config)return null;
 // Optional wilderness revisits grow tougher after earning additional badges.
 const bonus=Math.max(0,Math.min(12,((s?.badges||0)-1)*2));
 return [config.levels[0],config.levels[1]+bonus];
}
function effectiveWildHabitat(sp,area){
 const habitat=sp.habitats?.find(h=>h.areaId===area);
 const range=activeWildLevelRange(area);
 if(!habitat||!range||!Number.isFinite(habitat.minLevel)||!Number.isFinite(habitat.maxLevel))return null;
 const min=Math.max(1,Math.ceil(habitat.minLevel),range[0]),max=Math.min(Math.floor(habitat.maxLevel),range[1]);
 return min<=max?{...habitat,minLevel:min,maxLevel:max}:null;
}
// Every resident species within an area's current habitat/level limits is
// eligible from the first encounter. Rarity and location determine its chance,
// never the number of prior encounters or battles.
// Authored opt-in only. Absent conditions mean unrestricted.
function encounterConditionsLabel(c){
 if(!c)return '';
 const parts=[];if(Array.isArray(c.times)&&c.times.length)parts.push('Time: '+c.times.join(', '));
 if(Array.isArray(c.weather)&&c.weather.length)parts.push('Weather: '+c.weather.join(', '));
 return parts.length?' · '+escapeHtml(parts.join(' / ')):'';
}
function encounterConditionsAllow(conditions,area,hour=worldHour(),weather=regionalWeather(area)){
 if(!conditions||typeof conditions!=='object')return true;
 const times=conditions.times,weathers=conditions.weather;
 const phase=hour<5||hour>=20?'night':hour<7?'dawn':hour<17?'day':'dusk';
 return (!Array.isArray(times)||!times.length||times.includes(phase))&&
  (!Array.isArray(weathers)||!weathers.length||weathers.includes(weather));
}
function encounterSpeciesFor(area){
 return [...speciesRegistry.values()].filter(sp=>{
  const h=effectiveWildHabitat(sp,area);
  return h&&encounterConditionsAllow(sp.encounterConditions,area)&&encounterConditionsAllow(h.encounterConditions,area);
 });
}
function wildHabitat(sp,area){return effectiveWildHabitat(sp,area)}
function encounterWeight(sp,area){
 const config=WILD_AREA_BALANCE[area];if(!config)return 0;
 const habitat=wildHabitat(sp,area);if(!habitat)return 0;
 const rarity=habitat.rarity||'common';
 let weight=config.weights[rarity]||0;
 // Legendary Critters remain rare and do not appear before the first badge.
 if(rarity==='legendary'&&(s.badges||0)<1)return 0;
 const known=discoveryStatus(sp.speciesId);
 if(known==='unseen')weight*=config.novelty;
 else if(known==='captured')weight*=.9;
 return Math.max(0,weight);
}
function chooseWildSpecies(area,roll=Math.random()){
 const pool=encounterSpeciesFor(area),weights=pool.map(sp=>{const weight=encounterWeight(sp,area);const rarity=wildHabitat(sp,area)?.rarity;return SECRET_AREAS[s?.area]?.parent===area&&['grotto','cavern'].includes(s.area)&&rarity==='rare'?weight*1.5:weight});
 const total=weights.reduce((a,b)=>a+b,0);if(total<=0)return null;
 let target=Math.max(0,Math.min(.999999999,roll))*total;
 for(let i=0;i<pool.length;i++){target-=weights[i];if(target<0)return pool[i]}
 for(let i=pool.length-1;i>=0;i--)if(weights[i]>0)return pool[i];return null;
}
function wildEncounterChance(area){return WILD_AREA_BALANCE[SECRET_AREAS[area]?.parent||area]?.stepRate||0}
function areaTypes(){return {route1:['Grass','Water','Flying'],route2:['Grass','Flying','Venom'],forest:['Grass','Ghost','Shadow'],route3:['Rock','Electric','Fighting'],cave:['Rock','Ghost','Ice'],garden:['Grass','Water','Psychic']}[s.area]||['Grass']}
function startWild(){
 if(firstAlive()<0)return blackout();
 s.wildStepsSinceEncounter=0;
 const encounterArea=SECRET_AREAS[s.area]?.parent||s.area;
 const choice=chooseWildSpecies(encounterArea);
 if(choice){
  const h=wildHabitat(choice,encounterArea);
  const min=Math.max(1,Math.floor(h.minLevel)),max=Math.max(min,Math.floor(h.maxLevel));
  const level=min+Math.floor(Math.random()*(max-min+1));
  const foe=critter(choice.speciesId,level);
  return startBattle({kind:'wild',enemies:[foe],name:'Wild Critter',award:0},'A wild '+choice.name+' appeared!');
 }
 if(speciesRegistry.size)return; // Never bypass authored conditions with a placeholder.
 // If the registry is unavailable (for example while offline), preserve the
 // original placeholder encounter behavior rather than silently removing battles.
 const types=areaTypes(),type=types[Math.floor(Math.random()*types.length)];
 const level=s.area==='route1'?2+Math.floor(Math.random()*4):s.area==='route2'?5+Math.floor(Math.random()*6):10+Math.floor(Math.random()*8);
 return startBattle({kind:'wild',enemies:[critter(type,level)],name:'Wild Critter',award:0},'A wild '+type+' type Critter appeared!');
}
// Trainers use the authored species library in their home habitats. Starter
// placeholders remain intact until the creators assign official starter designs.
function trainerSpecies(type,level,area,trainerId,slot,used){
 const candidates=[...speciesRegistry.values()].filter(sp=>
  sp.types.includes(type)&&sp.habitats?.some(h=>h.areaId===area&&h.rarity!=='legendary')
  &&!used.has(sp.speciesId));
 if(!candidates.length)return critter(type,level);
 candidates.sort((a,b)=>a.speciesId.localeCompare(b.speciesId));
 const seed=trainerId+':'+slot+':'+type;
 let hash=0;for(const char of seed)hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;
 const chosen=candidates[hash%candidates.length];
 used.add(chosen.speciesId);
 return critter(chosen.speciesId,level);
}
function rivalPartnerAtLevel(level){
 let id=starterSpeciesId(s.rival),seen=new Set();
 while(id&&!seen.has(id)){seen.add(id);const rule=speciesRegistry.get(id)?.evolvesTo;if(!rule||!Number.isFinite(rule.minLevel)||level<rule.minLevel||rule.item||rule.stone||rule.condition||!speciesRegistry.has(rule.speciesId))break;id=rule.speciesId}
 return critter(id,level);
}
function startTrainer(id){
 if(firstAlive()<0)return blackout();
 const area=id.startsWith('rt')?({rt1:'route1',rt2:'route2',rt3:'route3'}[id]||'route2'):'garden';
 const used=new Set();
 const make=(t,l)=>trainerSpecies(t,l,area,id,used.size,used);
 let enemies,name,award,kind='trainer';
 if(id==='tutorial'){enemies=[rivalPartnerAtLevel(5)];name='Childhood Rival';award=0;kind='tutorial'}
 else if(id==='rival'){enemies=[rivalPartnerAtLevel(12),make('Fighting',10),make('Flying',14)];name='Childhood Rival';award=65}
 else if(id==='quest-garden'){if(s.sideQuests?.['garden-challenge']?.status!=='active'||s.sideQuests['garden-challenge'].won)return;enemies=[make('Grass',10),make('Water',11)];name='Garden Caretaker';award=0}
 else if(id==='leader'){enemies=[make('Grass',13),make('Grass',15),make('Grass',16),make('Grass',18)];name='Grass Gym Leader';award=180}
 else if(id.startsWith('rt')){const n=Number(id.slice(2)),up=s.defeated[id]?2:0;enemies=n===1?[make('Flying',4+up)]:n===2?[make('Flying',7+up),make('Grass',7+up)]:[make('Rock',10+up),make('Electric',11+up)];name='Route Trainer '+n;award=20+n*15}
 else {const n=Number(id.slice(1));enemies=[make('Grass',8+n),make(n===2?'Venom':'Grass',9+n)];name='Garden Trainer '+n;award=35+n*10}
 startBattle({kind,enemies,name,award,id},name+' challenges you!')
}

// Battle Phase 2: each side takes a complete team turn. Trainer doubles are
// two active Critters per side; wild, tutorial, rival, and first gym stay 1v1.
// Snapshot the battlefield's actual overworld context before opening the modal.
const BATTLE_AREAS=['village','route1','town','route2','forest','route3','cave','garden','gym','lab','home','neighbor'];
const BATTLE_AREA_LABELS={village:'Starting Village',route1:'Rice Fields',town:'First Town',route2:'Bamboo Trail',forest:'Hidden Forest',route3:'Mountain Foothills',cave:'Mountain Cave',garden:'Garden Town',gym:'Grass Gym',lab:'Research Laboratory',home:'Player Home',neighbor:'Village Home'};
function battleEnvironment(){
 const sourceArea=SECRET_AREAS[s.area]?.parent||s.area;
 const area=BATTLE_AREAS.includes(sourceArea)?sourceArea:'route1';
 const tile=tiles?.[s.y]?.[s.x];
 const terrain=tile===T.rice?'rice':tile===T.tall?'grass':tile===T.stone?'stone':tile===T.flower?'flowers':tile===T.path?'path':tile===T.water?'water':'field';
 return {area,terrain,phase:worldPhase()};
}
function startBattle(data,msg){
 if(worldTransitionBusy)return;
 if(firstAlive()<0){if(s.party.some(p=>!isEgg(p)))return blackout();return notifyWorld('You need a battle-capable Critter in your party.');}
 fadeWorldChange(()=>beginBattleAfterFade(data,msg));
}
function beginBattleAfterFade(data,msg){
 const doubles=data.kind==='trainer'&&['rt2','rt3'].includes(data.id)&&s.party.filter(p=>!isEgg(p)&&p.hp>0).length>=2&&data.enemies.length>=2;
 const allySlots=s.party.map((p,i)=>!isEgg(p)&&p.hp>0?i:-1).filter(i=>i>=0).slice(0,doubles?2:1);
 data.enemies.forEach(p=>{normalizeMoves(refreshSpeciesMetadata(p));noteCritterSeen(p)});
 if(data.kind==='wild'&&s.area==='route1')noteOpeningEvent('firstEncounter');
 save();
 battle={...data,mode:doubles?2:1,allySlots,enemySlots:data.enemies.map((p,i)=>i).slice(0,doubles?2:1),
  nextEnemy:doubles?2:1,participants:[...allySlots],pending:[],acting:0,turn:1,phase:'choose',lastTurnLog:[],
  guards:{},focus:{},feedback:msg,impact:'',criticalSide:'',lastTarget:null,uiMenu:'root',environment:battleEnvironment()};
 renderBattle(msg);
}
function itemQty(name){return s.inventory[name]||0}
function activeAllies(){return battle.allySlots.filter(i=>s.party[i]&&s.party[i].hp>0)}
function activeEnemies(){return battle.enemySlots.filter(i=>battle.enemies[i]&&battle.enemies[i].hp>0)}
function activeEnemyDefault(){return activeEnemies()[0]}
function claimParticipant(i){if(!battle.participants.includes(i))battle.participants.push(i)}
function hpCard(p,side,active=false){
 if(!p)return '';
 const pct=Math.max(0,Math.round(100*p.hp/Math.max(1,p.maxHp))),low=pct<=25;
 return '<div class="combatCard '+side+(active?' active':'')+(p.hp<=0?' fainted':'')+'">'
  +'<div class="combatCardHead"><strong>'+(symbols[p.type]||'◇')+' '+escapeHtml(p.name||p.type)+critterGenderLabel(p)+'</strong><small>Lv '+p.level+'</small></div>'
  +'<div class="health"><div class="'+(low?'low':'')+'" style="width:'+pct+'%"></div></div>'
  +'<div class="combatCardFoot">HP '+p.hp+'/'+p.maxHp+(p.hp===0?' · Fainted':'')+' · '+escapeHtml(defendTypes(p).join('/'))+'</div></div>';
}
// Only approved starter species have rear battle artwork. Keep Index and enemy fronts unchanged.
const STARTER_REAR_BATTLE_SPRITES=Object.freeze({
 'cr-001-starter-water-1':'water-starter-stage-1-back.png',
 'cr-002-starter-water-2':'water-starter-stage-2-back.png',
 'cr-003-starter-water-3':'water-starter-stage-3-back.png',
 'cr-004-starter-rock-1':'rock-starter-stage-1-back.png',
 'cr-005-starter-rock-2':'rock-starter-stage-2-back.png',
 'cr-006-starter-rock-3':'rock-starter-stage-3-back.png',
 'cr-007-starter-electric-1':'electric-starter-stage-1-back.png',
 'cr-008-starter-electric-2':'electric-starter-stage-2-back.png',
 'cr-009-starter-electric-3':'electric-starter-stage-3-back.png'
});
function battleFigureArtwork(p,side){
 const rearFile=side==='ally'?STARTER_REAR_BATTLE_SPRITES[p?.speciesId]:null;
 if(rearFile){
  const path='assets/critters/battle-backs/starters/'+rearFile;
  const fallback=critterSpritePath(p);
  // If a cached deployment does not yet have its rear asset, retain the approved front sprite.
  return '<img class="combatSprite combatSpriteRear" src="'+path+'" alt="'+escapeHtml(p.name||speciesFor(p)?.name||'Critter')+' (rear view)" decoding="async"'+
   (fallback?' onerror="this.onerror=null;this.src=\''+fallback+'\'";':'')+'>';
 }

 const art=speciesFor(p)?.art;
 const variant=p?.gender&&art?.genderVariants?.[p.gender];
 const rearPath=side==='ally'&&completeCritterArt(art)?(variant?.rearSpritePath||art.rearSpritePath):null;
 if(typeof rearPath==='string'&&rearPath.startsWith('assets/critters/')&&rearPath.endsWith('.png')&&!rearPath.includes('..')){
  const fallback=critterSpritePath(p);
  return '<img class="combatSprite combatSpriteRear" src="'+escapeHtml(rearPath)+'" alt="'+escapeHtml(p.name||speciesFor(p)?.name||'Critter')+' (rear view)" decoding="async"'+
   (fallback?' onerror="this.onerror=null;this.src=&quot;'+fallback+'&quot;"':'')+'>';
 }
 return critterSpriteTag(p,'combatSprite')||'<span class="combatSymbol">'+(symbols[p.type]||'✦')+'</span>';
}
function sceneFigure(p,side,i){
 if(!p)return '';
 const fx=battle.lastVfx,attacking=fx?.side===side&&fx.actorIndex===i,receiving=fx?.targetSide===side&&fx.targetIndex===i&&!fx.missed;
 if(p.hp<=0&&!receiving)return '';
 return '<div class="combatFigure '+side+(attacking?' actingFx':'')+(receiving?' receivingFx':'')+(p.hp<=0?' faintFx':'')+' '+(battle.impact===side&&battle.lastTarget===i?'hit':'')+'" aria-label="'+escapeHtml(p.name||p.type)+'">'
  +battleFigureArtwork(p,side)+(receiving?'<span class="targetImpact" aria-hidden="true"></span>':'')+'</div>';
}
function battleVisual(){
 const fx=battle?.lastVfx;
 if(!fx)return '';
 const safeType=String(fx.type||'Typeless').replace(/[^a-zA-Z]/g,'');
 const direction=fx.side==='enemy'?'reverse':'forward';
 const typeClass='vfx-'+safeType.toLowerCase()+' fx-'+(fx.category==='physical'?'physical':fx.category==='status'?'status':'special')+(fx.targetSide===fx.side?' fx-support':'');
 return '<div class="battleVfx '+typeClass+' '+direction+(fx.missed?' missed':'')+'" aria-hidden="true">'
  +'<span class="battleVfxBeam"></span><span class="battleVfxCore"></span><span class="battleVfxBurst"></span>'
  +'<span class="battleVfxParticles"></span><span class="battleVfxLabel">'+escapeHtml(fx.name||'Attack')+'</span></div>';
}
// Eight approved, creature-free cinematic backgrounds, selected by saved area.
const BATTLE_SCENE_ART={
 village:'rice',route1:'rice',route2:'bamboo',forest:'hidden-forest',
 route3:'foothills',cave:'cave',town:'town',garden:'town',
 gym:'gym',lab:'laboratory'
};
function battleEnvironmentClass(){
 const env=battle?.environment||{area:'route1',terrain:'field',phase:'Day'};
 const art=BATTLE_SCENE_ART[env.area];
 return 'arena-'+env.area+' terrain-'+env.terrain+' phase-'+env.phase.toLowerCase()
  +(art?' scene-image scene-'+art:'');
}
function battleHeader(moveOverlay=''){
 const ally=battle.allySlots.map((i,slot)=>hpCard(s.party[i],'ally',battle.phase==='choose'&&slot===battle.acting)).join('');
 const foe=battle.enemySlots.map(i=>hpCard(battle.enemies[i],'enemy')).join('');
 const their=battle.enemySlots.map(i=>sceneFigure(battle.enemies[i],'enemy',i)).join('');
 const ours=battle.allySlots.map(i=>sceneFigure(s.party[i],'ally',i)).join('');
 const scene=battle.environment||{area:'route1',phase:'Day'};
 return '<div class="combatTop"><span>'+(battle.mode===2?'2v2 TRAINER BATTLE':'1v1 BATTLE')+' · '+escapeHtml(BATTLE_AREA_LABELS[scene.area]||'Wildlands')+'</span><span>TEAM TURN '+battle.turn+'</span></div>'
  +'<div class="combatRoster"><div><div class="rosterTitle">'+battleTrainerPortrait(battle.id)+'OPPONENT TEAM</div>'+foe+'</div></div>'
  +'<div class="combatArena '+battleEnvironmentClass()+(battle.mode===2?' arena-doubles':'')+'"><div class="battleScenery" aria-hidden="true"><span class="sceneryCloud cloudA"></span><span class="sceneryCloud cloudB"></span><span class="sceneryTree treeA"></span><span class="sceneryTree treeB"></span><span class="sceneryTree treeC"></span><span class="sceneDetail detailA"></span><span class="sceneDetail detailB"></span><span class="sceneStructure"></span></div><div class="combatSide enemies">'+their+'</div><div class="combatSide allies">'+ours+'</div>'+battleVisual()+moveOverlay+'</div>'
  +'<div class="combatAllyStatus" aria-label="Your active Critter health">'+ally+'</div>';
}

// Battle dialogue uses fast typewriter text. The first tap completes the line;
// subsequent taps advance only once the current attack effect has finished.
let combatNarratorState=null,combatNarratorTick=null,combatNarratorDelay=null;
function clearCombatNarrator(){
 if(combatNarratorTick!==null){clearInterval(combatNarratorTick);combatNarratorTick=null;}
 if(combatNarratorDelay!==null){clearTimeout(combatNarratorDelay);combatNarratorDelay=null;}
 combatNarratorState=null;
}
function attachCombatNarrator(){
 const el=document.querySelector?.('#shade .combatMessage');
 if(!el)return;
 clearCombatNarrator();
 const full=String(battle?.feedback||'Choose an action.');
 const state={text:full,shown:0,ready:true,advance:null,typed:false};
 combatNarratorState=state;
 el.textContent='';
 el.setAttribute('role','button');
 el.setAttribute('tabindex','0');
 el.setAttribute('aria-label','Battle narrator. Tap to finish typing or skip ahead.');
 const advance=()=>{
  if(combatNarratorState!==state||!state.typed||!state.ready||!state.advance)return;
  if(combatNarratorDelay!==null){clearTimeout(combatNarratorDelay);combatNarratorDelay=null;}
  const cb=state.advance;state.advance=null;cb();
 };
 const scheduleAdvance=()=>{
  if(combatNarratorState!==state||!state.typed||!state.advance||combatNarratorDelay!==null)return;
  combatNarratorDelay=setTimeout(()=>{
   combatNarratorDelay=null;
   if(combatNarratorState!==state||!state.advance)return;
   if(state.ready)advance();
   else scheduleAdvance(); // Never cut a move animation short.
  },1000);
 };
 state.scheduleAdvance=scheduleAdvance;
 const finish=()=>{
  if(combatNarratorState!==state)return;
  state.shown=full.length;state.typed=true;el.textContent=full;
  if(combatNarratorTick!==null){clearInterval(combatNarratorTick);combatNarratorTick=null;}
  scheduleAdvance();
 };
 el.onclick=()=>{
  if(combatNarratorState!==state)return;
  if(!state.typed)finish();
  else advance(); // Optional manual skip; battles also progress on their own.
 };
 el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.onclick();}};
 if(!full){finish();return;}
 combatNarratorTick=setInterval(()=>{
  if(combatNarratorState!==state){clearInterval(combatNarratorTick);combatNarratorTick=null;return;}
  state.shown=Math.min(full.length,state.shown+2);
  el.textContent=full.slice(0,state.shown);
  if(state.shown===full.length)finish();
 },18);
}
function narrateCombatLine(text,moveEffect=null){
 if(!battle)return Promise.resolve();
 battle.feedback=text;
 // The move's VFX is inserted only for its own narration, never repeated
 // by subsequent HP/effectiveness lines or later menu interactions.
 battle.lastVfx=moveEffect;
 if(!moveEffect){battle.impact='';battle.lastTarget=null;}
 renderBattle();
 return new Promise(resolve=>{
  const state=combatNarratorState;
  if(!state){resolve();return;}
  state.ready=!moveEffect;
  state.advance=resolve;
  // Narration auto-advances one second after typing completes.
  // A move must also finish its attack animation before advancing.
  state.scheduleAdvance();
  if(moveEffect){
   setTimeout(()=>{if(combatNarratorState===state)state.ready=true;},820);
  }
 });
}
async function narrateCombatEvents(entries,moveEffect){
 for(let n=0;n<entries.length;n++){
  if(!battle)return;
  // A move's attack animation runs with its "uses" announcement.
  const line=entries[n];
  const moveAnnouncement=/\suses\s.+\.$/.test(line)||/\sused\s.+\.$/.test(line);
  await narrateCombatLine(line,moveEffect&&moveAnnouncement?moveEffect:null);
  if(!battle)return;
 }
 if(battle){battle.lastVfx=null;battle.impact='';battle.lastTarget=null;}
}

function battleMessage(msg){return '<div class="combatMessage" role="status">'+escapeHtml(msg||battle.feedback||'Choose your actions.')+'</div>'}
function battleMainActions(mode){
 return '<div class="classicMenu classicMainMenu">'
  +'<button class="btn classicBattle" id="menuBattle" aria-pressed="'+(mode==='battle')+'">Attack</button>'
  +'<button class="btn classicIndex" id="menuUse">Use</button>'
  +'<button class="btn classicCritters" id="menuCritters">Critters</button>'
  +'<button class="btn classicEscape" id="menuEscape" '+(battle.kind!=='wild'?'disabled title="Cannot escape a trainer battle"':'')+'>Escape</button></div>'
  +(battle.kind!=='wild'?'<p class="classicFootnote">Escape is unavailable against trainers.</p>':'');
}
function renderBattle(message){
 if(!battle)return;
 if(typeof message==='string')battle.feedback=message;
 const i=battle.allySlots[battle.acting],actor=s.party[i];
 const targets=activeEnemies();
 const queued=battle.pending.map(q=>{
  const p=s.party[q.actor];return (p?.name||p?.type||'Critter')+' → '+(q.kind==='move'?getMove(p,q.moveId).name:q.kind);
 }).join(' · ');
 const mode=battle.uiMenu||'root';
 let actions='',moveOverlay='';
 if(battle.phase==='choose'&&actor&&actor.hp>0){
  normalizeMoves(actor);
  const allMoves=actor.moves.filter(id=>validMove(id));
  const noUsableMoves=!allMoves.some(id=>(actor.movePP[id]||0)>0);
  if(mode==='battle'){
   const moveButtons=allMoves.flatMap(id=>{
    const m=getMove(actor,id),remaining=actor.movePP[id]||0;
    const targetsForMove=m.target==='enemy'?targets:
     m.target==='ally'?activeAllies():[i];
    const choices=targetsForMove.length?targetsForMove:(m.target==='ally'?[i]:m.target==='enemy'?[]:[i]);
    return choices.map(target=>{
     const who=m.target==='enemy'?(battle.enemies[target]?.name||battle.enemies[target]?.type):m.target==='ally'?(s.party[target]?.name||s.party[target]?.type):'';
     const type=String(m.type||'Typeless').toLowerCase().replace(/[^a-z]/g,'');
     return '<button class="btn combatAttack battleMove type-'+type+'" data-use-move="'+escapeHtml(id)+'" data-move-target="'+target+'" '
      +(remaining===0?'disabled':'')+' title="'+escapeHtml(m.description||'')+'">'
      +'<span class="moveName">'+escapeHtml(m.name)+'</span>'
      +'<span class="moveMeta">'+escapeHtml(m.type)+' · '+remaining+'/'+m.pp+' PP'+(who?' · '+escapeHtml(who):'')+'</span></button>';
    });
   }).join('')+(noUsableMoves?'<button class="btn combatAttack battleMove type-typeless" data-use-move="opening-flick" data-move-target="'+(targets[0]??i)+'"><span class="moveName">Last Resort</span><span class="moveMeta">No PP needed</span></button>':'');
   moveOverlay='<div class="battleMovesAround" role="group" aria-label="Moves for '+escapeHtml(actor.name||actor.type)+'">'+moveButtons+'</div>';
   // Attack reveals move choices around the Critter, without a secondary popup.
   // Keep the four commands visible so Attack can toggle the moves closed.
   actions=battleMainActions('battle');
  }else if(mode==='index'){
   actions='<div class="classicMenu classicIndexMenu"><button class="btn" id="indexSwitch">↔ Switch Critter</button>'
     +'<button class="btn" id="indexItem">▣ Use Item</button>'
     +beamBattleButton('indexCapture')
     +'<button class="btn" id="battleBack">Back</button></div>';
  }else if(mode==='items'){
   actions='<div class="classicMenu classicItemsMenu">'
     +'<button class="btn" id="potion" '+(!itemQty('Potion')?'disabled':'')+'>Potion · '+itemQty('Potion')+'</button>'
     +'<button class="btn" id="revive" '+(!itemQty('Revive')||!s.party.some(q=>q.hp===0)?'disabled':'')+'>Revive · '+itemQty('Revive')+'</button>'
     +'<button class="btn" id="battleBack">Back</button></div>';
  }else{
   actions=battleMainActions('root');
  }
 }
 open(battle.kind==='wild'?'Wild Encounter':battle.name,battleHeader(moveOverlay)+battleMessage(battle.feedback)
  +(queued?'<div class="combatQueue"><b>Queued:</b> '+escapeHtml(queued)+'</div>':'')
  +actions+(battle.phase==='choose'&&battle.pending.length?'<button class="btn" id="undoBattleAction">Undo previous action</button>':'')+recentBattleLog()+earlyBattleTip());
 // A resolved move should animate exactly once. Keep the current DOM's effect,
 // but do not reinsert it on every later Battle/Index/Back menu redraw.
 battle.lastVfx=null;
 battle.impact='';
 battle.lastTarget=null;
 $('close').hidden=true;
 attachCombatNarrator();
 if(battle.phase!=='choose')return;
 const undo=$('undoBattleAction');if(undo)undo.onclick=()=>{battle.pending.pop();battle.acting=Math.max(0,battle.acting-1);battle.uiMenu='root';renderBattle('Previous action removed. Choose again.')};
 const menuTo=(next)=>{battle.uiMenu=next;renderBattle()};
 if($('menuBattle'))$('menuBattle').onclick=()=>{
  const next=mode==='battle'?'root':'battle';
  battle.uiMenu=next;
  renderBattle(next==='battle'?'Choose a move…':'Choose an action.');
 };
 if($('menuUse'))$('menuUse').onclick=()=>openBattleIndex('items');
 if($('menuCritters'))$('menuCritters').onclick=()=>openBattleIndex('clock');
 if($('menuEscape'))$('menuEscape').onclick=attemptWildEscape;
 if($('battleBack'))$('battleBack').onclick=()=>menuTo(mode==='items'?'index':'root');
 document.querySelectorAll('[data-use-move]').forEach(el=>el.onclick=()=>{
  const moveId=el.dataset.useMove,target=Number(el.dataset.moveTarget);
  if(!validMove(moveId)||((actor.movePP[moveId]||0)<1&&!(moveId==='opening-flick'&&noUsableMoves)))return;
  queueBattleAction({kind:'move',moveId,target});
 });
 if($('indexSwitch'))$('indexSwitch').onclick=selectPoke;
 if($('indexItem'))$('indexItem').onclick=()=>menuTo('items');
 if($('indexCapture'))$('indexCapture').onclick=()=>{if(battle.kind==='wild')queueBattleAction({kind:'capture'})};
 if($('potion'))$('potion').onclick=()=>{if(itemQty('Potion'))queueBattleAction({kind:'potion',target:i})};
 if($('revive'))$('revive').onclick=()=>{if(itemQty('Revive')&&s.party.some(q=>q.hp===0))selectRevive()};
}

// Escape is a synchronous world transition, not a narrated combat action.
function finishWildEscape(){
 if(!battle||battle.kind!=='wild')return false;
 battle=null;modal=false;
 clearCombatNarrator();clearWorldNarrator();
 clearTimeout(worldFadeTimer);worldFadeTimer=null;worldTransitionBusy=false;doorTransition=null;
 $('worldFade')?.classList.remove('active');
 $('shade').classList.remove('show');
 $('modalBody').innerHTML='';$('close').hidden=false;
 releaseMovement();atmospherePreviousFrame=0;canvasSizeDirty=true;
 save();notifyWorld('You escaped safely.');
 return true;
}
function attemptWildEscape(){
 if(!battle||battle.kind!=='wild'||battle.phase!=='choose')return false;
 if(Math.random()<.82)return finishWildEscape();
 queueBattleAction({kind:'failedEscape'});return false;
}
function queueBattleAction(action){
 if(action.kind==='run')return attemptWildEscape();
 if(!battle||battle.phase!=='choose')return;
 const actor=battle.allySlots[battle.acting];
 if(actor==null||!s.party[actor]||s.party[actor].hp<=0)return;
 if(action.kind==='capture'&&!canFireBeam())return;
 if(action.kind==='move'){
  const pp=s.party[actor].movePP||{};
  const hasMoves=(s.party[actor].moves||[]).some(id=>(pp[id]||0)>0);
  const chosen=validMove(action.moveId);
   if(!chosen||((pp[action.moveId]||0)<=0&&(action.moveId!=='opening-flick'||hasMoves)))return;
   if(chosen.target==='enemy'&&!activeEnemies().includes(action.target))return;
   if(chosen.target==='ally'&&action.target!==actor&&!activeAllies().includes(action.target))return;
 }
 if(action.kind==='switch'){
   if(!Number.isInteger(action.target)||!s.party[action.target]||s.party[action.target].hp<=0
    ||battle.allySlots.includes(action.target)
    ||battle.pending.some(q=>q.kind==='switch'&&q.target===action.target))return;
  }
  if(action.kind==='revive'&&(!Number.isInteger(action.target)||s.party[action.target]?.hp!==0||battle.pending.some(q=>q.kind==='revive'&&q.target===action.target)))return;
  const itemFor={potion:'Potion',ppPotion:'PP Potion',revive:'Revive'}[action.kind];
  if(itemFor&&battle.pending.filter(q=>({potion:'Potion',ppPotion:'PP Potion',revive:'Revive'}[q.kind])===itemFor).length>=itemQty(itemFor))return renderBattle('All available '+itemFor+' items are already queued. Choose another action.');
  if(action.kind==='ppPotion'){
   const p=s.party[actor],move=validMove(action.moveId);
   if(!itemQty('PP Potion')||action.target!==actor||!move||!p.moves.includes(action.moveId)
     ||(p.movePP?.[action.moveId]??move.pp)>=move.pp)return;
  }
  battle.pending.push({...action,actor});
 battle.indexOpen=false;
 battle.ppPicker=false;
 battle.uiMenu='root';
 battle.acting++;
 if(battle.acting<activeAllies().length){
  renderBattle(s.party[actor].type+' is ready. Choose the next Critter’s move.');
 }else resolveTeamTurn();
}
function selectPoke(){
 if(!battle||battle.phase!=='choose')return;
 const candidates=s.party.map((p,i)=>({p,i})).filter(({p,i})=>p.hp>0&&!battle.allySlots.includes(i)&&!battle.pending.some(q=>q.kind==='switch'&&q.target===i));
 const html=candidates.map(({p,i})=>'<button class="btn" data-poke="'+i+'">'+(symbols[p.type]||'◇')+' '+p.type+' Lv'+p.level+' · HP '+p.hp+'/'+p.maxHp+'</button>').join('');
 if(!html){battle.uiMenu='index';renderBattle('No available bench Critter to switch into.');return}
 open(battle.name,battleHeader()+battleMessage('Choose a healthy reserve Critter.')+'<div class="options classicSelector">'+html+'<button class="btn" id="cancelSelection">Back to Index</button></div>');
 $('close').hidden=true;
 document.querySelectorAll('[data-poke]').forEach(el=>el.onclick=()=>queueBattleAction({kind:'switch',target:Number(el.dataset.poke)}));
 $('cancelSelection').onclick=()=>{battle.uiMenu='index';renderBattle('Choose an action.')};
}
function selectRevive(){
 if(!battle||battle.phase!=='choose')return;
 const html=s.party.map((p,i)=>p.hp===0?'<button class="btn" data-revive="'+i+'">'+escapeHtml(p.type)+' · Lv '+p.level+'</button>':'').join('');
 if(battle.indexOpen){
  open('Critter Index · Revive','<div class="watchShell battleIndexShell"><div class="watchSectionTitle">Choose a fainted Critter</div><div class="options classicSelector">'+html+'</div><div class="watchFooter"><button class="btn primary" id="cancelSelection">Back to Index</button></div></div>');
 }else open(battle.name,battleHeader()+battleMessage('Choose a fainted Critter to revive.')+'<div class="options classicSelector">'+html+'<button class="btn" id="cancelSelection">Back to Items</button></div>');
 $('close').hidden=true;
 document.querySelectorAll('[data-revive]').forEach(el=>el.onclick=()=>{battle.indexOpen=false;queueBattleAction({kind:'revive',target:Number(el.dataset.revive)})});
 $('cancelSelection').onclick=()=>{if(battle.indexOpen)renderIndex();else{battle.uiMenu='items';renderBattle('Choose an action.')}};
}
function defeatFoe(i,log){
 const enemy=battle.enemies[i];if(!enemy)return;
 const recipients=[...new Set(battle.participants)].filter(index=>s.party[index]);
 const gain=Math.floor(enemy.level*13/Math.max(1,recipients.length));
 log.push((enemy.name||enemy.type)+' fainted! Participating Critters gain '+gain+' XP each.');
 recipients.forEach(index=>{
  const p=s.party[index],events=awardExperience(p,gain);
  log.push(...events);
 });
}

// One effect executor handles both player and AI; target indices are always
// indexed into the corresponding roster (supports the existing 1v1 and 2v2).
const STAGE_LIMIT=4;
function battleStages(side,index){
 battle.statStages=battle.statStages||{ally:{},enemy:{}};
 return battle.statStages[side][index]||(battle.statStages[side][index]={});
}
function statFactor(side,index,stat){
 const stage=battleStages(side,index)[stat]||0;
 return stage>=0?1+stage*.25:1/(1-stage*.25);
}
function enemySide(side){return side==='ally'?'enemy':'ally'}
function getRoster(side){return side==='ally'?s.party:battle.enemies}
function getCombatant(side,index){return getRoster(side)[index]||null}
function recordFaint(side,index,log){
 const p=getCombatant(side,index);
 if(!p||p.hp>0)return;
 if(side==='enemy')defeatFoe(index,log);
 else log.push((p.name||p.type)+' fainted!');
}
function runMoveEffect(effect,side,actorIndex,targetSide,targetIndex,log){
 if(!effect||!battle||Math.random()*100>=Math.min(100,Math.max(0,effect.chance??100)))return;
 const actor=getCombatant(side,actorIndex),target=getCombatant(targetSide,targetIndex);
 if(!actor||!target)return;
 const name=target.name||target.type;
 const stats=battleStages(targetSide,targetIndex);
 switch(effect.id){
  case 'raise_stat':
  case 'lower_stat':{
   const sign=effect.id==='raise_stat'?1:-1,stat=effect.stat||'attack',from=stats[stat]||0;
   stats[stat]=Math.max(-STAGE_LIMIT,Math.min(STAGE_LIMIT,from+sign*(effect.stages||1)));
   log.push(name+"'s "+stat.replace(/_/g,' ')+' '+(sign>0?'rose!':'fell!'));return;
  }
  case 'ailment':
   if(!target.status){
    target.status=effect.name||'affected';
    if(target.status==='entangle')stats.speed=Math.max(-STAGE_LIMIT,(stats.speed||0)-1);
    log.push(name+' is afflicted with '+target.status+'!');
   }
   return;
  case 'heal':{
   const healed=Math.min(target.maxHp-target.hp,Math.max(1,Math.floor(target.maxHp*(effect.fraction||.25))));
   target.hp+=Math.max(0,healed);log.push(name+' restored '+Math.max(0,healed)+' HP.');return;
  }
  case 'recoil':{
   const lost=Math.max(1,Math.floor(actor.maxHp*(effect.fraction||.2)));
   actor.hp=Math.max(0,actor.hp-lost);log.push((actor.name||actor.type)+' suffered '+lost+' recoil damage.');
   if(actor.hp===0)recordFaint(side,actorIndex,log);
   return;
  }
  case 'recharge':
   battle.recharges=battle.recharges||{ally:{},enemy:{}};
   battle.recharges[side][actorIndex]=Math.max(1,effect.turns||1);
   log.push((actor.name||actor.type)+' must recover next turn.');return;
  case 'terrain':
   battle.terrain={name:effect.name||'field',type:actor.type,turns:effect.turns||4};
   log.push('The '+battle.terrain.name.replace(/-/g,' ')+' spreads across the field!');return;
  case 'switch':{
   const slots=side==='ally'?battle.allySlots:battle.enemySlots;
   const spare=getRoster(side).findIndex((p,i)=>p.hp>0&&!slots.includes(i));
   const pos=slots.indexOf(actorIndex);
   if(spare>=0&&pos>=0){slots[pos]=spare;if(side==='ally')claimParticipant(spare);log.push((actor.name||actor.type)+' retreats to its team.');}
   return;
  }
  case 'guard':
   if(side==='ally')battle.guards[targetIndex]=true;
   else{battle.enemyGuards=battle.enemyGuards||{};battle.enemyGuards[targetIndex]=true;}
   log.push(name+' gains protective cover.');return;
  case 'team_guard':{
   const slots=side==='ally'?battle.allySlots:battle.enemySlots;
   for(const i of slots){
    if(side==='ally')battle.guards[i]=true;
    else{battle.enemyGuards=battle.enemyGuards||{};battle.enemyGuards[i]=true;}
   }
   log.push('The entire '+(side==='ally'?'player':'opposing')+' team braces!');return;
  }
  case 'team_buff':{
   const slots=side==='ally'?battle.allySlots:battle.enemySlots;
   for(const i of slots)if(getCombatant(side,i)?.hp>0){
    const obj=battleStages(side,i),stat=effect.stat||'attack';
    obj[stat]=Math.max(-STAGE_LIMIT,Math.min(STAGE_LIMIT,(obj[stat]||0)+(effect.stages||1)));
   }
   log.push('The '+(side==='ally'?'player':'opposing')+' team rallied!');return;
  }
  case 'cure_status':
   target.status='';log.push(name+' recovered from its status condition.');return;
  case 'reveal':
   stats.evasion=0;log.push(name+"'s concealment was exposed!");return;
 }
}
function performMove(actor,move,side,actorIndex,targetIndex,log){
 if(!battle||!actor||actor.hp<=0||!(side==='ally'?activeAllies():activeEnemies()).includes(actorIndex))return;
 const recharge=battle.recharges?.[side]?.[actorIndex]||0;
 if(recharge>0){
  battle.recharges[side][actorIndex]=recharge-1;
  log.push((actor.name||actor.type)+' is recovering and cannot act.');return;
 }
 normalizeMoves(actor);
 const moveId=move.id;
 if(!actor.moves.includes(moveId)&&moveId!=='opening-flick')return;
 if(moveId!=='opening-flick'&&(actor.movePP[moveId]||0)<=0){
  log.push((actor.name||actor.type)+' has no PP left for '+move.name+'.');return;
 }
 // Last Resort is a temporary desperation action, not a learned move.
 // Never overwrite one of the Critter's four equipped attacks.
 const fallback=moveId==='opening-flick'&&(actor.movePP[moveId]||0)<=0;
 if(fallback&&actor.moves.some(id=>(actor.movePP[id]||0)>0))return;

 let targetSide=move.target==='enemy'?enemySide(side):side;
 let target=getCombatant(targetSide,targetIndex);
 if(move.target==='enemy'){
  if(!target||target.hp<=0||!(targetSide==='enemy'?activeEnemies():activeAllies()).includes(targetIndex)){
   const available=targetSide==='enemy'?activeEnemies():activeAllies();
   targetIndex=available[0];target=getCombatant(targetSide,targetIndex);
  }
 }else if(move.target==='self'||move.target==='field'||move.target==='ally_team'){
  targetIndex=actorIndex;target=actor;
 }else if(move.target==='ally'&&(!target||target.hp<=0||!(side==='ally'?activeAllies():activeEnemies()).includes(targetIndex))){targetIndex=actorIndex;target=actor}
 if(!target||target.hp<=0)return;
 const name=actor.name||actor.type;
 // Conditions can disrupt a turn without consuming PP.
 const interruption={jolt:.20,chill:.17,stagger:.18,confuse:.22,disorient:.15,entangle:.08}[actor.status]||0;
 if(interruption&&Math.random()<interruption){log.push(name+' cannot act because of '+actor.status+'!');return}
 if(fallback)log.push(name+' has no remaining PP and uses Last Resort!');else actor.movePP[moveId]--;
 log.push(name+' uses '+move.name+'.');
 // Store the final animated action only; the damage and turn system are unchanged.
 battle.lastVfx={name:move.name,type:move.type,side,actorIndex,targetSide,targetIndex,category:move.category,effect:move.effect?.id,missed:false};
 const hitChance=Math.min(100,Math.max(5,(move.accuracy??100)*
  statFactor(side,actorIndex,'accuracy')/statFactor(targetSide,targetIndex,'evasion')));
 if(Math.random()*100>=hitChance){
  battle.lastVfx.missed=true;
  log.push('It missed!');return;
 }
 if(move.category!=='status'&&move.power>0){
  const factor=move.type==='Typeless'?1:mult(move.type,target);
  const physical=move.category==='physical';
  const offensiveStat=physical?'attack':'specialAttack';
  const defensiveStat=physical?'defense':'specialDefense';
  const rawStatRatio=statDamageRatio(actor,target,offensiveStat,defensiveStat);
  const offense=statFactor(side,actorIndex,physical?'attack':'special_attack');
  const defense=statFactor(targetSide,targetIndex,physical?'defense':'special_defense');
  const focus=side==='ally'?(battle.focus?.[actorIndex]||0):0;
  const terrain=battle.terrain?.type===move.type?1.12:1;
  const reduced=targetSide==='ally'?!!battle.guards?.[targetIndex]:!!battle.enemyGuards?.[targetIndex];
  const ailmentAttack=['dread','intimidate'].includes(actor.status)?.85:1;
  const ailmentDefense=['drench','fracture'].includes(target.status)?1.12:1;
  const base=Math.max(1,move.power/11+(actor.level-target.level)*.6);
  const mod=side==='ally'?activeModifier('ally'):activeModifier('enemy');
  const dmg=Math.max(1,Math.floor(base*factor*rawStatRatio*offense/defense*mod*(1+focus)*terrain*ailmentAttack*ailmentDefense*(reduced?.5:1)));
  target.hp=Math.max(0,target.hp-dmg);
  if(side==='ally')battle.focus[actorIndex]=0;
  battle.impact=targetSide;battle.lastTarget=targetIndex;
  log.push(dmg+' damage.');
  if(factor>=4)log.push('Super effective! (4× damage)');
  else if(factor>1)log.push('Super effective!');
  else if(factor<=.25)log.push('Not very effective. (¼× damage)');
  else if(factor<1)log.push('Not very effective.');
  if(target.hp===0)recordFaint(targetSide,targetIndex,log);
 }
 if(move.effect){
  // Recoil and recharge refer to the user. Field effects use the battlefield.
  const selfEffect=['recoil','recharge','terrain','switch','team_buff','team_guard','reveal'].includes(move.effect.id)&&move.effect.id!=='reveal';
  const effSide=selfEffect?side:targetSide,effIndex=selfEffect?actorIndex:targetIndex;
  if(target.hp>0||selfEffect)runMoveEffect(move.effect,side,actorIndex,effSide,effIndex,log);
 }
}
function endOfTeamTurn(log){
 if(!battle)return;
 for(const side of ['ally','enemy']){
  const roster=getRoster(side),slots=side==='ally'?battle.allySlots:battle.enemySlots;
  for(const i of slots){
   const p=roster[i];if(!p||p.hp<=0)continue;
   if(['poison','scorch','bleed','haunt','miasma','plague'].includes(p.status)){
    const dmg=Math.max(1,Math.floor(p.maxHp/16));
    p.hp=Math.max(0,p.hp-dmg);
    log.push((p.name||p.type)+' lost '+dmg+' HP to '+p.status+'.');
    if(p.hp===0)recordFaint(side,i,log);
   }
  }
 }
 if(battle.terrain&&--battle.terrain.turns<=0)battle.terrain=null;
}

function captureChance(foe){
 if(!foe||!Number.isFinite(foe.maxHp)||foe.maxHp<=0)return 0;
 return Math.min(.88,Math.max(.14,.14+.74*(1-Math.max(0,foe.hp)/foe.maxHp)));
}
function addCapturedCritter(caught){
 const destination=s.party.length<PARTY_LIMIT?'Party':'Home';
 if(destination==='Party')s.party.push(caught);else s.storage.push(caught);
 return destination;
}
function performPlayerAction(action,log){
 if(!battle)return;
 const actor=s.party[action.actor];if(!actor||actor.hp<=0){log.push('A fainted Critter cannot act.');return}
 switch(action.kind){
  case 'move':{
   const m=getMove(actor,action.moveId);
   performMove(actor,m,'ally',action.actor,action.target,log);
   return;
  }
  case 'guard':battle.guards[action.actor]=true;log.push(actor.type+' braces for the opponent team.');return;
  case 'focus':battle.focus[action.actor]=Math.min(0.8,(battle.focus[action.actor]||0)+0.2);log.push(actor.type+' focuses its energy.');return;
  case 'switch':{
   const to=action.target;if(!s.party[to]||s.party[to].hp<=0||battle.allySlots.includes(to)){log.push('Switch cancelled — that Critter is unavailable.');return}
   const slot=battle.allySlots.indexOf(action.actor);
   if(slot>=0){battle.allySlots[slot]=to;claimParticipant(to);log.push(actor.type+' switched out for '+s.party[to].type+'.')}
   return;
  }
  case 'potion':if(itemQty('Potion')&&actor.hp<actor.maxHp){s.inventory.Potion--;const healed=Math.min(20,actor.maxHp-actor.hp);actor.hp+=healed;log.push(actor.type+' recovered '+healed+' HP.')}return;
  case 'ppPotion':{
   const m=validMove(action.moveId);
   if(itemQty('PP Potion')&&m&&actor.moves.includes(action.moveId)){
    const current=actor.movePP?.[action.moveId]??m.pp,restored=Math.min(10,m.pp-current);
    if(restored>0){s.inventory['PP Potion']--;actor.movePP[action.moveId]=current+restored;log.push(actor.type+' restored '+restored+' PP to '+m.name+'.')}
   }
   return;
  }
  case 'revive':if(itemQty('Revive')&&s.party[action.target]?.hp===0){s.inventory.Revive--;const q=s.party[action.target];q.hp=Math.max(1,Math.floor(q.maxHp/2));log.push(q.type+' was revived with '+q.hp+' HP.')}return;
  case 'capture':if(battle.kind==='wild'){
    const foe=battle.enemies[0];
    if(!foe||foe.hp<=0){log.push('Capture target is unavailable.');return}
    if(!consumeBeamCharge(s)){log.push('Capture Beam battery empty. Recharge at a Critter Shop.');return}
    save(); // Persist a fired beam even if the page closes before battle narration ends.
    const chance=captureChance(foe);
    if(Math.random()<chance){
     const caught={...foe,hp:Math.max(1,foe.hp),xp:0};
     const destination=addCapturedCritter(caught);
     s.questCaptureCounts=s.questCaptureCounts||{};
     const questArea=SECRET_AREAS[s.area]?.parent||s.area;
     s.questCaptureCounts[questArea]=(s.questCaptureCounts[questArea]||0)+1;
     s.captureCount++;noteCritterCaptured(caught);if(s.area==='route1')noteOpeningEvent('firstCapture');s.captureLog=s.captureLog||[];s.captureLog.push({speciesId:foe.speciesId||null,name:foe.name||foe.type,type:foe.type,level:foe.level,gender:foe.gender,area:s.area,storage:destination});s.captureLog=s.captureLog.slice(-80);
     endBattle(true,'Capture successful! '+(foe.name||foe.type)+(destination==='Party'?' joined your party ('+s.party.length+'/'+PARTY_LIMIT+').':' was automatically sent to home storage ('+s.storage.length+' stored).'),false);
    }else log.push('The capture beam missed! '+beamChargeLabel()+' remaining.');
   }return;
  case 'failedEscape':if(battle.kind==='wild')log.push('You failed to escape!');return;
 }
}
function refillEnemyTeam(){
 while(battle.enemySlots.length<battle.mode&&battle.nextEnemy<battle.enemies.length){
  const i=battle.nextEnemy++;
  if(battle.enemies[i]?.hp>0)battle.enemySlots.push(i);
 }
}
function refillAllyTeam(log){
 battle.allySlots=battle.allySlots.filter(i=>s.party[i]?.hp>0);
 for(let i=0;i<s.party.length&&battle.allySlots.length<battle.mode;i++){
  if(!isEgg(s.party[i])&&s.party[i].hp>0&&!battle.allySlots.includes(i)){
   battle.allySlots.push(i);claimParticipant(i);log.push(s.party[i].type+' joins your active team.');
  }
 }
}

// Trainer tactics v35. Wild and laboratory opponents use forgiving move selection.
// All choices use the same legal learned moves, PP and existing damage executor.
function predictedMoveDamage(foe,target,move,enemyIndex,allyIndex){
 if(!move||!target||move.category==='status'||!move.power)return 0;
 const physical=move.category==='physical';
 const offense=physical?'attack':'specialAttack',defense=physical?'defense':'specialDefense';
 const base=Math.max(1,move.power/11+(foe.level-target.level)*.6);
 const ratio=statDamageRatio(foe,target,offense,defense);
 const stages=statFactor('enemy',enemyIndex,physical?'attack':'special_attack')/
  statFactor('ally',allyIndex,physical?'defense':'special_defense');
 const factor=move.type==='Typeless'?1:mult(move.type,target);
 const accuracy=Math.min(1,Math.max(.05,(move.accuracy??100)*statFactor('enemy',enemyIndex,'accuracy')/statFactor('ally',allyIndex,'evasion')/100));
 const terrain=battle.terrain?.type===move.type?1.12:1;
 const ailmentAttack=['dread','intimidate'].includes(foe.status)?.85:1;
 const ailmentDefense=['drench','fracture'].includes(target.status)?1.12:1;
 return Math.max(1,base*ratio*stages*factor*activeModifier('enemy')*terrain*ailmentAttack*ailmentDefense*(battle.guards?.[allyIndex]?.5:1))*accuracy;
}
// Tactics differ by trainer role; all actions still use learned moves and PP.
function trainerTactics(){
 if(battle.id==='leader')return {support:1.65,setup:1.65,noise:.7,conserve:1};
 if(battle.id==='rival')return {support:1.1,setup:1.2,noise:1.3,conserve:.7};
 if(battle.mode===2)return {support:1.35,setup:1.2,noise:1,conserve:.8};
 return {support:1,setup:1,noise:2.4,conserve:.5};
}
function trainerMoveScore(foe,move,enemyIndex,targetIndex,planned=[]){
 const tactics=trainerTactics(),effect=move.effect||{},offensive=move.target==='enemy';
 const target=offensive?s.party[targetIndex]:battle.enemies[targetIndex]||foe;
 if(!target||target.hp<=0)return -Infinity;
 const hpRatio=target.hp/Math.max(1,target.maxHp),chance=(effect.chance??100)/100;
 const projected=planned.filter(a=>a.move.target==='enemy'&&a.target===targetIndex).reduce((sum,a)=>sum+predictedMoveDamage(battle.enemies[a.enemyIndex],target,a.move,a.enemyIndex,targetIndex),0);
 let score=0;
 if(offensive&&move.category!=='status'){
  const damage=predictedMoveDamage(foe,target,move,enemyIndex,targetIndex);
  const remaining=Math.max(0,target.hp-projected);
  score=Math.min(damage,remaining)*1.2+(remaining>0&&damage>=remaining?18:0)+(move.priority||0)*1.5;
  if(projected>=target.hp)score-=12;
  if(effect.id==='recoil')score-=Math.min(foe.hp,foe.maxHp*(effect.fraction||.2))*.55;
  if(effect.id==='recharge')score-=damage*.25;
 }
 let utility=0;
 const side=offensive?'ally':'enemy',stage=battleStages(side,targetIndex)[effect.stat||'attack']||0;
 if(effect.id==='heal')utility=Math.min(target.maxHp-target.hp,target.maxHp*(effect.fraction||.25))*(hpRatio<.45?1.4:.7);
 if(effect.id==='cure_status')utility=target.status?13:0;
 if(effect.id==='ailment')utility=!target.status&&!planned.some(a=>a.target===targetIndex&&a.move.effect?.id==='ailment')?(battle.turn<=4?10:6):0;
 if(effect.id==='lower_stat')utility=stage>-STAGE_LIMIT?(battle.turn<=3?8:4)*tactics.setup:0;
 if(effect.id==='raise_stat')utility=stage<STAGE_LIMIT?(battle.turn<=3?9:4)*tactics.setup:0;
 if(effect.id==='team_buff')utility=activeEnemies().reduce((sum,i)=>sum+((battleStages('enemy',i)[effect.stat||'attack']||0)<STAGE_LIMIT?5:0),0)*tactics.setup;
 if(effect.id==='terrain')utility=battle.terrain?.type===foe.type?0:8*tactics.setup;
 if(effect.id==='guard'||effect.id==='team_guard')utility=1; // Team order makes enemy guarding less valuable after player attacks.
 if(effect.id==='switch')utility=0;
 if(effect.id==='reveal')utility=(battleStages('ally',targetIndex).evasion||0)>0?7:0;
 if(planned.some(a=>a.move.effect?.id===effect.id&&['terrain','team_buff','team_guard'].includes(effect.id)))utility*=.25;
 score+=utility*chance*tactics.support;
 if(move.category==='status'&&utility<=0)score-=9;
 if((foe.movePP?.[move.id]||0)<=1)score-=tactics.conserve;
 return score;
}
function chooseTrainerAction(enemyIndex,planned=[]){
 const foe=battle?.enemies[enemyIndex],allies=activeAllies();
 if(!foe||!allies.length)return null;
 normalizeMoves(foe);
 const legal=foe.moves.map(id=>getMove(foe,id)).filter(m=>(foe.movePP?.[m.id]||0)>0);
 if(!legal.length)return {enemyIndex,move:moveFallbacks[0],target:allies[0]};
 const relaxed=battle.kind==='wild'||battle.kind==='tutorial';
 if(relaxed){
  const attack=legal.filter(m=>m.target==='enemy'&&m.category!=='status'),choices=attack.length?attack:legal;
  const move=choices[Math.floor(Math.random()*choices.length)];
  return {enemyIndex,move,target:move.target==='enemy'?allies[Math.floor(Math.random()*allies.length)]:enemyIndex};
 }
 const candidates=[];
 for(const move of legal){
  const targets=move.target==='enemy'?allies:move.target==='ally'?activeEnemies():[enemyIndex];
  for(const target of targets)candidates.push({enemyIndex,move,target,score:trainerMoveScore(foe,move,enemyIndex,target,planned)+(Math.random()-.5)*trainerTactics().noise});
 }
 candidates.sort((a,b)=>b.score-a.score);
 return candidates[0]||null;
}
function planEnemyTeam(){
 const choices=[];
 for(const i of activeEnemies()){const choice=chooseTrainerAction(i,choices);if(choice)choices.push(choice)}
 return choices.sort((a,b)=>(b.move.priority||0)-(a.move.priority||0)||combatSpeed('enemy',b.enemyIndex)-combatSpeed('enemy',a.enemyIndex));
}
function recentBattleLog(){
 if(!battle?.lastTurnLog?.length)return '';
 return '<details class="combatLog" open><summary>Last turn · '+battle.lastTurnLog.length+' events</summary>'
  +'<ol>'+battle.lastTurnLog.slice(-18).map(entry=>'<li>'+escapeHtml(entry)+'</li>').join('')+'</ol></details>';
}

async function resolveTeamTurn(){
 if(!battle)return;
 const currentBattle=battle,log=[];
 battle.phase='resolve';battle.impact='';battle.lastTarget=null;battle.lastVfx=null;
 const actions=battle.pending.slice();battle.pending=[];
 // Preserve team-turn order, but apply and narrate actions one by one.
 actions.sort((a,b)=>{
  const ma=a.kind==='move'?validMove(a.moveId):null,mb=b.kind==='move'?validMove(b.moveId):null;
  const pa=ma?.priority||0,pb=mb?.priority||0;
  return pb-pa||combatSpeed('ally',b.actor)-combatSpeed('ally',a.actor);
 });
 for(const action of actions){
  if(battle!==currentBattle)return;
  const before=log.length; battle.lastVfx=null;
  // A defeated combatant cannot attack again later in the same turn.
  performPlayerAction(action,log);
  if(battle!==currentBattle)return; // capture ended battle
   const fx=battle.lastVfx;
   await narrateCombatEvents(log.slice(before),fx);
   if(battle!==currentBattle)return;
 }
 if(battle!==currentBattle)return;
 if(!battle.enemies.some(p=>p.hp>0))return endBattle(true,log.join(' ')+' Victory!',true);
 const enemyChoices=planEnemyTeam();
 for(const {enemyIndex,move,target} of enemyChoices){
  if(battle!==currentBattle)return;
  const foe=battle.enemies[enemyIndex];
  if(!foe||foe.hp<=0||!activeAllies().length)continue;
  const before=log.length;battle.lastVfx=null;
  performMove(foe,move,'enemy',enemyIndex,target,log);
  if(battle!==currentBattle)return;
  const fx=battle.lastVfx;
  await narrateCombatEvents(log.slice(before),fx);
 }
 if(battle!==currentBattle)return;
 const beforeEffects=log.length;
 endOfTeamTurn(log);
 battle.guards={};battle.enemyGuards={};
 await narrateCombatEvents(log.slice(beforeEffects),null);
 if(battle!==currentBattle)return;
 if(!battle.enemies.some(p=>p.hp>0))return endBattle(true,log.join(' ')+' Victory!',true);
 if(!s.party.some(p=>!isEgg(p)&&p.hp>0))return blackout();
 battle.enemySlots=battle.enemySlots.filter(i=>battle.enemies[i]?.hp>0);
 refillEnemyTeam();refillAllyTeam(log);
 battle.lastTurnLog=log.slice(-30);
 battle.turn++;battle.acting=0;battle.phase='choose';battle.uiMenu='root';
 save();
 renderBattle('Choose an action.');
}
function capture(){if(battle&&battle.kind==='wild')queueBattleAction({kind:'capture'})}

// v30 Evolution progression. Chains are authored in data/critters.json.
// Evolutions consume no items or money, cannot affect opponents, and
// use the existing world species plus the reserved starter families.
const EVOLUTION_STONE_TYPES=['Grass','Water','Fire','Rock','Electric','Ice','Flying','Shadow','Ghost','Venom','Psychic','Fighting','Normal','Steel','Ground'];
const EVOLUTION_STONES=Object.fromEntries(EVOLUTION_STONE_TYPES.map(type=>[type+' Stone',type]));
function evolutionRule(p){return speciesFor(p)?.evolvesTo||null}
function evolutionTarget(rule){return rule?.speciesId?speciesRegistry.get(rule.speciesId):null}
function evolutionConditionLabel(rule){
 if(!rule)return '';
 const level='Lv '+(rule.minLevel||1)+(rule.stone?' · '+rule.stone:'');
 const condition=rule.condition;
 if(!condition)return level;
 if(condition.kind==='night')return level+' · nighttime (20:00–05:00)';
 if(condition.kind==='day')return level+' · daytime (07:00–17:00)';
 if(condition.kind==='badge')return level+' · '+(condition.minimum||1)+' badge'+((condition.minimum||1)>1?'s':'');
 if(condition.kind==='area')return level+' · '+(CRITTER_AREA_LABELS[condition.areaId]||condition.areaId);
 return level;
}
function evolutionReady(p,usingStone=false){
 if(!p?.speciesId||p.hp<=0)return false;
 const rule=evolutionRule(p),next=evolutionTarget(rule);
 if(!rule||!next||!Number.isInteger(rule.minLevel)||p.level<rule.minLevel)return false;
 if(next.speciesId===p.speciesId||!Array.isArray(next.types)||next.types.some(t=>['Dragon','Primordial','Beast'].includes(t)))return false;
 if(rule.stone&&(!usingStone||!EVOLUTION_STONES[rule.stone]||(s.inventory?.[rule.stone]||0)<1))return false;
 const condition=rule.condition;
 if(!condition)return true;
 switch(condition.kind){
  case 'night':return worldHour()>=20||worldHour()<5;
  case 'day':return worldHour()>=7&&worldHour()<17;
  case 'badge':return s.badges>=(condition.minimum||1);
  case 'area':return s.area===condition.areaId;
  default:return false;
 }
}
function registerEvolution(p,fromId){
 // Evolution counts as a new obtained species without falsifying beam captures.
 const id=p.speciesId;if(!validCollectionSpecies(id))return;
 const col=collectionData(),stamp=encounterStamp();
 if(!col.seen[id])col.seen[id]={firstArea:stamp.area,firstDay:stamp.day,encounters:0,lastArea:stamp.area,discoveredBy:'evolution'};
 if(!col.caught[id])col.caught[id]={firstArea:stamp.area,firstDay:stamp.day,firstLevel:p.level,captures:0,obtainedBy:'evolution',evolvedFrom:fromId};
}
function evolveCritter(p,usingStone=false){
 if(!evolutionReady(p,usingStone))return null;
 const from=speciesFor(p),rule=evolutionRule(p),to=evolutionTarget(rule);
 if(!from||!to)return null;
 // Only a deliberate party-screen evolution consumes a stone.
 if(rule.stone)s.inventory[rule.stone]--;
 const oldMax=p.maxHp,oldHP=p.hp,oldPP={...(p.movePP||{})},oldMoves=[...(p.moves||[])];
 const evolvedId=to.speciesId;
 const history=Array.isArray(p.evolutionHistory)?p.evolutionHistory.slice(-19):[];
 history.push({from:from.speciesId,to:evolvedId,level:p.level,day:s.worldDay||1,area:s.area});
 p.evolutionHistory=history;
 p.speciesId=evolvedId;
 refreshSpeciesMetadata(p);
 p.maxHp=combatStat(p,'hp');
 p.hp=oldHP<=0?0:Math.max(1,Math.min(p.maxHp,p.maxHp-Math.max(0,oldMax-oldHP)));
 // Upgrade equipped moves to evolved learnset, retaining any shared PP.
 p.moves=oldMoves;p.movePP=oldPP;normalizeMoves(p);
 registerEvolution(p,from.speciesId);
 save();
 return {from:from.name,to:to.name,level:p.level,toId:evolvedId};
}
function tryEvolveChain(p,limit=2,usingStone=false){
 const results=[];for(let i=0;i<limit;i++){const result=evolveCritter(p,usingStone);if(!result)break;results.push(result);usingStone=false}
 if(results.length){s.evolutionNews=Array.isArray(s.evolutionNews)?s.evolutionNews:[];s.evolutionNews.push(...results);s.evolutionNews=s.evolutionNews.slice(-20)}
 return results;
}
function routeEvolutionNotices(){
 const records=Array.isArray(s?.evolutionNews)?s.evolutionNews:[];
 if(!records.length)return;
 s.evolutionNews=[];for(const e of records)indexNotice(e.from+' evolved into '+e.to+' at Lv '+e.level+'!');save();
}
function evolutionNotification(){
 const records=Array.isArray(s?.evolutionNews)?s.evolutionNews:[];
 s.evolutionNews=[];
 return records.length?'<div class="evoNotices"><div class="evoPulse" aria-hidden="true">✦</div><strong>✧ Evolution!</strong>'+records.map(e=>'<p>'+escapeHtml(e.from)+' evolved into <b>'+escapeHtml(e.to)+'</b> at Lv '+e.level+'!</p>').join('')+'</div>':'';
}
function evolutionChainInfo(sp){
 if(!sp)return '';
 const seen=new Set(),backward=[];let cursor=sp;
 while(cursor?.evolvesFrom&&!seen.has(cursor.speciesId)&&backward.length<3){
  seen.add(cursor.speciesId);const parent=speciesRegistry.get(cursor.evolvesFrom);if(!parent)break;backward.unshift(parent);cursor=parent;
 }
 const chain=[...backward,sp],conditions=[];
 cursor=sp;
 while(cursor?.evolvesTo&&chain.length<4&&!seen.has('forward:'+cursor.speciesId)){
  seen.add('forward:'+cursor.speciesId);const rule=cursor.evolvesTo,next=evolutionTarget(rule);
  if(!next||chain.some(v=>v.speciesId===next.speciesId))break;
  conditions.push({from:cursor,to:next,rule});chain.push(next);cursor=next;
 }
 const rows=[];
 for(let i=0;i<chain.length;i++){
  const stage=chain[i],rule=i<chain.length-1?chain[i].evolvesTo:null;
  rows.push('<div class="evoStage"><strong>#'+String(critterIndexNumber(stage)).padStart(3,'0')+' '+escapeHtml(stage.name)+'</strong>'
   +'<small>'+escapeHtml((stage.types||[]).join(' / '))+'</small></div>');
  if(rule&&i<chain.length-1)rows.push('<div class="evoArrow">↓ '+escapeHtml(evolutionConditionLabel(rule))+'</div>');
 }
 return '<div class="watchSectionTitle">Evolution family</div><div class="evoLine">'+(rows.join('')||'<div>No evolutions</div>')+'</div>'
  +(sp.evolvesTo?'<div class="watchReadOnly">Next evolution: '+escapeHtml(evolutionConditionLabel(sp.evolvesTo))+'. Eligible Critters evolve when leveling up, or on the Party screen when the condition is met. Stone evolutions require a stone in your bag and a deliberate Party screen action.</div>'
  :'<div class="watchReadOnly">No further evolution is currently assigned.</div>');
}
function partyEvolutionControls(p,i){
 const rule=evolutionRule(p),next=evolutionTarget(rule);
 if(!rule||!next)return '';
 return '<div class="evoPartyRow"><span>Evolution → '+escapeHtml(next.name)+' · '+escapeHtml(evolutionConditionLabel(rule))+'</span>'
  +'<button class="btn" type="button" data-evolve-party="'+i+'" '+(!evolutionReady(p,true)?'disabled':'')+'>'+(rule.stone?'Use Stone & Evolve':'Evolve')+'</button></div>';
}

function experienceToNextLevel(p){return p?.level>=MAX_CRITTER_LEVEL?0:Math.max(12,(p?.level||1)*12)}
function nextLevelMove(p){
 if(p?.level>=MAX_CRITTER_LEVEL)return null;
 const spec=speciesFor(p);
 return registeredLearnset(spec).find(e=>e.level>p.level&&validMove(e.moveId))||null;
}
function awardExperience(p,xp){
 if(!p||isEgg(p))return [];
 if(p.level>=MAX_CRITTER_LEVEL){p.level=MAX_CRITTER_LEVEL;p.xp=0;return []}
 const events=[];
 p.xp=Math.max(0,Number.isFinite(p.xp)?p.xp:0)+Math.max(0,Math.floor(xp));
 // Existing level requirements and health growth remain unchanged.
 while(p.level<MAX_CRITTER_LEVEL&&p.xp>=experienceToNextLevel(p)){
  p.xp-=experienceToNextLevel(p);
  p.level++;
  if(p.level===MAX_CRITTER_LEVEL)p.xp=0;
  const oldMax=p.maxHp;
  p.maxHp=geneticValue(p.genetics?.hp)>0?combatStat(p,'hp'):oldMax+4;
  p.hp=Math.min(p.maxHp,p.hp+Math.max(0,p.maxHp-oldMax));
  events.push((p.name||p.type)+' reached Lv '+p.level+'!');
  const learned=gainLevelMoves(p);
  if(learned.length)events.push((p.name||p.type)+' learned '+learned.join(', ')+'.');
  const evolved=tryEvolveChain(p);
  for(const result of evolved)events.push(result.from+' evolved into '+result.to+'!');
 }
 return events;
}
function endBattle(won,message,defeated){
 const b=battle;clearCombatNarrator();battle=null;$('close').hidden=false;
 if(b.kind==='trainer'&&won&&defeated)s.trainerProgress.wins++;else if(!won&&b.kind!=='tutorial')s.trainerProgress.losses++;
 if(b.kind==='tutorial'){s.introComplete=true;s.party.forEach(p=>{if(isEgg(p))return;p.hp=p.maxHp;p.status='';refillMovePP(p)})}
 else if(defeated&&won){s.money+=b.award||0;if(b.id==='quest-garden'&&s.sideQuests?.['garden-challenge']?.status==='active')s.sideQuests['garden-challenge'].won=true;else if(b.id&&b.id!=='tutorial')s.defeated[b.id]=true;
  if(b.id==='leader'&&!s.badges){s.badges=1;s.cut=true;message+=' You earned your first badge! The Critter Index vegetation cutter is now unlocked.'}
 }
 else if(!won){s.money=Math.max(0,s.money-Math.floor(s.money*0.1));s.party.forEach(p=>{if(!isEgg(p))p.hp=p.maxHp});s.area='town';s.x=17;s.y=15;build()}
 const evolveMessages=evolutionNotification();
 const captureVisual=won&&b.kind==='wild'&&message.startsWith('Capture successful!')
  ?'<div class="captureCelebration" aria-label="Critter captured"><div class="captureWatch">⌚</div><span class="captureBeam"></span><span class="captureSpark">✦</span><strong>CAPTURE REGISTERED</strong></div>':'';
 save();open(won?'Battle Complete':'Defeated',captureVisual+'<p>'+message+'</p>'+evolveMessages+(b.kind==='tutorial'?'<p>The researcher heals both starters. No money penalty applies.</p>':'')+'<button class="btn primary" id="battleDone">Continue</button>');
 $('battleDone').onclick=()=>{close();if(b.kind==='tutorial')say(['Researcher: Excellent! Your team is fully healed.','Travel east to Route 1 and walk in rice fields to find wild Critters.','Lower wild Critters’ HP before using the Index capture beam.']);if(b.id==='leader'){build();storyGrassBadgeScene()}}
}
function blackout(){
 const wasTutorial=battle?.kind==='tutorial';if(battle&&!wasTutorial)s.trainerProgress.losses++;clearCombatNarrator();battle=null;$('close').hidden=false;
 if(!wasTutorial)s.money=Math.max(0,s.money-Math.floor(s.money*0.1));s.party.forEach(p=>{if(!isEgg(p))p.hp=p.maxHp});
 if(wasTutorial){s.introComplete=true;s.area='lab';s.x=17;s.y=14;s.party.forEach(p=>{if(!isEgg(p))refillMovePP(p)})}else{s.area=s.lastCenter||'village';s.x=s.area==='garden'?14:17;s.y=s.area==='garden'?14:s.area==='town'?15:16}build();save();
 open('Blackout','<p>'+(wasTutorial?'Your friendly tutorial match ended. The researcher healed your starter without a penalty.':'Your whole party fainted. You lost a little money and recovered at your last Critter Center.')+'</p><button class="btn primary" id="blackoutDone">Continue</button>');$('blackoutDone').onclick=close
}
function center(){
 ensureMapDiscovery();const parent=townServiceParent();if(REGION_MAP_PLACES.some(p=>p.id===parent&&p.kind==='center'))s.discoveredCenters[parent]=true;
 s.lastCenter=parent;s.party.forEach(p=>{if(isEgg(p))return;p.hp=p.maxHp;p.status='';refillMovePP(p)});save();indexNotice('Your party has been fully healed.');
 open('Critter Center','<p>Manage party storage or install modules.</p><div class="options"><button class="btn" id="manageParty">Manage Party / Home Storage</button><button class="btn" id="manageModules">Install Critter Index Modules</button><button class="btn" id="centerDone">Leave</button></div>');
 $('manageParty').onclick=manageParty;$('manageModules').onclick=manageModules;$('centerDone').onclick=close
}
// Center-only storage browser. Filters are ephemeral UI state, not save data.
let centerStorageSearch='',centerStorageSort='recent',centerStoragePage=0,centerSwapSlot=0;
const CENTER_STORAGE_PAGE_SIZE=16;
function manageParty(){
 const partyCount=s.party.length;
 const regularCount=s.party.filter(p=>!isEgg(p)).length;
 if(isEgg(s.party[centerSwapSlot]))centerSwapSlot=Math.max(0,s.party.findIndex(p=>!isEgg(p)));
 centerSwapSlot=Math.max(0,Math.min(centerSwapSlot,partyCount-1));
 const list=s.party.map((p,i)=>isEgg(p)?'<div class="centerPartyRow">Slot '+(i+1)+' · Egg (transfer at home terminal)</div>':'<div class="centerPartyRow"><b>Slot '+(i+1)+': '+escapeHtml(p.name||p.type)+critterGenderLabel(p)+' · Lv '+p.level+'</b> <small>'+escapeHtml(defendTypes(p).join('/'))+' · HP '+p.hp+'/'+p.maxHp+'</small> '
  +'<button class="btn" data-party-up="'+i+'" '+(!i?'disabled':'')+'>↑</button> '
  +'<button class="btn" data-party-down="'+i+'" '+(i===partyCount-1?'disabled':'')+'>↓</button> '
  +'<button class="btn" data-store="'+i+'" '+(regularCount<=1?'disabled':'')+'>Send Home</button></div>').join('');
 const term=centerStorageSearch.trim().toLowerCase();
 const matching=s.storage.map((p,i)=>({p,i})).filter(({p})=>!term||
  (p.name||p.type||'').toLowerCase().includes(term)||defendTypes(p).some(t=>t.toLowerCase().includes(term))||
  String(p.level).includes(term));
 if(centerStorageSort==='name')matching.sort((a,b)=>(a.p.name||a.p.type).localeCompare(b.p.name||b.p.type)||a.i-b.i);
 if(centerStorageSort==='level')matching.sort((a,b)=>b.p.level-a.p.level||a.i-b.i);
 const pages=Math.max(1,Math.ceil(matching.length/CENTER_STORAGE_PAGE_SIZE));
 centerStoragePage=Math.max(0,Math.min(centerStoragePage,pages-1));
 const selected=matching.slice(centerStoragePage*CENTER_STORAGE_PAGE_SIZE,(centerStoragePage+1)*CENTER_STORAGE_PAGE_SIZE);
 const stored=selected.map(({p,i})=>'<div class="centerPartyRow"><b>'+escapeHtml(p.name||p.type)+critterGenderLabel(p)+' · Lv '+p.level+'</b> <small>'+escapeHtml(defendTypes(p).join('/'))+' · HP '+p.hp+'/'+p.maxHp+'</small> '
  +'<button class="btn" data-retrieve="'+i+'" '+(partyCount>=PARTY_LIMIT?'disabled':'')+'>Add to Party</button> '
  +'<button class="btn" data-swap-storage="'+i+'" '+(!partyCount?'disabled':'')+'>Swap</button></div>').join('')
  ||'<p class="muted">No stored Critters match your search.</p>';
 const partySlots=s.party.map((p,i)=>isEgg(p)?'':'<option value="'+i+'" '+(i===centerSwapSlot?'selected':'')+'>Slot '+(i+1)+': '+escapeHtml(p.name||p.type)+'</option>').join('');
 open('Critter Center · Party Maintenance','<p>Active party ('+partyCount+'/'+PARTY_LIMIT+') · Home storage ('+s.storage.length+')</p>'
  +'<p class="muted">Reorder with ↑/↓. Send and retrieve Critters here, or swap directly even when all eight slots are full. The watch remains read-only outside Centers.</p>'
  +'<div class="options">'+list+'</div><h3>Home Storage</h3>'
  +'<div class="centerStorageControls"><label>Search name, type or level <input id="centerStorageSearch" type="search" placeholder="Find a stored Critter" value="'+escapeHtml(centerStorageSearch)+'"></label> '
  +'<button class="btn" id="centerStorageFind">Search</button> '
  +'<label>Sort <select id="centerStorageSort"><option value="recent" '+(centerStorageSort==='recent'?'selected':'')+'>Stored order</option><option value="name" '+(centerStorageSort==='name'?'selected':'')+'>Name</option><option value="level" '+(centerStorageSort==='level'?'selected':'')+'>Highest level</option></select></label></div>'
  +'<p>Swap with <select id="centerSwapSlot">'+partySlots+'</select></p>'
  +'<p class="muted">Showing '+selected.length+' of '+matching.length+' matching stored Critters (page '+(centerStoragePage+1)+'/'+pages+')</p>'
  +'<div class="options">'+stored+'</div>'
  +'<div><button class="btn" id="centerStoragePrev" '+(!centerStoragePage?'disabled':'')+'>Previous</button> '
  +'<button class="btn" id="centerStorageNext" '+(centerStoragePage>=pages-1?'disabled':'')+'>Next</button></div>'
  +'<button class="btn" id="partyBack">Back</button>');
 const applySearch=()=>{centerStorageSearch=$('centerStorageSearch').value;centerStoragePage=0;manageParty()};
 $('centerStorageFind').onclick=applySearch;
 $('centerStorageSearch').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();applySearch()}};
 $('centerStorageSort').onchange=e=>{centerStorageSort=e.target.value;centerStoragePage=0;manageParty()};
 $('centerSwapSlot').onchange=e=>{centerSwapSlot=Number(e.target.value)};
 $('centerStoragePrev').onclick=()=>{centerStoragePage--;manageParty()};
 $('centerStorageNext').onclick=()=>{centerStoragePage++;manageParty()};
 document.querySelectorAll('[data-party-up],[data-party-down]').forEach(b=>b.onclick=()=>{
  const i=Number(b.dataset.partyUp??b.dataset.partyDown),j=b.hasAttribute('data-party-up')?i-1:i+1;
  if(i<0||j<0||i>=s.party.length||j>=s.party.length)return;
  [s.party[i],s.party[j]]=[s.party[j],s.party[i]];save();manageParty();
 });
 document.querySelectorAll('[data-store]').forEach(b=>b.onclick=()=>{
  const i=Number(b.dataset.store);if(s.party.length<=1||i<0||i>=s.party.length||isEgg(s.party[i])||s.party.filter(p=>!isEgg(p)).length<=1)return;
  const p=s.party.splice(i,1)[0];s.storage.push(p);save();indexNotice((p.name||p.type)+' sent to home storage.');manageParty()
 });
 document.querySelectorAll('[data-retrieve]').forEach(b=>b.onclick=()=>{
  const i=Number(b.dataset.retrieve);if(s.party.length>=PARTY_LIMIT||i<0||i>=s.storage.length||isEgg(s.storage[i]))return;
  const p=s.storage.splice(i,1)[0];s.party.push(p);save();indexNotice((p.name||p.type)+' added to your party.');manageParty()
 });
 document.querySelectorAll('[data-swap-storage]').forEach(b=>b.onclick=()=>{
  const i=Number(b.dataset.swapStorage),slot=centerSwapSlot;
  if(!Number.isInteger(i)||!Number.isInteger(slot)||!s.storage[i]||!s.party[slot]||isEgg(s.party[slot])||isEgg(s.storage[i]))return;
  [s.party[slot],s.storage[i]]=[s.storage[i],s.party[slot]];
  save();indexNotice((s.party[slot].name||s.party[slot].type)+' joined your party; '+(s.storage[i].name||s.storage[i].type)+' sent home.');manageParty();
 });
 $('partyBack').onclick=center
}
function manageModules(){
 const names=['Power Coil','Guard Plate','Weakening Field'];
 const descriptions={
  'Power Coil':'Increases your team’s attack damage.',
  'Guard Plate':'Reduces incoming damage to your team.',
  'Weakening Field':'Improves your team’s damage output.'
 };
 let list='<p>Technicians maintain your Critter Index here. Equipped modules apply automatically in combat; four sockets are available.</p>';
 names.forEach(n=>{
  const owned=s.modules.filter(m=>m===n).length,installed=s.installed.filter(m=>m===n).length;
  list+='<div class="centerPartyRow"><b>'+escapeHtml(n)+'</b> · owned '+owned+', equipped '+installed
   +'<small>'+escapeHtml(descriptions[n])+'</small> '
   +'<button class="btn" data-install="'+escapeHtml(n)+'" '+(owned<=installed||s.installed.length>=4?'disabled':'')+'>Install</button></div>'
 });
 list+='<h3>Watch module sockets ('+s.installed.length+'/4)</h3>'
  +Array.from({length:4},(_,i)=>'<div class="centerPartyRow"><b>Socket '+(i+1)+': '+escapeHtml(s.installed[i]||'Empty')+'</b> '
   +(s.installed[i]?'<button class="btn" data-remove="'+i+'">Remove</button>':'<small>Available for an owned module</small>')+'</div>').join('');
 open('Critter Index · Module Maintenance','<div class="options">'+list+'</div><button class="btn" id="modulesBack">Back</button>');
 document.querySelectorAll('[data-install]').forEach(b=>b.onclick=()=>{
  const n=b.dataset.install;
  if(!names.includes(n)||s.installed.length>=4||s.modules.filter(m=>m===n).length<=s.installed.filter(m=>m===n).length)return;
  s.installed.push(n);save();indexNotice(n+' installed.');manageModules();
 });
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{
  const i=Number(b.dataset.remove);if(!Number.isInteger(i)||i<0||i>=s.installed.length)return;
  const removed=s.installed.splice(i,1)[0];save();indexNotice(removed+' removed.');manageModules()
 });
 $('modulesBack').onclick=center
}
function shop(){
 if(!shopIsOpen()){
  open('Critter Shop · After hours','<p>Regular shop hours: 07:00–20:00. Emergency capture-beam charging remains available.</p>'+beamShopHTML()+'<p class="muted">You can wait until morning to browse supplies. Critter Centers remain open all night.</p><button class="btn" id="shopWaitMorning">Wait until 07:00</button>');
  const upgrade=$('beamUpgrade');if(upgrade)upgrade.disabled=true;
  $('beamRecharge').onclick=()=>{if(rechargeBeam(s)){save();indexNotice('Capture Beam fully recharged.');shop()}};
  $('shopWaitMorning').onclick=()=>{if(worldHour()>=20)s.worldDay=(s.worldDay||1)+1;s.worldMinutes=420;save();shop()};
  return;
 }
 const supplies=[['Potion',30],['PP Potion',45],['Revive',90]];
 const modules=[['Power Coil',120],['Guard Plate',120],['Weakening Field',150]];
 // Shops sell stones directly into the Critter Index bag, not module sockets.
 const stones=EVOLUTION_STONE_TYPES.map(type=>[type+' Stone',220]);
 const goods=[...supplies,...modules,...stones];
 const section=(title,items)=>'<h3>'+title+'</h3><div class="options">'
  +items.map(([name,price])=>'<button class="btn" data-buy="'+escapeHtml(name)+'" '+(s.money<price?'disabled':'')+'>'
   +escapeHtml(name)+' — '+price+' ◇'+(EVOLUTION_STONES[name]?' · Owned '+(s.inventory[name]||0):'')+'</button>').join('')+'</div>';
 open('Critter Shop','<p>Open 07:00–20:00 · Money: '+s.money+' ◇</p>'
  +beamShopHTML()+section('Healing items',supplies)+section('Index modules',modules)
  +section('Evolution stones',stones)
  +'<p class="muted">Evolution stones are used from the Critter Index Party screen after the required level is reached. Each successful stone evolution consumes one stone. Modules are installed at a Critter Center.</p>');
 const recharge=$('beamRecharge');if(recharge)recharge.onclick=()=>{if(rechargeBeam(s)){save();indexNotice('Capture Beam fully recharged.');shop()}};
 const upgrade=$('beamUpgrade');if(upgrade)upgrade.onclick=()=>{if(upgradeBeam(s,beamStatus().tier+1)){save();indexNotice('Installed '+beamStatus().name+' — fully charged.');shop()}};
 document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{
  const name=b.dataset.buy,entry=goods.find(g=>g[0]===name);
  if(!entry||s.money<entry[1])return;
  s.money-=entry[1];
  if(modules.some(g=>g[0]===name))s.modules.push(name);
  else s.inventory[name]=(s.inventory[name]||0)+1;
  save();indexNotice('Purchased '+name+' for '+entry[1]+' money.');shop();
 });
}
function preview(id,g){const im=sprites[g],c=$(id),p=c.getContext('2d');p.imageSmoothingEnabled=false;function draw(){if(!im.naturalWidth)return;const m=spriteMetrics(g)?.[0]?.[0];if(!m)return;p.clearRect(0,0,c.width,c.height);const k=Math.min(c.width/(m.sw+10),c.height/(m.sh+8));p.drawImage(im,m.sx,m.sy,m.sw,m.sh,(c.width-m.sw*k)/2,c.height-m.sh*k-4,m.sw*k,m.sh*k)}im.addEventListener('load',draw);draw()}
preview('malePreview','male');preview('femalePreview','female');
$('new').onclick=()=>show('selection');
$('continue').onclick=()=>{backUpLegacySaveBeforeMigration();s=read();if(!s)return;migrate();build();show('game')};
$('begin').onclick=()=>{const name=$('playerName').value.trim().replace(/\s+/g,' ');if(!name){$('error').textContent='Please enter a name.';return}
 s={name,gender:document.querySelector('.character.selected').dataset.gender,area:'village',x:17,y:16,face:'down',steps:0,starter:null,party:[],storage:[],inventory:{Potion:4,Revive:1},modules:[],installed:[],badges:0,defeated:{},puzzles:{},money:250,version:4,movementMode:'run',beamBattery:{tier:0,charge:BEAM_BATTERIES[0].capacity}};
 save();build();show('game');say(['Welcome, '+name+'!','Touch and slide anywhere in the world to move. Double tap the world to switch Run / Walk. Interact lights up when facing something usable.','Visit the northeast laboratory to receive your starter and Critter Index.'])};
document.querySelectorAll('.character').forEach(b=>b.onclick=()=>{document.querySelectorAll('.character').forEach(c=>c.classList.remove('selected'));b.classList.add('selected')});
$('index2').onclick=index;$('talk').onclick=interact;$('dialog').onclick=advance;$('close').onclick=close;
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;const d={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'}[e.code];if(d){e.preventDefault();held[d]=true;if(Date.now()-last>movementStepInterval()){move(d);last=Date.now()}}else if(['KeyE','Enter','Space'].includes(e.code)&&!modal){e.preventDefault();interact()}else if(e.code==='KeyI'&&!modal)index();else if(e.code==='Escape'&&modal&&!battle)close()});
window.addEventListener('keyup',e=>{const d={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'}[e.code];if(d)held[d]=false});// Mobile joystick uses a pointer captured by the joystick base; keyboard controls stay unchanged.
// Invisible, floating touch origin: each drag starts wherever the player touches.
const stick=C;
let stickPointer=null,stickDirection=null,stickActive=false,stickRepeatAt=0;
let touchStarted=0,touchStartX=0,touchStartY=0,touchDragged=false,lastWorldTap=null;
const WORLD_DOUBLE_TAP_MS=330,WORLD_DRAG_DEADZONE=12;
function endStick(pointerId){
 if(pointerId!==undefined&&stickPointer!==pointerId)return;
 const captured=stickPointer;stickPointer=null;stickDirection=null;stickActive=false;stickRepeatAt=0;
 if(captured!==null&&stick.hasPointerCapture?.(captured))try{stick.releasePointerCapture(captured)}catch{}
}
function releaseMovement(){held={};endStick();lastWorldTap=null}
function touchDirection(dx,dy){
 if(Math.hypot(dx,dy)<WORLD_DRAG_DEADZONE)return null;
 return Math.abs(dx)>=Math.abs(dy)?(dx>=0?'right':'left'):(dy>=0?'down':'up');
}
function aimStick(e){
 if(stickPointer!==e.pointerId)return;
 const dx=e.clientX-touchStartX,dy=e.clientY-touchStartY;
 const next=touchDirection(dx,dy);
 if(next){touchDragged=true;lastWorldTap=null}
 if(next!==stickDirection){stickDirection=next;stickRepeatAt=0}
}
stick.addEventListener('pointerdown',e=>{
 if(screen!=='game'||modal||narratorBlocking()||doorTransition||worldTransitionBusy||trainerApproachLocked()||stickPointer!==null)return;
 if(e.pointerType==='mouse'&&e.button!==0)return;
 e.preventDefault();stickPointer=e.pointerId;stickActive=true;stickRepeatAt=0;
 touchStarted=performance.now();touchStartX=e.clientX;touchStartY=e.clientY;touchDragged=false;
 try{stick.setPointerCapture(e.pointerId)}catch{}
});
stick.addEventListener('pointermove',e=>{
 if(stickPointer!==e.pointerId)return;
 e.preventDefault();
 // Crossing a real control stops movement until the next fresh world touch.
 const target=document.elementFromPoint(e.clientX,e.clientY);
 if(target?.closest('button,input,select,textarea,#dialog,#shade,a')){lastWorldTap=null;endStick(e.pointerId);return}
 aimStick(e);
});
stick.addEventListener('pointerup',e=>{
 if(stickPointer!==e.pointerId)return;
 e.preventDefault();
 const now=performance.now(),distance=Math.hypot(e.clientX-touchStartX,e.clientY-touchStartY);
 const target=document.elementFromPoint(e.clientX,e.clientY);
 if(!touchDragged&&distance<WORLD_DRAG_DEADZONE&&now-touchStarted<=240&&target===stick&&!modal&&!narratorBlocking()){
  if(lastWorldTap&&now-lastWorldTap.time<=WORLD_DOUBLE_TAP_MS&&Math.hypot(e.clientX-lastWorldTap.x,e.clientY-lastWorldTap.y)<=48){
   lastWorldTap=null;toggleMovementMode();
  }else lastWorldTap={time:now,x:e.clientX,y:e.clientY};
 }else lastWorldTap=null;
 endStick(e.pointerId);
});
for(const event of ['pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(stickPointer===e.pointerId){lastWorldTap=null;endStick(e.pointerId)}});
stick.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('pointerup',e=>endStick(e.pointerId));
window.addEventListener('pointercancel',e=>endStick(e.pointerId));
window.addEventListener('blur',releaseMovement);
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseMovement();if(s&&screen==='game')save()}});
window.addEventListener('pagehide',()=>{releaseMovement();if(s&&screen==='game')save()});

document.addEventListener('touchmove',e=>{
 if(screen==='game'&&!e.target.closest('#shade'))e.preventDefault();
},{passive:false});
document.addEventListener('gesturestart',e=>{if(screen==='game')e.preventDefault()},{passive:false});
window.addEventListener('resize',()=>{canvasSizeDirty=true;releaseMovement()});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{canvasSizeDirty=true}).observe(C);
if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>{canvasSizeDirty=true});
if(read()?.name)$('continue').hidden=false;
function loop(){tickAmbient();if(screen==='game'&&!document.hidden){tickStoryScenes();finishDoorAnimation();tickNpcRoutines();if(stickActive&&stickDirection&&!modal&&!narratorBlocking()&&Date.now()>=stickRepeatAt){move(stickDirection);stickRepeatAt=Date.now()+movementStepInterval();last=Date.now()}else if(!stickActive){for(const d of ['up','down','left','right'])if(held[d]&&Date.now()-last>movementStepInterval()){move(d);last=Date.now();break}}if(!battle)draw();else atmospherePreviousFrame=0}requestAnimationFrame(loop)}
loadCritterMoveData();
requestAnimationFrame(loop);
})();
