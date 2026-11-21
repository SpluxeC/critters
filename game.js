(()=>{
'use strict';
const $=id=>document.getElementById(id),C=$('world'),ctx=C.getContext('2d');ctx.imageSmoothingEnabled=false;
const S=32,W=34,H=26;
const T={grass:0,path:1,tree:2,roof:3,wall:4,door:5,rice:6,flower:7,wood:8,desk:9,mat:10,tall:11,rock:12,water:13,hedge:14,gate:15,stone:16};
const palette=['#75a65e','#c6ae82','#38683d','#88684f','#baa78a','#403127','#b7bd6a','#88a961','#b38c6d','#856348','#d9c595','#507e41','#867c6b','#5a9aa5','#397b3e','#7b5c39','#b6b1a0'];
const strengths={Fire:['Grass','Ice'],Water:['Fire','Rock'],Grass:['Water','Shadow'],Rock:['Electric','Venom'],Electric:['Water','Flying'],Ice:['Dragon','Ghost'],Flying:['Beast','Fighting'],Shadow:['Ghost','Psychic'],Ghost:['Psychic','Primordial'],Dragon:['Electric','Primordial'],Venom:['Grass','Flying'],Beast:['Dragon','Shadow'],Primordial:['Beast','Fire'],Psychic:['Fighting','Venom'],Fighting:['Rock','Ice']};
const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]},symbols={Rock:'⛰',Water:'💧',Electric:'⚡',Grass:'🌿',Beast:'🐾',Flying:'🪽',Venom:'☣',Fire:'🔥',Ice:'❄',Ghost:'◈',Shadow:'◉',Psychic:'✦',Fighting:'⚔',Dragon:'◇',Primordial:'✧'};
const sprites={male:new Image(),female:new Image()};sprites.male.src='assets/male.png';sprites.female.src='assets/female.png';
const npcSheet=new Image();npcSheet.src='assets/npc-characters.svg';
// Dedicated hand-crafted-quality researcher art, one 4x4 sheet (32px cells).
const npcResearcher=new Image();npcResearcher.src='assets/npc-researcher.png?v=18';
const npcLabAssistant=new Image();npcLabAssistant.src='assets/npc-lab-assistant.png?v=20-player-style';
const NPC_VARIANTS=['Villager Boy','Villager Girl','Researcher','Lab Assistant','Center Nurse','Center Clerk','Village Elder','School Teacher','Merchant','Item Shopkeeper','Gear Shopkeeper','Rice Farmer','Fisherman','Ranger','Samurai','Shrine Maiden','Monk','Blacksmith','Guard','Rival Trainer','Gym Trainer','Gym Leader','Village Child','Traveler','Festival Dancer','Mountain Hermit','Ninja','Scholar'];
const NPC_ROWS={down:0,left:1,right:2,up:3};
function pickNpcSprite(x,y,kind='',id=''){
 const special={researcher:2,labassistant:3,center:4,shop:9,leader:21,switch:27};
 if(kind in special)return special[kind];
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
function drawNpc(p,x,y){
 // Dedicated lab assistant asset: same 4x4, 32px layout and feet anchor as researcher.
 if(p.kind==='labassistant'&&npcLabAssistant.complete&&npcLabAssistant.naturalWidth===128){
  const row={down:0,up:1,left:2,right:3}[p.face||'down']??0;
  const size=59;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(npcLabAssistant,0,row*32,32,32,x-size/2,y-size+4,size,size);
  return;
 }
 // Researcher has a dedicated 16-frame transparent PNG matching the player's
 // directional sheet layout. Align at the feet and avoid sideways frame drift.
 if(p.kind==='researcher'&&npcResearcher.complete&&npcResearcher.naturalWidth===128){
  const direction={down:0,up:1,left:2,right:3}[p.face||'down']??0;
  const column=0; // Stable standing pose; other columns are available for walking.
  const size=59;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(npcResearcher,column*32,direction*32,32,32,x-size/2,y-size+4,size,size);
  return;
 }
 const im=npcSheet;
 if(im.complete&&im.naturalWidth){
  const i=p.sprite??0,row=NPC_ROWS[p.face||'down']??0;
  const w=38,h=42;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(im,i*32,row*32,32,32,x-w/2,y-h,w,h);
 }else{
  ctx.fillStyle='#544c55';ctx.fillRect(x-9,y-30,18,28);
  ctx.fillStyle='#e0aa88';ctx.fillRect(x-7,y-28,14,12);
 }
}
const villageBuildings={home:new Image(),lab:new Image(),neighbor:new Image()};
for(const kind of Object.keys(villageBuildings))villageBuildings[kind].src='assets/village-'+kind+'.svg';
let doorTransition=null;
function villageDoorAt(x,y){
 if(s?.area!=='village')return null;
 return VILLAGE_HOUSES.find(h=>h.door===x&&h.y+h.h+1===y)||null;
}
function openVillageDoor(h){
 if(doorTransition||screen!=='game'||modal)return;
 doorTransition={house:h,start:performance.now()};
 releaseMovement();
}
function finishDoorAnimation(){
 if(!doorTransition||performance.now()-doorTransition.start<240)return;
 const {house}=doorTransition;doorTransition=null;
 region(house.kind==='lab'?'lab':house.kind==='neighbor'?'neighbor':'home',17,23,
 house.kind==='home'?'You step inside your home.':house.kind==='neighbor'?'A neighbor welcomes you into their home.':'You enter the Critter Research Laboratory.');
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
 for(const h of VILLAGE_HOUSES)for(let y=h.y;y<=h.y+h.h+1;y++)for(let x=h.x;x<h.x+h.w;x++){
  villageCollider(x,y);
 }
 for(const [a,y,b] of VILLAGE_FENCES)for(let x=a;x<b;x++)villageCollider(x,y);
 for(const [x,y] of VILLAGE_LANTERNS)villageCollider(x,y);
 for(const [x,y] of VILLAGE_STONES)villageCollider(x,y);
}

// Phase 1: curated indoor scenes. Objects share one definition for rendering,
// inspection and solid footprints. No party swapping/module work outside Centers.
let interiorObjects=[],interiorBlocked=new Set();
const isInterior=area=>['home','neighbor','lab'].includes(area);
function addInteriorObject(id,x,y,w,h,kind,title,description,action=''){
 const o={id,x,y,w,h,kind,title,description,action};
 interiorObjects.push(o);
 for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)interiorBlocked.add(key(xx,yy));
 return o;
}
function furnishInterior(area){
 interiorObjects=[];interiorBlocked=new Set();
 // Always maintain a free central aisle and unobstructed exit at (17,25).
 if(area==='lab'){
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
 if(o.action==='potion'){
  s.discoveries=s.discoveries||{};
  if(!s.discoveries[o.id]){
   s.discoveries[o.id]=true;
   s.inventory.Potion=(s.inventory.Potion||0)+1;
   save();
   return say(['Inside the supply box is a Potion!','Potion ×1 added to your inventory.']);
  }
  return say(['The travel supply box is empty. You already collected its Potion.']);
 }
 return say(o.description);
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
let route1Blocked=new Set();
function route1SiteAt(x,y){return s.area==='route1'?ROUTE1_SITES.find(o=>o.x===x&&o.y===y):null}
function inspectRoute1Site(o){
 if(o.reward){
  s.discoveries=s.discoveries||{};
  if(s.discoveries[o.id])return say(['The '+o.title.toLowerCase()+' is empty.']);
  s.discoveries[o.id]=true;s.inventory[o.reward]=(s.inventory[o.reward]||0)+1;
  save();return say([o.text[0],'You found '+o.reward+' ×1! It was added to your inventory.']);
 }
 return say(o.text);
}

function solidAt(x,y){
 if(x<0||y<0||x>=W||y>=H)return true;
 if(s.area==='village'&&villageObstacles.has(key(x,y)))return true;
 if(isInterior(s.area)&&interiorBlocked.has(key(x,y)))return true;
 if(s.area==='route1'&&route1Blocked.has(key(x,y)))return true;
 return [T.tree,T.roof,T.wall,T.desk,T.rock,T.water,T.hedge,T.gate].includes(tiles[y][x]);
}
// Visual-only movement: collision, saves, encounters, and interactions remain on the existing grid.
let visual={x:0,y:0,fromX:0,fromY:0,toX:0,toY:0,start:0,duration:130,ready:false};
function snapVisual(){if(!s)return;visual={x:s.x,y:s.y,fromX:s.x,fromY:s.y,toX:s.x,toY:s.y,start:performance.now(),duration:130,ready:true}}
function updateVisual(now=performance.now()){
 if(!s)return;
 if(!visual.ready){snapVisual();return}
 const t=Math.min(1,Math.max(0,(now-visual.start)/visual.duration));
 // Linear interpolation produces a constant walking speed without slow-down at each tile.
 visual.x=visual.fromX+(visual.toX-visual.fromX)*t;
 visual.y=visual.fromY+(visual.toY-visual.fromY)*t;
}
function beginStep(x,y){
 updateVisual();visual.fromX=visual.x;visual.fromY=visual.y;
 visual.toX=x;visual.toY=y;visual.start=performance.now();
 visual.duration=120;
}

const read=()=>{try{return JSON.parse(localStorage.getItem('critters-v1'))}catch{return null}};
function save(){if(s){s.version=4;localStorage.setItem('critters-v1',JSON.stringify(s));$('continue').hidden=false}}
function show(page){releaseMovement();document.querySelectorAll('.screen').forEach(p=>p.classList.toggle('show',p.id===page));screen=page;if(page==='game'){snapVisual();resizeGameCanvas()}}

// Editable Critter moves and species: authored in data/moves.json and data/critters.json.
// Missing/retired IDs fall back to safe basic moves instead of breaking old saves.
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
function registeredLearnset(spec){
 return Array.isArray(spec?.levelUp)?spec.levelUp.filter(q=>Number.isInteger(q.level)&&q.level>=1&&typeof q.moveId==='string')
  .sort((a,b)=>a.level-b.level):[];
}
function legalLearnedMoves(p){
 const species=speciesFor(p),list=registeredLearnset(species).filter(e=>e.level<=p.level&&validMove(e.moveId)).map(e=>e.moveId);
 if(species&&list.length)return [...new Set(list)].slice(-4);
 return defaultMoveIds(p.type,p.level);
}
function normalizeMoves(p){
 if(!p)return p;
 const current=Array.isArray(p.moves)?p.moves:[];
 const legacy=new Set(['Strike','Guard','Focus',p.type+' Pulse','Pulse']);
 const mapped=current.map(v=>typeof v==='string'?(validMove(v)?v:moveSlug(v)):null)
   .filter(id=>id&&validMove(id)&&!legacy.has(id));
 const target=legalLearnedMoves(p);
 // Species learnsets are authoritative on registration; upgrades won't erase equipped
 // valid moves except when the four-slot capacity is exceeded.
 let ids=speciesFor(p)?target:[...new Set([...mapped,...target])].slice(-4);
 if(!ids.length)ids=['opening-flick'];
 if(!ids.some(id=>validMove(id)?.target==='enemy'))ids=['opening-flick',...ids.filter(id=>id!=='opening-flick')].slice(0,4);
 const prevPP=p.movePP&&typeof p.movePP==='object'?p.movePP:{};
 p.moves=ids;
 p.movePP=Object.fromEntries(ids.map(id=>[id,Math.min(validMove(id)?.pp||35,Math.max(0,Number.isFinite(prevPP[id])?Math.floor(prevPP[id]):validMove(id)?.pp||35))]));
 p.status=typeof p.status==='string'?p.status:'';
 return p;
}
function gainLevelMoves(p){
 const spec=speciesFor(p);
 const options=registeredLearnset(spec).filter(e=>e.level===p.level&&validMove(e.moveId));
 for(const event of options){
  p.moves=Array.isArray(p.moves)?p.moves:[];
  p.moves=[...p.moves.filter(id=>id!==event.moveId),event.moveId].slice(-4);
  p.movePP=p.movePP||{};p.movePP[event.moveId]=validMove(event.moveId).pp;
 }
 if(!spec)normalizeMoves(p);
}
function getMove(p,id){
 const move=validMove(id);
 if(move)return move;
 return moveFallbacks[0];
}
function refillMovePP(p){normalizeMoves(p);for(const id of p.moves)p.movePP[id]=getMove(p,id).pp}
async function loadCritterMoveData(){
 try{
  const res=await fetch('data/moves.json?v=26',{cache:'no-store'});
  if(!res.ok)throw Error('moves HTTP '+res.status);
  const data=await res.json();
  if(!Array.isArray(data.moves))throw Error('move catalog missing moves');
  for(const m of data.moves)if(m?.id&&typeof m.name==='string'&&typeof m.type==='string'&&Number.isFinite(m.pp)&&m.pp>0&&['physical','special','status'].includes(m.category))moveRegistry.set(m.id,m);
  moveDataReady=true;
 }catch(err){console.warn('Critter move database unavailable; safe basic moves remain available',err)}
 try{
  const res=await fetch('data/critters.json?v=26',{cache:'no-store'});
  if(!res.ok)throw Error('species HTTP '+res.status);
  const data=await res.json();
  if(Array.isArray(data.species))for(const sp of data.species)
   if(typeof sp.speciesId==='string'&&sp.speciesId&&!speciesRegistry.has(sp.speciesId)
    &&Array.isArray(sp.types)&&sp.types.length&&sp.types.every(isKnownType))
     speciesRegistry.set(sp.speciesId,sp);
  speciesDataReady=true;
 }catch(err){console.warn('Critter species registry unavailable; type placeholders remain available',err)}
 if(s){for(const p of [...s.party,...s.storage])normalizeMoves(p);save()}
 if(battle){for(const p of battle.enemies)normalizeMoves(p);if(battle.phase==='choose')renderBattle('Move library loaded. Choose your team’s actions.')}
}

function critter(type,level=5){
 const spec=speciesRegistry.get(type);
 const primary=spec?.types?.[0]||type;
 const hp=20+level*4;
 const p={type:primary,speciesId:spec?spec.speciesId:null,name:spec?.name||primary,level,hp,maxHp:hp,xp:0,status:'',moves:[],movePP:{}};
 return normalizeMoves(p);
}
function migrate(){
 if(!s)return;
 s.area=s.area||'village';if(!['village','lab','home','neighbor','route1','town','route2','forest','route3','cave','garden','gym'].includes(s.area))s.area='village';
 s.x=Number.isFinite(s.x)?s.x:17;s.y=Number.isFinite(s.y)?s.y:16;s.face=s.face||'down';
 if(!Array.isArray(s.party))s.party=s.starter?[critter(s.starter,5)]:[];
 s.party=s.party.map(p=>normalizeMoves({...critter(p.speciesId||p.type||'Rock',p.level||5),...p,maxHp:p.maxHp||36,hp:typeof p.hp==='number'?p.hp:36})).slice(0,8);
 if(!Array.isArray(s.storage))s.storage=[];s.storage=s.storage.map(p=>normalizeMoves({...critter(p.speciesId||p.type||'Grass',p.level||3),...p}));
 s.captureCount=s.captureCount||0;s.captureLog=Array.isArray(s.captureLog)?s.captureLog.filter(q=>q&&typeof q.type==='string').slice(-80):[];s.money=Number.isFinite(s.money)?s.money:250;
 s.inventory=s.inventory||{Potion:4,Revive:1};s.modules=Array.isArray(s.modules)?s.modules:[];s.installed=Array.isArray(s.installed)?s.installed:[];
 s.defeated=s.defeated||{};s.puzzles=s.puzzles||{};s.badges=s.badges||0;s.cut=s.badges>=1;
 s.rivalPassed=!!s.rivalPassed;s.introComplete=!!s.introComplete;
 s.worldMinutes=Number.isFinite(s.worldMinutes)?((s.worldMinutes%1440)+1440)%1440:8*60;
 s.worldDay=Number.isFinite(s.worldDay)&&s.worldDay>=1?Math.floor(s.worldDay):1;
 s.discoveries=s.discoveries&&typeof s.discoveries==='object'?s.discoveries:{};
 if(s.starter&&!s.rival)s.rival={Rock:'Water',Water:'Electric',Electric:'Rock'}[s.starter];
 s.x=Math.max(1,Math.min(W-2,s.x));s.y=Math.max(1,Math.min(H-2,s.y));
}
function put(x,y,t){if(x>=0&&x<W&&y>=0&&y<H)tiles[y][x]=t}
function rect(x,y,w,h,t){for(let a=x;a<x+w;a++)for(let b=y;b<y+h;b++)put(a,b,t)}
function npc(x,y,text,kind='',id=''){
 const sprite=pickNpcSprite(x,y,kind,id);
 const face=((x*31+y*7)%7===0)?'left':((x*13+y*11)%9===0)?'right':'down';
 npcs.push({x,y,text,kind,id,sprite,face});
}
function borders(type=T.tree){for(let x=0;x<W;x++){put(x,0,type);put(x,H-1,type)}for(let y=0;y<H;y++){put(0,y,type);put(W-1,y,type)}}
function houses(list){list.forEach(([x,y,w=7,h=5])=>{rect(x,y,w,h,T.roof);rect(x,y+h,w,2,T.wall);put(x+Math.floor(w/2),y+h+1,T.door)})}
function roads(){rect(1,12,32,3,T.path)}
function nature(seed,area){for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(tiles[y][x]===T.grass){const n=(x*43+y*59+x*y*7+seed)%113;if(n<area)put(x,y,T.tall);else if(n===44||n===79)put(x,y,T.flower)}}
function build(){
 migrate();tiles=Array.from({length:H},()=>Array(W).fill(['lab','gym','home','neighbor'].includes(s.area)?T.wood:T.grass));npcs=[];villageObstacles=new Set();interiorObjects=[];interiorBlocked=new Set();route1Blocked=new Set();
 switch(s.area){
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
 case 'home':
 case 'neighbor':
 borders(T.wall);put(17,25,T.door);
 furnishInterior(s.area);
 npc(14,11,s.area==='home'?['Your family is happy you came home.','The research lab has been preparing for your first journey.']:['Welcome! We have tea if you want to rest a moment.','The rice paddies look beautiful at sunset.']);
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
 npc(9,11,['Route 1 has wild Critters hiding in the rice fields.','The northern lookout and southern paddies are worth exploring.']);
 npc(20,13,['Want to test your team against mine?'],'routetrainer','rt1');
 break;
 case 'town':
 borders();roads();rect(16,8,2,5,T.path);rect(16,15,2,7,T.path);houses([[4,5,8,5],[21,5,9,5],[4,17,8,4],[21,17,9,4]]);
 npc(9,12,['Welcome to the town between the rice fields and the bamboo woods!']);
 npc(23,12,['Critter Center technicians heal your party and maintain your Index.'],'center');
 npc(14,18,['Welcome to the supply shop!'],'shop');
 npc(16,10,['This town is a good place to rest before Route 2.']);
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
 npc(9,9,['You found the Hidden Forest!','Rare habitats and additional wild encounters reward exploration.']);
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
 case 'garden':
 borders();roads();rect(23,8,3,5,T.path);rect(5,8,2,5,T.path);houses([[2,3,9,4],[20,3,10,5],[3,18,8,4],[20,18,10,4]]);
 for(let x=12;x<19;x++)for(let y=3;y<11;y++)if((x+y)%4===0)put(x,y,T.flower);
 rect(11,16,8,6,T.water);rect(14,16,2,6,T.path);
 npc(7,12,['Garden Town is famous for koi ponds, lanterns and the Grass Gym.']);
 npc(14,13,['Welcome to the Garden Town Critter Center!'],'center');
 npc(20,15,['Need supplies before the Gym?'],'shop');
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
 if(s.area==='village'&&(solidAt(s.x,s.y)||npcs.some(p=>p.x===s.x&&p.y===s.y))){
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
  if(!found){s.x=17;s.y=16}
 }
 snapVisual();
 $('location').textContent={village:'Starting Village',lab:'Research Laboratory',home:'Player Home',neighbor:'Village Home',route1:'Route 1 · Rice Fields',town:'Small Town',route2:'Route 2 · Bamboo Forest',forest:'Hidden Forest',route3:'Route 3 · Foothills',cave:'Mountain Cave',garden:'Garden Town',gym:'Grass Gym'}[s.area];
}
function say(lines,callback){dialog=lines.slice();dialogDone=callback||null;advance()}
function advance(){if(dialog.length){$('dialogText').textContent=dialog.shift();$('dialog').classList.add('show')}else{$('dialog').classList.remove('show');const fn=dialogDone;dialogDone=null;if(fn)fn()}}
// Extract each sprite's visible alpha bounds once. Different walk frames contain
// different transparent padding; cropping and centering on feet eliminates the
// apparent sideways drifting and keeps every frame on the same ground line.
const spriteFrames={male:null,female:null};
function spriteMetrics(gender){
 if(spriteFrames[gender])return spriteFrames[gender];
 const im=sprites[gender];if(!im.complete||!im.naturalWidth)return null;
 const rows=gender==='female'?3:4,cellW=Math.floor(im.naturalWidth/4),cellH=Math.floor(im.naturalHeight/rows);
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
   let minX=cellW,minY=cellH,maxX=-1,maxY=-1,torsoX=0,torsoN=0;
   for(let y=0;y<cellH;y++)for(let x=0;x<cellW;x++){
    const alpha=data[((row*cellH+y)*canvas.width+col*cellW+x)*4+3];
    if(alpha<24)continue;
    if(x<minX)minX=x;if(y<minY)minY=y;
    if(x>maxX)maxX=x;if(y>maxY)maxY=y;
   }
   if(maxX<0){frames.push({sx:col*cellW,sy:row*cellH,sw:cellW,sh:cellH,anchorX:cellW/2});continue}
   // Anchor horizontal position to the upper body, not to swinging legs.
   const torsoTop=minY+Math.floor((maxY-minY)*0.2);
   const torsoBottom=minY+Math.floor((maxY-minY)*0.65);
   for(let y=torsoTop;y<=torsoBottom;y++)for(let x=minX;x<=maxX;x++){
    if(data[((row*cellH+y)*canvas.width+col*cellW+x)*4+3]>=100){torsoX+=x;torsoN++}
   }
   const center=torsoN?torsoX/torsoN:(minX+maxX)/2;
   frames.push({sx:col*cellW+minX,sy:row*cellH+minY,sw:maxX-minX+1,sh:maxY-minY+1,anchorX:center-minX});
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
}
function drawTile(t,x,y,a,b){
 // All natural terrain shares a single continuous grass surface. Tile cells now
 // describe objects/foliage rather than independent rectangular patches of color.
 const natural=t===T.grass||t===T.tall||t===T.rice||t===T.flower;
 if(!natural){ctx.fillStyle=palette[t]||palette[0];ctx.fillRect(x,y,S+0.5,S+0.5)}
 const hash=(v)=>{const z=Math.sin(v*127.1+83.7)*43758.5453;return z-Math.floor(z)};
 const variation=hash(a*3.71+b*1.91);
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
     ctx.fillStyle='#87a951';
     for(let k=0;k<4;k++){
       const px=x+3+k*8,py=y+6+(a+b)%3;
       ctx.fillRect(px,py,2,19);ctx.fillRect(px+2,py+5,2,10);
       ctx.fillStyle='#d4c47c';ctx.fillRect(px+1,py+2,3,3);ctx.fillStyle='#87a951';
     }
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
 if(t===T.tree){
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
function drawVillageDetails(ox,oy,viewW,viewH){
 if(s.area!=='village')return;
 const pos=(x,y)=>[x*S-ox,y*S-oy];
 const segment=(x1,y1,x2,y2,width,color)=>{
  const a=pos(x1,y1),b=pos(x2,y2);
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
 };
 // Organic shadows connect the broad grasslands and soften straight tile boundaries.
 for(const [x,y,r] of [[2,12,46],[11,16,68],[17,4,76],[20,18,81],[31,10,52],[4,24,58],[29,24,57]]){
  const [px,py]=pos(x,y);
  ctx.fillStyle='#254d3761';ctx.beginPath();ctx.ellipse(px,py,r,r*.6,.18,0,Math.PI*2);ctx.fill();
 }
 // Grass creeping onto the irregular edges of the dirt paths.
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  if(tiles[y][x]!==T.path)continue;
  let nearby=0;
  for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]])if(tiles[y+dy]?.[x+dx]===T.grass)nearby++;
  if(!nearby)continue;
  const [px,py]=pos(x,y),seed=(x*53+y*31)%11;
  ctx.fillStyle='#74935c7a';
  if(tiles[y]?.[x-1]===T.grass)ctx.fillRect(px,py+seed,3,20);
  if(tiles[y]?.[x+1]===T.grass)ctx.fillRect(px+S-3,py+seed,3,18);
  if(tiles[y-1]?.[x]===T.grass)ctx.fillRect(px+seed,py,20,3);
  if(tiles[y+1]?.[x]===T.grass)ctx.fillRect(px+seed,py+S-3,20,3);
 }
 // Dirt paths feel worn-in rather than stamped squares. Keep the main road
 // footprint open and place subtle texture *within* the existing path cells.
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  if(tiles[y][x]!==T.path)continue;
  const [px,py]=pos(x,y),seed=(x*43+y*71)%23;
  ctx.fillStyle='#e0bd8e42';
  ctx.beginPath();ctx.ellipse(px+8+seed%11,py+7+(seed*3)%17,9,4,.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#947f6155';ctx.fillRect(px+2+seed,py+12+(seed%9),3,1.5);
 }
 // Long, wind-shaped vegetation clumps on grass, avoiding every impassable
 // tree, road, entrance, lantern, fence and rock position.
 for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
  if(tiles[y][x]!==T.grass||villageObstacles.has(key(x,y)))continue;
  const n=(x*29+y*47+x*y*3)%41;
  if(n>3)continue;
  const [px,py]=pos(x+.42,y+.64);
  ctx.fillStyle=n===0?'#6d9855':'#4c8153';
  ctx.beginPath();ctx.ellipse(px,py,9+n,4.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#a5b674';ctx.fillRect(px-2,py-7,2,6);
  if(n===1){ctx.fillStyle='#edc5ac';ctx.fillRect(px+6,py-8,3,3)}
 }
 // Warm light patches around the dwellings and the village's winding road.
 for(const [x,y,w,h] of [[5.1,10,3,1.5],[17,15.9,3,1.4],[28.8,12,2,1.2]]){
  const [px,py]=pos(x,y);
  ctx.fillStyle='#ebcc8a12';ctx.beginPath();ctx.ellipse(px,py,w*S,h*S,0,0,Math.PI*2);ctx.fill();
 }
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
 // Natural planting clusters and moss-softened stones.
 for(const [x,y] of [[2,11],[4,15],[11.5,18],[14.2,23.5],[21,17],[30.5,23],[18.8,7.5],[2,9.5],[30.7,9],[14,4]]){
  const [px,py]=pos(x,y);ctx.fillStyle='#4d7d4f';
  ctx.beginPath();ctx.ellipse(px,py,10,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#dcb8aa';ctx.fillRect(px-3,py-3,4,4);
  ctx.fillStyle='#efdbb5';ctx.fillRect(px+3,py-7,3,4);
 }
 // The buildings are dedicated, single-layer sprites, not canvas tile drawings.
 for(const h of VILLAGE_HOUSES){
  const [px,py]=pos(h.x,h.y),w=h.w*S,height=(h.h+2)*S;
  ctx.fillStyle='#15292488';
  ctx.beginPath();ctx.ellipse(px+w/2,py+height-12,w*.55,17,0,0,Math.PI*2);ctx.fill();
  const img=villageBuildings[h.kind];
  if(img.complete&&img.naturalWidth>0){
   ctx.imageSmoothingEnabled=false;ctx.drawImage(img,px,py,w,height);
  }else{
   // Graceful fallback if an image has not yet loaded.
   ctx.fillStyle='#64585c';ctx.fillRect(px,py,w,h.h*S);
   ctx.fillStyle='#d9c5a2';ctx.fillRect(px,py+h.h*S,w,2*S);
  }
  if(doorTransition?.house===h){
   const t=Math.min(1,(performance.now()-doorTransition.start)/220);
   const doorX=(h.door+.06)*S-ox,doorY=(h.y+h.h+.28)*S-oy;
   ctx.fillStyle='#1f1d20';ctx.fillRect(doorX,doorY,28,40);
   ctx.fillStyle='#b48757';ctx.fillRect(doorX+2,doorY+2,Math.max(0,26*(1-t)),36);
   ctx.fillStyle='#f4d9a066';ctx.fillRect(doorX+21,doorY+4,5,31);
  }
  // A restrained entrance cue, seen only while standing in front of the door.
  if(Math.abs(s.x-h.door)<=1&&s.y===h.y+h.h+2){
   const [cx,cy]=pos(h.door+.52,h.y+h.h+1.2);
   ctx.fillStyle='#fae9adcc';ctx.beginPath();ctx.arc(cx,cy,5,0,Math.PI*2);ctx.fill();
  }
 }
 // Fences are drawn in the *same cells* blocked by the collision map.
 for(const [x1,y1,x2,y2] of VILLAGE_FENCES){
  const xa=x1+.15,xb=x2-.15,yy=y1+.52;
  segment(xa,yy,xb,yy,4,'#4c3d32');
  segment(xa,yy-.19,xb,yy-.19,3,'#b18b61');
  for(let x=x1;x<x2;x++){
   const [px,py]=pos(x+.48,y1+.16);
   ctx.fillStyle='#4e382c';ctx.fillRect(px-3,py,6,26);
   ctx.fillStyle='#b7966c';ctx.fillRect(px-3,py,6,4);
  }
 }
 for(const [x,y] of VILLAGE_STONES){
  const [px,py]=pos(x+.5,y+.55);
  ctx.fillStyle='#29433880';ctx.beginPath();ctx.ellipse(px,py+9,14,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#77756c';ctx.beginPath();ctx.ellipse(px,py,11,8,-.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#b9b29b';ctx.fillRect(px-6,py-6,8,3);
 }
 // Warm lantern lighting without mobile-unfriendly filters.
 for(const [x,y] of VILLAGE_LANTERNS){
  const [px,py]=pos(x+.5,y+.55);
  ctx.fillStyle='#ffce7750';ctx.beginPath();ctx.arc(px,py-12,22,0,Math.PI*2);ctx.fill();
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
 // Soft field-scale shading makes the route read as a single landscape.
 for(const [x,y,rx,ry] of [[5,6,110,72],[22,5,145,79],[4,19,100,75],[27,20,120,74]]){
  ctx.fillStyle='#3869462b';ctx.beginPath();ctx.ellipse(px(x),py(y),rx,ry,.14,0,Math.PI*2);ctx.fill();
 }
 // Rice fields: horizontal irrigation ridges, water glints, stalk clusters.
 // Lines only run through rice cells, never across paths or road.
 for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
  const type=tiles[y][x],bx=px(x),by=py(y);
  if(type===T.rice){
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
   ctx.fillStyle='#416d4290';
   for(let i=0;i<3;i++){
    const sx=bx+4+i*10+(y%3),sy=by+22-(i%2)*4;
    ctx.fillRect(sx,sy-9,2,10);ctx.fillRect(sx+2,sy-12,2,10);
   }
  }else if(type===T.water){
   ctx.fillStyle='#6aafa8';ctx.fillRect(bx,by,S+1,S+1);
   ctx.fillStyle='#b9d7bd99';ctx.fillRect(bx+((x*7)%12),by+10,12,2);
   ctx.fillStyle='#436e6b';ctx.fillRect(bx,by+S-4,S,3);
  }
 }
 // Road shoulders blend with surrounding field edges and weathered gravel.
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(tiles[y][x]===T.path){
  const bx=px(x),by=py(y),seed=(x*73+y*41)%19;
  ctx.fillStyle='#957e5b55';ctx.fillRect(bx+4+seed,by+5+seed%15,3,2);
  ctx.fillStyle='#efce9666';ctx.beginPath();ctx.ellipse(bx+10+seed%8,by+13,11,4,.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#79975e90';
  if(tiles[y]?.[x-1]===T.grass||tiles[y]?.[x-1]===T.rice)ctx.fillRect(bx,by+6,3,23);
  if(tiles[y]?.[x+1]===T.grass||tiles[y]?.[x+1]===T.rice)ctx.fillRect(bx+S-3,by+6,3,23);
  if([T.grass,T.rice].includes(tiles[y-1]?.[x]))ctx.fillRect(bx+4,by,24,3);
  if([T.grass,T.rice].includes(tiles[y+1]?.[x]))ctx.fillRect(bx+4,by+S-3,24,3);
 }
 // Long bands follow the channels, leaving every crossing footprint clear.
 for(const [x1,x2,y] of [[3,10,9],[15,30,9],[3,13,19],[26,30,19]]){
  stroke(x1,y+.06,x2+1,y+.06,4,'#465c44');
  stroke(x1,y+.87,x2+1,y+.87,4,'#557b59');
 }
 // Raised wooden footbridges are decorative and align to safe path tiles.
 for(const [x,y,w] of [[11,9,3],[22,19,3]]){
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
  ctx.fillStyle='#203e315e';ctx.beginPath();ctx.ellipse(bx+16,by+29,14,6,0,0,Math.PI*2);ctx.fill();
  if(o.kind==='sign'||o.kind==='notice'){
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

function drawInteriorDetails(ox,oy,viewW,viewH){
 if(!isInterior(s.area))return;
 const wx=(x)=>x*S-ox,wy=(y)=>y*S-oy;
 const box=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(wx(x),wy(y),w*S,h*S)};
 const pixel=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(wx(x)+w*.0,wy(y),w,h)};
 const line=(x1,y1,x2,y2,color,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(wx(x1),wy(y1));ctx.lineTo(wx(x2),wy(y2));ctx.stroke()};
 // Continuous plank flooring rather than visually isolated square wood tiles.
 box(0,0,W,H,'#8e7258');
 for(let y=0;y<H;y+=1.22)line(0,y,W,y,'#6c523f',2);
 for(let x=0;x<W;x+=6)line(x,0,x,H,'#ae9170',1.5);
 for(let y=0;y<H;y+=2.44)for(let x=((y*7)%2)*3;x<W;x+=6)line(x,y,x,y+1.22,'#74563f',1.5);
 // Tatami lounge sections and softly shaded edge bindings.
 const tatami=s.area==='lab'?[[12,15,9,5]]:[[11,6,11,6],[12,15,9,5]];
 for(const [x,y,w,h] of tatami){
  box(x,y,w,h,'#b9ad83');
  box(x+.10,y+.10,w-.20,h-.20,'#d9c99b');
  for(let k=0;k<w;k+=2.2)line(x+k,y+.2,x+k,y+h-.2,'#a99f76',1);
  line(x+.12,y+h-.2,x+w-.12,y+h-.2,'#687d69',4);
 }
 // Window-wall, waist-high joinery, wooden uprights and overhead beams.
 box(0,0,W,2.4,'#463b37');
 box(0,2.4,W,1.0,'#b7a186');
 box(0,3.25,W,.25,'#44382e');
 box(0,24.8,W,1.2,'#57493c');
 box(0,24.85,16.45,.18,'#ad8969');box(17.55,24.85,16.45,.18,'#ad8969');
 box(0,0,.9,H,'#4b3b33');box(W-.9,0,.9,H,'#4b3b33');
 for(let x=4;x<W;x+=6)box(x-.12,0,.24,3.5,'#695040');
 // Shoji paper windows along upper wall, framed with dark wooden lattice.
 for(const x of [4,23]){
  box(x,1.55,6,2,'#4a3930');box(x+.18,1.7,5.64,1.65,'#e7dfc5');
  for(let j=1;j<5;j++)box(x+j*1.1,1.7,.09,1.65,'#795842');
  box(x+.18,2.47,5.64,.1,'#795842');
 }
 // Hanging paper lamps spill a restrained golden glow.
 for(const x of s.area==='lab'?[12,22]:[12,24]){
  const cx=wx(x),cy=wy(3.6);
  ctx.fillStyle='#ffe4a31e';ctx.beginPath();ctx.ellipse(cx,cy,30,18,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3f392f';ctx.fillRect(cx-7,cy-9,14,3);
  ctx.fillStyle='#f2dab0';ctx.fillRect(cx-6,cy-6,12,12);
  ctx.fillStyle='#5e4b3a';ctx.fillRect(cx-7,cy+5,14,3);
 }
 // Two side wall columns framing the entrance.
 box(15.7,23.95,.3,1,'#644b3a');box(18.98,23.95,.3,1,'#644b3a');
 box(16.92,25,.16,.9,'#2a2e33');box(17.6,25,.15,.9,'#2a2e33');
 box(17.08,25,.52,1,'#48342b');
 for(const o of interiorObjects){
  const {x,y,w,h,kind}=o,px=wx(x),py=wy(y),ww=w*S,hh=h*S;
  // Cast shadow and contact shadow before drawing the actual solid furniture.
  ctx.fillStyle='#201b1c66';ctx.beginPath();ctx.ellipse(px+ww/2,py+hh-1,ww*.48,Math.max(5,hh*.13),0,0,Math.PI*2);ctx.fill();
  if(kind==='bed'){
   box(x+.05,y+.2,w-.1,h-.25,'#604639');
   box(x+.25,y+.12,w-.5,h-.5,'#e6ded0');
   box(x+.4,y+.2,w-.8,1.05,'#f7efde');
   box(x+.4,y+1.4,w-.8,h-1.9,'#a4b0a6');
   line(x+.5,y+1.4,x+w-.5,y+1.4,'#d9dfd0',4);
   box(x+.6,y+h-.4,w-1.2,.25,'#55433a');
  }else if(kind==='bookshelf'){
   box(x+.05,y+.12,w-.1,h-.12,'#503c32');
   box(x+.23,y+.3,w-.46,h-.56,'#ad845c');
   for(let k=0;k<3;k++){
    const yy=y+.48+(h-.9)*(k+.2)/3;
    box(x+.23,yy,w-.46,.16,'#4d3a30');
    for(let j=0;j<Math.floor(w*3);j++){
     const xx=x+.36+j*(w-.82)/Math.max(1,Math.floor(w*3));
     box(xx,yy-.4,.14,.38,['#647786','#b78568','#a8a380','#d4bca4','#76776e'][(j+k)%5]);
    }
   }
  }else if(kind==='counter'||kind==='desk'){
   box(x+.12,y+.35,w-.24,h-.4,'#59443c');
   box(x+.02,y+.1,w-.04,h-.5,'#a27a57');
   box(x+.22,y+.23,w-.44,h-.8,'#b99068');
   for(let j=0;j<Math.min(4,w-1);j++)box(x+.55+j*1.2,y+.55,.45,.6,['#c6d5cd','#647f7d','#d8c28e','#535f71'][j]);
   line(x+.15,y+h-.33,x+w-.15,y+h-.33,'#493831',3);
   if(kind==='desk'){box(x+w*.52,y+.36,1,.75,'#e5d8b8');line(x+w*.52,y+.42,x+w*.52+.9,y+.42,'#746b66',1);}
  }else if(kind==='terminal'){
   box(x+.2,y+.35,w-.4,h-.5,'#4a5554');
   box(x+.3,y+.15,w-.6,h-.9,'#708682');
   box(x+.46,y+.32,w-.92,h-1.45,'#203e48');
   for(let j=0;j<4;j++)box(x+.65,y+.55+j*.35,w-1.3,.08,j%2?'#6fc0a9':'#a4dacf');
   box(x+.48,y+h-.55,w-.96,.23,'#c4c6ae');
  }else if(kind==='display'){
   box(x+.12,y+.25,w-.24,h-.32,'#705441');
   box(x+.22,y+.08,w-.44,h-.5,'#d4bb8e');
   if(o.id==='lab-starters'){
    for(let j=0;j<3;j++){
     const cx=x+.9+j*(w-1.8)/2;
     box(cx-.38,y+.23,.78,.85,['#9d968b','#568ec2','#ddb652'][j]);
     box(cx-.2,y+.4,.4,.35,'#e3e9dc');
    }
   }else box(x+.5,y+.3,w-1,.33,'#a3ae9e');
  }else if(kind==='chest'){
   box(x+.1,y+.4,w-.2,h-.45,'#483b32');
   box(x+.13,y+.1,w-.26,h-.65,'#9f7550');
   box(x+.13,y+.1,w-.26,.27,'#c39464');
   for(let j=0;j<3;j++)box(x+.4+j*(w-.8)/2,y+.1,.12,h-.7,'#5f4c40');
   box(x+w/2-.14,y+h/2-.14,.28,.38,'#e6c887');
  }else if(kind==='table'){
   box(x+.15,y+.35,w-.3,h-.4,'#5a4031');
   box(x+.12,y+.1,w-.24,h-.65,'#ae825d');
   box(x+.5,y+.35,.8,.55,'#e3e0ce');
   box(x+1.65,y+.35,.7,.55,'#eee3c9');
   box(x+2.4,y+.48,.3,.45,'#4b8071');
  }else if(kind==='board'){
   box(x+.12,y+.04,w-.24,h-.1,'#46382f');
   box(x+.23,y+.14,w-.46,h-.32,'#ddd2b5');
   for(let j=0;j<Math.min(5,w-1);j++)box(x+.55+j*1.2,y+.27,.7,.08,'#817263');
  }
  // Brief sparkle on the object's edge when it's immediately inspectable.
  const near=s&&s.area&&Math.abs(s.x-(x+w/2))<=w/2+1&&Math.abs(s.y-(y+h/2))<=h/2+1;
  if(near){
   const blink=Math.floor(performance.now()/450)%2;
   ctx.fillStyle=blink?'#f9e6a4':'#fff7d3';
   ctx.beginPath();ctx.arc(px+ww-8,py+9,3,0,Math.PI*2);ctx.fill();
  }
 }
 // Light overall warmth; avoid affecting legibility of character sprites.
 ctx.fillStyle='#edc99308';ctx.fillRect(0,0,viewW,viewH);
}


// Phase 5: Cosmetic local-world day/night clock. One real second advances one
// in-game minute; time is saved on existing save events. No battle/calendar effects.
let atmospherePreviousFrame=0;
const atmosphericIndoor=()=>['home','neighbor','lab','gym'].includes(s.area);
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
function drawAtmosphericMotion(ox,oy,w,h,now){
 // Animated foliage and subtle irrigation ripples are purely decorative:
 // never change tile collisions, random encounters, or movement state.
 if(atmosphericIndoor())return;
 const wind=now/750,lowX=Math.max(0,Math.floor(ox/S)),hiX=Math.min(W,Math.ceil((ox+w)/S));
 const lowY=Math.max(0,Math.floor(oy/S)),hiY=Math.min(H,Math.ceil((oy+h)/S));
 for(let y=lowY;y<hiY;y++)for(let x=lowX;x<hiX;x++){
  const t=tiles[y]?.[x];if(t!==T.tall&&t!==T.rice&&t!==T.water)continue;
  const sx=x*S-ox,sy=y*S-oy;
  if(t===T.water){
   ctx.fillStyle='#c5efda80';
   const ripple=(now/160+(x*11+y*17))%28;
   ctx.fillRect(sx+2+ripple,sy+7+(x+y)%9,7,1.5);
  }else{
   const sway=Math.sin(wind+x*.8+y*.56)*2.3;
   ctx.strokeStyle=t===T.rice?'#d9d08b':'#91be73';
   ctx.lineWidth=1.8;
   for(let k=0;k<2;k++){
    const start=sx+8+k*12,base=sy+25-k*4;
    ctx.beginPath();ctx.moveTo(start,base);ctx.lineTo(start+sway,base-11);ctx.stroke();
   }
  }
 }
 // Floating motes are sparse; fixed positions mean no flickering.
 const motes=Math.min(34,Math.ceil(w*h/15000));
 for(let i=0;i<motes;i++){
  const mx=((i*173.1+Math.sin(i*33)*135+now/120*(i%3+1))%(W*S)+W*S)%(W*S)-ox;
  const my=((i*89.7+Math.cos(i*19)*77-now/280)%(H*S)+H*S)%(H*S)-oy;
  if(mx<0||my<0||mx>w||my>h)continue;
  ctx.fillStyle=worldPhase()==='Night'?'#eddca785':'#f2f4d14d';
  ctx.fillRect(mx,my,i%4===0?2:1,2);
 }
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
 // Dynamic lantern pools are painted after darkening, so their colors remain warm.
 const lamps=inside?(s.area==='lab'?[[12,3.6],[22,3.6]]:[[12,3.6],[24,3.6]]):
  s.area==='village'?[[10,11],[24,12],[17,20],[29,14],[6,13]]:
  s.area==='route1'?[[5,11],[28,11],[14,5]]:
  s.area==='town'?[[8,11],[22,11],[25,16]]:
  s.area==='garden'?[[6,13],[20,15]]:[];
 const strength=inside?1.2:Math.max(.15,darkness/.52);
 if(strength>.1)for(const [x,y] of lamps){
  const sx=x*S+S*.5-ox,sy=y*S+S*.2-oy;
  if(sx<-115||sy<-115||sx>w+115||sy>h+115)continue;
  atmosphericLight(sx,sy,inside?92:85,strength);
  ctx.fillStyle='#fff0be';ctx.fillRect(sx-2,sy-3,4,7);
  ctx.fillStyle='#b77e49';ctx.fillRect(sx-4,sy+3,8,3);
 }
 // A light halo keeps the player legible at night without negating darkness.
 if(!inside&&darkness>.25){
  const px=visual.x*S+16-ox,py=visual.y*S+15-oy;
  atmosphericLight(px,py,62,Math.min(.95,darkness));
 }
}
function drawAtmosphereHUD(){
 const h=worldHour(),hours=Math.floor(h),minutes=Math.floor((h-hours)*60);
 const clock=String(hours).padStart(2,'0')+':'+String(minutes).padStart(2,'0');
 const label='Day '+(s.worldDay||1)+' · '+clock+' · '+worldPhase();
 ctx.font='bold 11px system-ui';
 const width=ctx.measureText?ctx.measureText(label).width+18:166;
 const x=Math.max(5,C.width/Math.max(.85,Math.min(2.25,Math.min(C.width/600,C.height/440)))-width-8);
 const y=x<340?39:6; // On narrow phones, keep the clock below the main HUD.
 ctx.fillStyle='#162d36e3';ctx.fillRect(x,y,width,24);
 ctx.fillStyle='#f4e3b1';ctx.fillText(label,x+8,y+16);
}

function resizeGameCanvas(){
 const width=Math.max(1,Math.round(C.clientWidth||C.getBoundingClientRect().width));
 const height=Math.max(1,Math.round(C.clientHeight||C.getBoundingClientRect().height));
 if(C.width!==width||C.height!==height){C.width=width;C.height=height;ctx.imageSmoothingEnabled=false}
}
function draw(){
 if(screen!=='game'||!s)return;
 resizeGameCanvas();
 tickAtmosphere();
 updateVisual();
 const zoom=Math.max(0.85,Math.min(2.25,Math.min(C.width/600,C.height/440)));
 const viewportWidth=C.width/zoom,viewportHeight=C.height/zoom;
 const ox=W*S<=viewportWidth?(W*S-viewportWidth)/2:Math.max(0,Math.min(W*S-viewportWidth,visual.x*S-viewportWidth/2));
 const oy=H*S<=viewportHeight?(H*S-viewportHeight)/2:Math.max(0,Math.min(H*S-viewportHeight,visual.y*S-viewportHeight/2));
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#6b9e60';ctx.fillRect(0,0,C.width,C.height);ctx.setTransform(zoom,0,0,zoom,0,0);
 // Painted world-space foliage patches extend across tile boundaries.
 for(let y=Math.max(0,Math.floor(oy/96)-1);y<Math.min(Math.ceil(H*S/96)+1,Math.ceil((oy+viewportHeight)/96)+1);y++)for(let x=Math.max(0,Math.floor(ox/96)-1);x<Math.min(Math.ceil(W*S/96)+1,Math.ceil((ox+viewportWidth)/96)+1);x++){
   const cx=x*96+47-ox,cy=y*96+47-oy;
   ctx.fillStyle=(x*7+y*11)%3===0?'rgba(54,118,61,.13)':'rgba(145,181,100,.12)';
   ctx.beginPath();ctx.ellipse(cx,cy,62,43,0,0,Math.PI*2);ctx.fill();
 }
 for(let y=Math.max(0,Math.floor(oy/S));y<Math.min(H,Math.ceil((oy+viewportHeight)/S));y++)for(let x=Math.max(0,Math.floor(ox/S));x<Math.min(W,Math.ceil((ox+viewportWidth)/S));x++)drawTile(tiles[y][x],x*S-ox,y*S-oy,x,y);
 if(s.area==='village')drawVillageDetails(ox,oy,viewportWidth,viewportHeight);
 if(isInterior(s.area))drawInteriorDetails(ox,oy,viewportWidth,viewportHeight);
 if(s.area==='route1')drawRoute1Details(ox,oy,viewportWidth,viewportHeight);
 drawAtmosphericMotion(ox,oy,viewportWidth,viewportHeight,performance.now());
 for(const p of npcs){
 if((p.kind==='gymtrainer'||p.kind==='routetrainer')&&s.defeated[p.id]){ /* Trainer remains visible for rematches. */ }
 const x=p.x*S+16-ox,y=p.y*S+32-oy;
 // A soft ground shadow anchors each character to the map.
 ctx.fillStyle='#152f2780';ctx.beginPath();ctx.ellipse(x,y-2,12,5,0,0,Math.PI*2);ctx.fill();
 drawNpc(p,x,y);
 if((p.kind==='gymtrainer'||p.kind==='routetrainer')&&!s.defeated[p.id]){
  ctx.fillStyle='#fff1a0';ctx.font='bold 14px monospace';ctx.fillText('!',x-4,y-43);
 }
}
 const isMoving=(stickActive&&!!stickDirection)||Object.values(held).some(Boolean)||Math.abs(visual.x-s.x)+Math.abs(visual.y-s.y)>.015;
 const walkFrame=isMoving?Math.floor(performance.now()/105)%4:0;
 sprite(s.gender,visual.x*S+16-ox,visual.y*S+32-oy,s.face,walkFrame,1.25);
 drawAtmosphereOverlay(ox,oy,viewportWidth,viewportHeight);
 ctx.fillStyle='#1c3835dc';ctx.fillRect(5,5,330,28);ctx.fillStyle='#fff1ca';ctx.font='bold 13px system-ui';ctx.fillText(s.name+' · '+(s.starter||'Visit lab')+' · '+s.money+' ◇ · '+s.badges+' Badge',11,23);
 drawAtmosphereHUD()
}
function region(area,x,y,textLine){doorTransition=null;s.area=area;s.x=x;s.y=y;build();save();if(textLine)say([textLine])}
function move(d){
 if(screen!=='game'||modal||doorTransition||$('dialog').classList.contains('show'))return;
 s.face=d;const v=dirs[d],x=s.x+v[0],y=s.y+v[1];
 if(s.area==='village'&&d==='right'&&x>=W-2&&tiles[y]?.[W-1]!==T.tree&&!solidAt(W-2,y)){if(!s.introComplete)return say(['Complete the laboratory tutorial before exploring Route 1.']);return region('route1',2,y,'Route 1 — Rice Fields. Wild Critters hide in tall grass.')}
 if(s.area==='route1'&&d==='left'&&x<=1&&tiles[y]?.[0]!==T.tree&&!solidAt(1,y))return region('village',31,y);
 if(s.area==='route1'&&d==='right'&&x>=32&&[12,13,14].includes(y)&&tiles[y]?.[W-2]===T.path)return region('town',2,y,'You arrive at the first small town. Heal and shop here!');
 if(s.area==='town'&&d==='left'&&x<=1&&[12,13,14].includes(y))return region('route1',31,y);
 if(s.area==='town'&&d==='right'&&x>=32&&[13,14].includes(y))return region('route2',2,y,'Route 2 — Bamboo Forest.');
 if(s.area==='route2'&&d==='left'&&x<=1&&[13,14].includes(y))return region('town',31,y);
 if(s.area==='route2'&&d==='right'&&x>=32&&[13,14].includes(y))return region('route3',2,y,'Route 3 — Mountain Foothills.');
 if(s.area==='route2'&&d==='up'&&y<=1&&x>=10&&x<=12)return region('forest',17,23,'You discovered the optional Hidden Forest!');
 if(s.area==='forest'&&d==='down'&&y>=24&&x>=15&&x<=18)return region('route2',11,2);
 if(s.area==='route3'&&d==='left'&&x<=1&&[13,14].includes(y))return region('route2',31,y);
 if(s.area==='route3'&&d==='right'&&x>=32&&[13,14].includes(y))return region('garden',2,y,'You enter Garden Town, home of the first Grass Gym.');
 if(s.area==='route3'&&d==='up'&&y<=1&&x>=19&&x<=21){if(!s.cut)return say(['Thick vines block the cave entrance.','The first badge unlocks the Critter Index vegetation cutter.']);return region('cave',17,23,'The Critter Index cuts the vines! Mountain Cave is open.')}
 if(s.area==='cave'&&d==='down'&&y>=24&&x>=15&&x<=18)return region('route3',20,2);
 if(s.area==='garden'&&d==='left'&&x<=1&&[13,14].includes(y))return region('route3',31,y);
 if(s.area==='garden'&&d==='up'&&x===24&&y===10)return enterGym();
 if(s.area==='gym'&&d==='down'&&x===17&&y>=25)return region('garden',24,12);
 if(x<0||y<0||x>=W||y>=H)return;
 const door=villageDoorAt(x,y);
 if(door){openVillageDoor(door);return}
 if(npcs.some(p=>p.x===x&&p.y===y)||solidAt(x,y))return;
 const t=tiles[y][x];
 beginStep(x,y);s.x=x;s.y=y;frame=(frame+1)%4;
 // Village doors use the shared door interaction and short opening animation.
 if(['lab','home','neighbor'].includes(s.area)&&x===17&&y===25){
  const h=VILLAGE_HOUSES.find(b=>b.kind===s.area);
  return region('village',h.door,h.y+h.h+2);
 }
 if(s.area==='route2'&&!s.defeated.rt2&&Math.abs(s.x-24)+Math.abs(s.y-13)<=3)return say(['Bamboo trainer: I spotted you! Time for a battle.'],()=>startTrainer('rt2'));
 if(s.area==='garden'&&!s.rivalPassed&&Math.abs(s.x-24)+Math.abs(s.y-11)<=3){s.rivalPassed=true;save();return say(['Your childhood rival greets you outside the Grass Gym.','Let us see how much we have improved!'],()=>startTrainer('rival'))}
 if((s.steps=(s.steps||0)+1)%10===0)save();
 if(['route1','route2','route3','forest','cave'].includes(s.area)&&[T.tall,T.rice,T.stone].includes(t)&&s.introComplete&&Math.random()<0.11)startWild()
}
function interact(){
 if(modal||doorTransition)return;if($('dialog').classList.contains('show'))return advance();
 const v=dirs[s.face],x=s.x+v[0],y=s.y+v[1],p=npcs.find(q=>q.x===x&&q.y===y);
 if(p)p.face={up:'down',down:'up',left:'right',right:'left'}[s.face];
 if(p){if(p.kind==='researcher'){if(!s.starter)return say(p.text,starterMenu);return say(['Researcher: Your Critter Index is functioning well. Good luck!'])}
 if(p.kind==='center')return center();
 if(p.kind==='shop')return shop();
 if(p.kind==='gymtrainer'||p.kind==='routetrainer')return s.defeated[p.id]?say(['Trainer: Good match! Want a rematch?'],()=>rematchMenu(p.id)):say(p.text,()=>startTrainer(p.id));
 if(p.kind==='leader')return s.badges?say(['Gym Leader: Your first badge is well earned.']):!s.defeated.g1||!s.defeated.g2||!s.defeated.g3||!s.puzzles.gate?say(['Gym Leader: Defeat all three trainers and open the garden mechanism first.']):startTrainer('leader');
 if(p.kind==='switch'){if(s.defeated.g1&&s.defeated.g2&&s.defeated.g3){s.puzzles.gate=true;build();save();return say(['You activate the garden mechanism. The roots withdraw!'])}return say(['The mechanism is tangled in roots. Defeat all three Gym trainers first.'])}
 return say(p.text)}
 const door=villageDoorAt(x,y);
 if(door)return openVillageDoor(door);
 if(['lab','home','neighbor'].includes(s.area)&&x===17&&y===25){
  const h=VILLAGE_HOUSES.find(b=>b.kind===s.area);
  return region('village',h.door,h.y+h.h+2);
 }
 const object=interiorObjects.find(o=>x>=o.x&&x<o.x+o.w&&y>=o.y&&y<o.y+o.h);
 if(object&&isInterior(s.area))return inspectInterior(object);
 const routeSite=route1SiteAt(x,y);
 if(routeSite)return inspectRoute1Site(routeSite);
 if(s.area==='garden'&&x===24&&y===10)return enterGym();
 if(s.area==='gym'&&x===17&&y===25)return region('garden',24,12);
}
function rematchMenu(id){open('Trainer Rematch','<p>Challenge this trainer again? Their Critters may be stronger.</p><button class="btn primary" id="yesRematch">Battle</button> <button class="btn" id="noRematch">Not now</button>');$('yesRematch').onclick=()=>{close();startTrainer(id)};$('noRematch').onclick=close}
function enterGym(){if(!s.rivalPassed){s.rivalPassed=true;save();return say(['Your childhood rival is waiting at the Grass Gym entrance!'],()=>startTrainer('rival'))}return region('gym',17,23,'Grass Gym — Find all three trainers in the hedge maze.')}
function open(title,body){releaseMovement();modal=true;$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('shade').classList.add('show')}
function close(){if(battle)return;modal=false;$('shade').classList.remove('show');$('close').hidden=false}
function firstAlive(){return s.party.findIndex(p=>p.hp>0)}
function lead(){return s.party[firstAlive()]}
function mult(atk,def){if(strengths[atk]?.includes(def))return 2;if(strengths[def]?.includes(atk))return 0.5;return 1}
function activeModifier(side){let value=0;for(const m of s.installed){if(!m)continue;if(m==='Power Coil')value+=side==='ally'?0.12:0;if(m==='Guard Plate')value+=side==='enemy'?-0.1:0;if(m==='Weakening Field')value+=side==='ally'?0.1:0}return Math.max(0.5,1+value)}

// Phase 4 — Index is a read-only wrist device outside a Critter Center.
// Party swapping and module configuration remain Center-exclusive.
let indexTab='clock',indexSelection=0;
const INDEX_TABS=[['clock','⌚ Clock'],['party','◇ Party'],['items','▣ Bag'],['records','◎ Records'],['moves','✦ Moves'],['tools','⚙ Tools']];
let moveBookType='Water';
function index(){
 if(screen!=='game'||battle)return;
 indexTab='clock';indexSelection=0;renderIndex();
}
function indexSlotContent(i){
 if(i<8){
  const p=s.party[i];
  return p?'<span class="watchSlotIcon">'+(symbols[p.type]||'◇')+'</span><span class="watchSlotName">'+escapeHtml(p.type)+'</span><small>Lv '+p.level+'</small>'
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
    +'<span class="watchTime">'+(i+1)+'</span><span class="watchTinyIcon">'+(i<8?(s.party[i]?symbols[s.party[i].type]||'◇':'·'):'✧')+'</span></button>';
 }
 clock+='</div>';
 const i=indexSelection,p=s.party[i],mod=s.installed[i-8];
 let detail;
 if(i<8&&p){
  const pct=Math.max(0,Math.min(100,Math.round(p.hp/Math.max(1,p.maxHp)*100)));
  detail='<div class="watchSelectionHeading">'+(symbols[p.type]||'◇')+' '+escapeHtml(p.type)+' <span>Lv '+p.level+'</span></div>'
   +'<div class="watchMeter"><div style="width:'+pct+'%"></div></div><div class="watchSelectionStats">HP '+p.hp+' / '+p.maxHp+' · XP '+(p.xp||0)+' / '+p.level*12+'</div>'
   +'<div class="watchSelectionStats">Status: '+escapeHtml(p.status||'Healthy')+'</div>';
 }else if(i<8){
  detail='<div class="watchSelectionHeading">Empty party position</div><p>Capture a wild Critter to fill this slot.</p>';
 }else{
  detail='<div class="watchSelectionHeading">Module socket '+(i+1)+'</div><p>'+(mod?escapeHtml(mod):'No module installed')+'</p>'
   +'<small>Module changes are available only at a Critter Center.</small>';
 }
 return '<div class="watchClockLayout">'+clock+'<div class="watchSelection">'
  +'<span class="watchEyebrow">'+(i+1)+' O’CLOCK '+(i<8?'· PARTY':'· MODULE')+'</span>'+detail
  +'<button type="button" class="btn watchMinor" id="watchViewTab">'+(i<8?'View party details':'View modules')+'</button>'
  +'</div></div>';
}
function indexParty(){
 const cards=Array.from({length:8},(_,i)=>{
  const p=s.party[i];
  if(!p)return '<div class="watchPartyCard empty"><span>Slot '+(i+1)+'</span><strong>◇ Empty</strong></div>';
  const pct=Math.round(100*p.hp/Math.max(1,p.maxHp));
  return '<div class="watchPartyCard"><div><span class="watchPartyNumber">'+(i+1)+'</span><strong>'+(symbols[p.type]||'◇')+' '+escapeHtml(p.name||p.type)+'</strong>'
   +'<small>Lv '+p.level+'</small></div><div class="watchMeter"><div style="width:'+pct+'%"></div></div>'
   +'<div class="watchPartyMeta">HP '+p.hp+'/'+p.maxHp+' · '+escapeHtml(p.status||'Healthy')+'</div>'
   +'<div class="watchPartyMeta">'+(p.moves||[]).map(id=>{const m=getMove(p,id);return escapeHtml(m.name)+' ('+(p.movePP?.[id]??m.pp)+' PP)'}).join(' · ')+'</div></div>';
 }).join('');
 return '<div class="watchSectionTitle">Active party <small>'+s.party.length+' / 8</small></div>'
  +'<div class="watchPartyGrid">'+cards+'</div><div class="watchReadOnly">⌁ Party rearranging and home storage retrieval require a Critter Center. Stored at home: '+s.storage.length+'</div>';
}
function indexItems(){
 const items=Object.entries(s.inventory||{}).filter(([,v])=>v>0);
 const list=items.length?items.map(([k,v])=>'<div class="watchRow"><span>▣ '+escapeHtml(k)+'</span><strong>×'+v+'</strong></div>').join(''):'<div class="watchEmpty">Your bag is empty.</div>';
 const modules=['Power Coil','Guard Plate','Weakening Field'];
 const owned=modules.map(m=>{const count=s.modules.filter(x=>x===m).length;return count?'<div class="watchRow"><span>✧ '+escapeHtml(m)+'</span><strong>×'+count+'</strong></div>':''}).join('');
 return '<div class="watchSectionTitle">Field inventory <small>View only</small></div>'+list
  +'<div class="watchSectionTitle">Available modules</div>'+(owned||'<div class="watchEmpty">No uninstalled modules owned.</div>')
  +'<div class="watchReadOnly">Items are usable during battles; modules are installed at Critter Centers.</div>';
}
function indexRecords(){
 const log=(s.captureLog||[]).slice(-12).reverse();
 const history=log.length?log.map(q=>'<div class="watchRow"><span>'+(symbols[q.type]||'◇')+' '+escapeHtml(q.type)+' <small>Lv '+Number(q.level||1)+'</small></span><span class="watchRecordLocation">'+escapeHtml(q.area||'Unknown')+' · '+escapeHtml(q.storage||'Party')+'</span></div>').join('')
  :'<div class="watchEmpty">New captures will appear here. Older saves retain their capture totals, but individual capture histories were not previously stored.</div>';
 return '<div class="watchMetrics">'
  +'<div><strong>'+s.captureCount+'</strong><span>Total captures</span></div>'
  +'<div><strong>'+s.storage.length+'</strong><span>Home storage</span></div>'
  +'<div><strong>'+s.badges+'</strong><span>Badges</span></div>'
  +'</div><div class="watchSectionTitle">Recent capture registrations</div>'+history
  +'<div class="watchReadOnly">Species remain labeled by type until the 25 original Critter designs are added.</div>';
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

function indexTools(){
 const cutter=!!s.cut,level=s.badges>=5?'Rare':s.badges>=2?'Advanced':'Basic';
 let modules=Array.from({length:4},(_,i)=>'<div class="watchModuleRow"><span>'+(i+9)+' O’CLOCK</span><strong>'+escapeHtml(s.installed[i]||'Empty module socket')+'</strong></div>').join('');
 return '<div class="watchSectionTitle">Critter Index maintenance</div>'
  +'<div class="watchToolCard"><strong>✧ Capture Beam</strong><span>ONLINE</span><p>Capture wild Critters during 1v1 encounters. Lower target HP to improve capture chances.</p></div>'
  +'<div class="watchToolCard"><strong>⚙ Vegetation Cutter</strong><span>'+(cutter?'UNLOCKED':'LOCKED')+'</span><p>'+(cutter?'First-badge cutting function is active.':'Earn the first Grass Gym badge to unlock vegetation cutting.')+'</p></div>'
  +'<div class="watchToolCard"><strong>◇ Module Access</strong><span>'+level.toUpperCase()+'</span><p>Basic at 0 badges · Advanced at 2 · Rare at 5.</p></div>'
  +'<div class="watchSectionTitle">Module sockets</div>'+modules
  +'<div class="watchReadOnly">Your watch is read-only away from a Critter Center. Modules are automatic after installation.</div>';
}
function renderIndex(){
 if(!s||screen!=='game'||battle)return;
 const tabs=INDEX_TABS.map(([key,label])=>'<button type="button" class="watchTab '+(indexTab===key?'selected':'')+'" data-watch-tab="'+key+'" aria-pressed="'+(indexTab===key)+'">'+label+'</button>').join('');
 let content=indexTab==='clock'?indexClock():indexTab==='party'?indexParty():indexTab==='items'?indexItems():indexTab==='records'?indexRecords():indexTab==='moves'?indexMoves():indexTools();
 open('Critter Index','<div class="watchShell"><div class="watchStatus"><span>◉ WATCH CONNECTED</span><strong>'+escapeHtml(s.name)+'</strong></div>'
  +'<div class="watchStats"><span>◇ '+s.money+' credits</span><span>✧ '+s.badges+' badge'+(s.badges===1?'':'s')+'</span>'
  +'<span>▤ '+s.captureCount+' captures</span></div><nav class="watchTabs" aria-label="Critter Index screens">'+tabs+'</nav>'
  +'<div class="watchScreen" role="region" aria-label="Critter Index '+escapeHtml(indexTab)+' screen">'+content+'</div>'
  +'<div class="watchFooter"><button type="button" class="btn" id="mSave">Save Adventure</button>'
  +'<button type="button" class="btn" id="mTitle">Return to Title</button></div></div>');
 document.querySelectorAll('[data-watch-tab]').forEach(b=>b.onclick=()=>{
  if(!INDEX_TABS.some(([key])=>key===b.dataset.watchTab))return;
  indexTab=b.dataset.watchTab;renderIndex();
 });
 document.querySelectorAll('[data-move-type]').forEach(b=>b.onclick=()=>{
  if(!Object.keys(strengths).concat('Typeless').includes(b.dataset.moveType))return;
  moveBookType=b.dataset.moveType;renderIndex();
 });
 document.querySelectorAll('[data-index-slot]').forEach(b=>b.onclick=()=>{
  const n=Number(b.dataset.indexSlot);if(!Number.isInteger(n)||n<0||n>=12)return;
  indexSelection=n;renderIndex();
 });
 const view=$('watchViewTab');
 if(view)view.onclick=()=>{indexTab=indexSelection<8?'party':'tools';renderIndex()};
 $('mSave').onclick=()=>{save();close()};
 $('mTitle').onclick=()=>{save();close();show('title')};
}
function inventoryText(){return Object.entries(s.inventory).filter(([,v])=>v>0).map(([k,v])=>k+' ×'+v).join(', ')||'Empty'}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function starterMenu(){
 open('Choose Your Starter','<p>These starter types are placeholders for the original species you are designing.</p><div class="options"><button class="btn" data-starter="Rock">⛰ Rock</button><button class="btn" data-starter="Water">💧 Water</button><button class="btn" data-starter="Electric">⚡ Electric</button></div><p class="muted">Water beats Rock · Rock beats Electric · Electric beats Water</p>');
 document.querySelectorAll('[data-starter]').forEach(b=>b.onclick=()=>{s.starter=b.dataset.starter;s.party=[critter(s.starter,5)];s.rival={Rock:'Water',Water:'Electric',Electric:'Rock'}[s.starter];save();close();say(['Your '+s.starter+' starter joins your Critter Index.','Your rival chooses '+s.rival+' — the advantageous starter type.','Time for your first friendly match!'],()=>startTrainer('tutorial'))})
}
function areaTypes(){return {route1:['Grass','Beast','Flying'],route2:['Grass','Flying','Venom'],forest:['Grass','Ghost','Beast'],route3:['Rock','Electric','Beast'],cave:['Rock','Ghost','Ice']}[s.area]||['Grass']}
function startWild(){
 if(firstAlive()<0)return blackout();
 const types=areaTypes(),type=types[Math.floor(Math.random()*types.length)];
 const l=s.area==='route1'?2+Math.floor(Math.random()*3):s.area==='route2'||s.area==='forest'?5+Math.floor(Math.random()*4):8+Math.floor(Math.random()*4);
 startBattle({kind:'wild',enemies:[critter(type,l)],name:'Wild Critter',award:0},'A wild '+type+' type placeholder appeared!')
}
function startTrainer(id){
 if(firstAlive()<0)return blackout();
 const make=(t,l)=>critter(t,l);
 let enemies,name,award,kind='trainer';
 if(id==='tutorial'){enemies=[make(s.rival,5)];name='Childhood Rival';award=0;kind='tutorial'}
 else if(id==='rival'){enemies=[make(s.rival,12),make('Beast',10),make('Flying',14)];name='Childhood Rival';award=65}
 else if(id==='leader'){enemies=[make('Grass',13),make('Grass',15),make('Grass',16),make('Grass',18)];name='Grass Gym Leader';award=180}
 else if(id.startsWith('rt')){const n=Number(id.slice(2)),up=s.defeated[id]?2:0;enemies=n===1?[make('Beast',4+up)]:n===2?[make('Flying',7+up),make('Grass',7+up)]:[make('Rock',10+up),make('Electric',11+up)];name='Route Trainer '+n;award=20+n*15}
 else {const n=Number(id.slice(1));enemies=[make('Grass',8+n),make(n===2?'Venom':'Grass',9+n)];name='Garden Trainer '+n;award=35+n*10}
 startBattle({kind,enemies,name,award,id},name+' challenges you!')
}

// Battle Phase 2: each side takes a complete team turn. Trainer doubles are
// two active Critters per side; wild, tutorial, rival, and first gym stay 1v1.
function startBattle(data,msg){
 const doubles=data.kind==='trainer'&&['rt2','rt3'].includes(data.id)&&s.party.filter(p=>p.hp>0).length>=2&&data.enemies.length>=2;
 const allySlots=s.party.map((p,i)=>p.hp>0?i:-1).filter(i=>i>=0).slice(0,doubles?2:1);
 data.enemies.forEach(p=>normalizeMoves(p));
 battle={...data,mode:doubles?2:1,allySlots,enemySlots:data.enemies.map((p,i)=>i).slice(0,doubles?2:1),
  nextEnemy:doubles?2:1,participants:[...allySlots],pending:[],acting:0,turn:1,phase:'choose',
  guards:{},focus:{},feedback:msg,impact:'',criticalSide:'',lastTarget:null};
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
  +'<div class="combatCardHead"><strong>'+(symbols[p.type]||'◇')+' '+escapeHtml(p.type)+'</strong><small>Lv '+p.level+'</small></div>'
  +'<div class="health"><div class="'+(low?'low':'')+'" style="width:'+pct+'%"></div></div>'
  +'<div class="combatCardFoot">HP '+p.hp+'/'+p.maxHp+(p.hp===0?' · Fainted':'')+'</div></div>';
}
function sceneFigure(p,side,i){
 if(!p||p.hp<=0)return '';
 return '<div class="combatFigure '+side+' '+(battle.impact===side&&battle.lastTarget===i?'hit':'')+'" aria-label="'+escapeHtml(p.type)+'">'
  +'<span class="combatAura"></span><span class="combatSymbol">'+(symbols[p.type]||'✦')+'</span>'
  +'<small>'+escapeHtml(p.type)+'</small></div>';
}
function battleHeader(){
 const ally=battle.allySlots.map((i,slot)=>hpCard(s.party[i],'ally',battle.phase==='choose'&&slot===battle.acting)).join('');
 const foe=battle.enemySlots.map(i=>hpCard(battle.enemies[i],'enemy')).join('');
 const their=battle.enemySlots.map(i=>sceneFigure(battle.enemies[i],'enemy',i)).join('');
 const ours=battle.allySlots.map(i=>sceneFigure(s.party[i],'ally',i)).join('');
 return '<div class="combatTop"><span>'+(battle.mode===2?'2v2 TRAINER BATTLE':'1v1 BATTLE')+'</span><span>TEAM TURN '+battle.turn+'</span></div>'
  +'<div class="combatRoster"><div><div class="rosterTitle">OPPONENT TEAM</div>'+foe+'</div><div><div class="rosterTitle">YOUR TEAM</div>'+ally+'</div></div>'
  +'<div class="combatArena"><div class="combatSide enemies">'+their+'</div><div class="combatSide allies">'+ours+'</div></div>';
}
function battleMessage(msg){return '<div class="combatMessage" role="status">'+escapeHtml(msg||battle.feedback||'Choose your actions.')+'</div>'}
function renderBattle(message){
 if(!battle)return;
 if(typeof message==='string')battle.feedback=message;
 const i=battle.allySlots[battle.acting],actor=s.party[i];
 const targets=activeEnemies();
 const queued=battle.pending.map(q=>{
  const p=s.party[q.actor];return (p?.name||p?.type||'Critter')+' → '+(q.kind==='move'?getMove(p,q.moveId).name:q.kind)
 }).join(' · ');
 let actions='';
 if(battle.phase==='choose'&&actor&&actor.hp>0){
  normalizeMoves(actor);
  const allMoves=actor.moves.filter(id=>validMove(id));
  const moveButtons=allMoves.map(id=>{
   const m=getMove(actor,id),remaining=actor.movePP[id]||0;
   const targetsForMove=m.target==='enemy'?targets:
    m.target==='ally'?activeAllies().filter(a=>a!==i):
    [i];
   const choices=targetsForMove.length?targetsForMove:[i];
   return choices.map(target=>{
    const who=m.target==='enemy'?battle.enemies[target]?.type:m.target==='ally'?s.party[target]?.type:'';
    return '<button class="btn combatAttack '+(m.category==='special'?'special':'')+'" data-use-move="'+escapeHtml(id)+'" data-move-target="'+target+'" '
      +(remaining===0?'disabled':'')+' title="'+escapeHtml(m.description||'')+'">'
      +escapeHtml(m.name)+(who?' → '+escapeHtml(who):'')+' <small>'+remaining+'/'+m.pp+' PP</small>'
      +'<em>'+escapeHtml(m.type)+' · '+(m.category==='status'?'Support':m.power+' power')+'</em></button>';
   }).join('');
  }).join('');
  actions='<div class="combatChoice"><b>'+escapeHtml(actor.name||actor.type)+' · Action '+(battle.acting+1)+'/'+battle.allySlots.length+'</b>'
   +(battle.mode===2?'<div class="targetHint">Choose a move and its target</div>':'')
   +'<div class="combatActions">'+moveButtons
   +'<button class="btn" id="guard">Guard</button><button class="btn" id="focus">Focus</button>'
   +'<button class="btn" id="switch">Switch</button>'
   +'<button class="btn" id="potion" '+(!itemQty('Potion')?'disabled':'')+'>Potion ('+itemQty('Potion')+')</button>'
   +'<button class="btn" id="revive" '+(!itemQty('Revive')||!s.party.some(q=>q.hp===0)?'disabled':'')+'>Revive ('+itemQty('Revive')+')</button>'
   +(battle.kind==='wild'?'<button class="btn" id="capture">Capture Beam</button><button class="btn" id="run">Run</button>':'')
   +'</div></div>';
 }else if(battle.phase==='resolve')actions='<div class="combatProcessing">Resolving team turn…</div>';
 open(battle.kind==='wild'?'Wild Encounter':battle.name,battleHeader()+battleMessage(battle.feedback)
  +(queued?'<div class="combatQueue"><b>Queued:</b> '+escapeHtml(queued)+'</div>':'')
  +actions+'<p class="muted combatNote">Each team chooses its turn. Move accuracy, PP, effects, and type strengths apply.</p>');
 $('close').hidden=true;
 if(battle.phase!=='choose')return;
 document.querySelectorAll('[data-use-move]').forEach(el=>el.onclick=()=>{
  const moveId=el.dataset.useMove,target=Number(el.dataset.moveTarget);
  if((actor.movePP[moveId]||0)<1||!validMove(moveId))return;
  queueBattleAction({kind:'move',moveId,target});
 });
 $('guard').onclick=()=>queueBattleAction({kind:'guard'});
 $('focus').onclick=()=>queueBattleAction({kind:'focus'});
 $('switch').onclick=selectPoke;
 $('potion').onclick=()=>{if(itemQty('Potion'))queueBattleAction({kind:'potion',target:i})};
 $('revive').onclick=()=>{if(itemQty('Revive')&&s.party.some(q=>q.hp===0))selectRevive()};
 if(battle.kind==='wild'){
  $('capture').onclick=()=>queueBattleAction({kind:'capture'});
  $('run').onclick=()=>queueBattleAction({kind:'run'});
 }
}
function queueBattleAction(action){
 if(!battle||battle.phase!=='choose')return;
 const actor=battle.allySlots[battle.acting];
 if(actor==null||!s.party[actor]||s.party[actor].hp<=0)return;
 if(action.kind==='move'&&(!validMove(action.moveId)||(s.party[actor].movePP?.[action.moveId]||0)<=0))return;
 battle.pending.push({...action,actor});
 battle.acting++;
 if(battle.acting<activeAllies().length){
  renderBattle(s.party[actor].type+' is ready. Choose the next Critter’s move.');
 }else resolveTeamTurn();
}
function selectPoke(){
 if(!battle||battle.phase!=='choose')return;
 const candidates=s.party.map((p,i)=>({p,i})).filter(({p,i})=>p.hp>0&&!battle.allySlots.includes(i));
 const html=candidates.map(({p,i})=>'<button class="btn" data-poke="'+i+'">'+(symbols[p.type]||'◇')+' '+p.type+' Lv'+p.level+' · HP '+p.hp+'/'+p.maxHp+'</button>').join('');
 if(!html){renderBattle('No available bench Critter to switch into.');return}
 open(battle.name,battleHeader()+battleMessage('Choose a healthy reserve Critter.')+'<div class="options">'+html+'<button class="btn" id="cancelSelection">Cancel</button></div>');
 $('close').hidden=true;
 document.querySelectorAll('[data-poke]').forEach(el=>el.onclick=()=>queueBattleAction({kind:'switch',target:Number(el.dataset.poke)}));
 $('cancelSelection').onclick=()=>renderBattle('Choose an action.');
}
function selectRevive(){
 if(!battle||battle.phase!=='choose')return;
 const html=s.party.map((p,i)=>p.hp===0?'<button class="btn" data-revive="'+i+'">'+escapeHtml(p.type)+' · Lv '+p.level+'</button>':'').join('');
 open(battle.name,battleHeader()+battleMessage('Choose a fainted Critter to revive.')+'<div class="options">'+html+'<button class="btn" id="cancelSelection">Cancel</button></div>');
 $('close').hidden=true;
 document.querySelectorAll('[data-revive]').forEach(el=>el.onclick=()=>queueBattleAction({kind:'revive',target:Number(el.dataset.revive)}));
 $('cancelSelection').onclick=()=>renderBattle('Choose an action.');
}
function defeatFoe(i,log){
 const enemy=battle.enemies[i];if(!enemy)return;
 const recipients=[...new Set(battle.participants)].filter(index=>s.party[index]);
 const gain=Math.floor(enemy.level*13/Math.max(1,recipients.length));
 recipients.forEach(index=>awardExperience(s.party[index],gain));
 log.push(enemy.type+' fainted! Your participating Critters gain '+gain+' XP each.');
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
 if(!battle||!actor||actor.hp<=0)return;
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
 if(moveId==='opening-flick'&&!actor.moves.includes(moveId))actor.moves=[moveId,...actor.moves].slice(0,4);
 if((actor.movePP[moveId]||0)<=0){
  log.push((actor.name||actor.type)+' has no remaining moves and uses a basic struggle!');
 }else actor.movePP[moveId]--;
 let targetSide=move.target==='enemy'?enemySide(side):side;
 let target=getCombatant(targetSide,targetIndex);
 if(move.target==='enemy'){
  if(!target||target.hp<=0){
   const available=targetSide==='enemy'?activeEnemies():activeAllies();
   targetIndex=available[0];target=getCombatant(targetSide,targetIndex);
  }
 }else if(move.target==='self'||move.target==='field'||move.target==='ally_team'){
  targetIndex=actorIndex;target=actor;
 }else if(move.target==='ally'&&(!target||target.hp<=0)){targetIndex=actorIndex;target=actor}
 if(!target||target.hp<=0)return;
 const name=actor.name||actor.type;
 // Conditions can disrupt a turn without consuming PP.
 const interruption={jolt:.20,chill:.17,stagger:.18,confuse:.22,disorient:.15,entangle:.08}[actor.status]||0;
 if(interruption&&Math.random()<interruption){log.push(name+' cannot act because of '+actor.status+'!');return}
 log.push(name+' used '+move.name+'.');
 const hitChance=Math.min(100,Math.max(5,(move.accuracy??100)*
  statFactor(side,actorIndex,'accuracy')/statFactor(targetSide,targetIndex,'evasion')));
 if(Math.random()*100>=hitChance){
  log.push('It missed!');return;
 }
 if(move.category!=='status'&&move.power>0){
  const factor=move.type==='Typeless'?1:mult(move.type,target.type);
  const offense=statFactor(side,actorIndex,move.category==='physical'?'attack':'special_attack');
  const defense=statFactor(targetSide,targetIndex,'defense');
  const focus=side==='ally'?(battle.focus?.[actorIndex]||0):0;
  const terrain=battle.terrain?.type===move.type?1.12:1;
  const reduced=targetSide==='ally'?!!battle.guards?.[targetIndex]:!!battle.enemyGuards?.[targetIndex];
  const ailmentAttack=['dread','intimidate'].includes(actor.status)?.85:1;
  const ailmentDefense=['drench','fracture'].includes(target.status)?1.12:1;
  const base=Math.max(1,move.power/11+(actor.level-target.level)*.6);
  const mod=side==='ally'?activeModifier('ally'):activeModifier('enemy');
  const dmg=Math.max(1,Math.floor(base*factor*offense/defense*mod*(1+focus)*terrain*ailmentAttack*ailmentDefense*(reduced?.5:1)));
  target.hp=Math.max(0,target.hp-dmg);
  if(side==='ally')battle.focus[actorIndex]=0;
  battle.impact=targetSide;battle.lastTarget=targetIndex;
  log.push(dmg+' damage.'+(factor>1?' Super effective!':factor<1?' Not very effective.':''));
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
  case 'potion':if(itemQty('Potion')){s.inventory.Potion--;const healed=Math.min(20,actor.maxHp-actor.hp);actor.hp+=healed;log.push(actor.type+' recovered '+healed+' HP.')}return;
  case 'revive':if(itemQty('Revive')&&s.party[action.target]?.hp===0){s.inventory.Revive--;const q=s.party[action.target];q.hp=Math.max(1,Math.floor(q.maxHp/2));log.push(q.type+' was revived with '+q.hp+' HP.')}return;
  case 'capture':if(battle.kind==='wild'){
    const foe=battle.enemies[0],chance=0.14+0.74*(1-foe.hp/foe.maxHp);
    if(Math.random()<chance){
     const caught={...foe,hp:Math.max(1,foe.hp),xp:0};
     if(s.party.length<8)s.party.push(caught);else s.storage.push(caught);
     s.captureCount++;s.captureLog=s.captureLog||[];s.captureLog.push({type:foe.type,level:foe.level,area:s.area,storage:s.party.includes(caught)?'Party':'Home'});s.captureLog=s.captureLog.slice(-80);
     endBattle(true,'Capture successful! '+foe.type+' joined '+(s.party.includes(caught)?'your party.':'home storage.'),false);
    }else log.push('The capture beam missed! Lower the target’s HP for better odds.');
   }return;
  case 'run':if(battle.kind==='wild'){
   if(Math.random()<0.82)endBattle(true,'You escaped safely.',false);
   else log.push('Could not escape!');
  }return;
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
  if(s.party[i].hp>0&&!battle.allySlots.includes(i)){
   battle.allySlots.push(i);claimParticipant(i);log.push(s.party[i].type+' joins your active team.');
  }
 }
}
function resolveTeamTurn(){
 if(!battle)return;
 const log=[];
 battle.phase='resolve';battle.impact='';battle.lastTarget=null;
 const actions=battle.pending.slice();battle.pending=[];
 // Team order: one player action per deployed Critter, followed by all living enemies.
 // Resolve priority within a team without changing the approved team-turn order.
 actions.sort((a,b)=>{
  const ma=a.kind==='move'?validMove(a.moveId):null,mb=b.kind==='move'?validMove(b.moveId):null;
  const pa=ma?.priority||0,pb=mb?.priority||0;
  return pb-pa||(s.party[b.actor]?.level||0)*statFactor('ally',b.actor,'speed')
     -(s.party[a.actor]?.level||0)*statFactor('ally',a.actor,'speed');
 });
 for(const action of actions){
  if(!battle)return;
  performPlayerAction(action,log);
 }
 if(!battle)return; // capture / escape can end the battle mid-phase
 const livingEnemy=battle.enemies.some(p=>p.hp>0);
 if(!livingEnemy)return endBattle(true,log.join(' ')+' Victory!',true);
 // The opposing team uses exactly the same move executor and PP rules.
 for(const enemyIndex of activeEnemies().sort((a,b)=>
  (battle.enemies[b]?.level||0)*statFactor('enemy',b,'speed')
  -(battle.enemies[a]?.level||0)*statFactor('enemy',a,'speed'))){
  if(!battle)return;
  const foe=battle.enemies[enemyIndex],allies=activeAllies();
  if(!allies.length)break;
  normalizeMoves(foe);
  const legal=foe.moves.filter(id=>(foe.movePP?.[id]||0)>0&&validMove(id));
  const pool=legal.filter(id=>getMove(foe,id).target==='enemy');
  const choice=(pool.length?pool:legal)[Math.floor(Math.random()*(pool.length?pool.length:legal.length))];
  const move=choice?getMove(foe,choice):moveFallbacks[0];
  const target=allies.reduce((best,i)=>s.party[i].hp<s.party[best].hp?i:best,allies[0]);
  performMove(foe,move,'enemy',enemyIndex,move.target==='enemy'?target:enemyIndex,log);
 }
 endOfTeamTurn(log);
 battle.guards={};battle.enemyGuards={};
 if(!battle.enemies.some(p=>p.hp>0))return endBattle(true,log.join(' ')+' Victory!',true);
 if(!s.party.some(p=>p.hp>0))return blackout();
 battle.enemySlots=battle.enemySlots.filter(i=>battle.enemies[i]?.hp>0);
 refillEnemyTeam();refillAllyTeam(log);
 battle.turn++;battle.acting=0;battle.phase='choose';
 save();
 renderBattle(log.join(' '));
}
function capture(){if(battle&&battle.kind==='wild')queueBattleAction({kind:'capture'})}
function awardExperience(p,xp){if(!p)return;p.xp=(p.xp||0)+xp;while(p.xp>=p.level*12){p.xp-=p.level*12;p.level++;p.maxHp+=4;p.hp=Math.min(p.maxHp,p.hp+4);gainLevelMoves(p)}}
function endBattle(won,message,defeated){
 const b=battle;battle=null;$('close').hidden=false;
 if(b.kind==='tutorial'){s.introComplete=true;s.party.forEach(p=>p.hp=p.maxHp)}
 else if(defeated&&won){s.money+=b.award||0;if(b.id&&b.id!=='tutorial')s.defeated[b.id]=true;
  if(b.id==='leader'&&!s.badges){s.badges=1;s.cut=true;message+=' You earned your first badge! The Critter Index vegetation cutter is now unlocked.'}
 }
 else if(!won){s.money=Math.max(0,s.money-Math.floor(s.money*0.1));s.party.forEach(p=>p.hp=p.maxHp);s.area='town';s.x=17;s.y=15;build()}
 save();open(won?'Battle Complete':'Defeated','<p>'+message+'</p>'+(b.kind==='tutorial'?'<p>The researcher heals both starters. No money penalty applies.</p>':'')+'<button class="btn primary" id="battleDone">Continue</button>');
 $('battleDone').onclick=()=>{close();if(b.kind==='tutorial')say(['Researcher: Excellent!','Follow the eastern road to Route 1. Discover new Critters with the Index beam.']);if(b.id==='leader')build()}
}
function blackout(){
 const wasTutorial=battle?.kind==='tutorial';battle=null;$('close').hidden=false;
 if(!wasTutorial)s.money=Math.max(0,s.money-Math.floor(s.money*0.1));s.party.forEach(p=>p.hp=p.maxHp);
 if(wasTutorial){s.introComplete=true;s.area='lab';s.x=17;s.y=14}else{s.area=s.lastCenter||'village';s.x=s.area==='garden'?14:17;s.y=s.area==='garden'?14:s.area==='town'?15:16}build();save();
 open('Blackout','<p>'+(wasTutorial?'Your friendly tutorial match ended. The researcher healed your starter without a penalty.':'Your whole party fainted. You lost a little money and recovered at your last Critter Center.')+'</p><button class="btn primary" id="blackoutDone">Continue</button>');$('blackoutDone').onclick=close
}
function center(){
 s.lastCenter=s.area;s.party.forEach(p=>{p.hp=p.maxHp;p.status='';refillMovePP(p)});save();
 open('Critter Center','<p>Your Critters were fully healed! The technician can also manage party storage and install modules.</p><div class="options"><button class="btn" id="manageParty">Manage Party / Home Storage</button><button class="btn" id="manageModules">Install Critter Index Modules</button><button class="btn" id="centerDone">Leave</button></div>');
 $('manageParty').onclick=manageParty;$('manageModules').onclick=manageModules;$('centerDone').onclick=close
}
function manageParty(){
 const list=s.party.map((p,i)=>'<div><b>'+i+': '+p.type+' Lv'+p.level+'</b> HP '+p.hp+'/'+p.maxHp+' <button class="btn" data-store="'+i+'" '+(s.party.length<=1?'disabled':'')+'>Send Home</button></div>').join('');
 const stored=s.storage.map((p,i)=>'<div>'+p.type+' Lv'+p.level+' <button class="btn" data-retrieve="'+i+'" '+(s.party.length>=8?'disabled':'')+'>Add to Party</button></div>').join('')||'<p class="muted">No Critters at home.</p>';
 open('Critter Center · Party Maintenance','<p>Active party ('+s.party.length+'/8)</p><div class="options">'+list+'</div><h3>Home Storage</h3><div class="options">'+stored+'</div><button class="btn" id="partyBack">Back</button>');
 document.querySelectorAll('[data-store]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.store);if(s.party.length<=1)return;s.storage.push(s.party.splice(i,1)[0]);save();manageParty()});
 document.querySelectorAll('[data-retrieve]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.retrieve);if(s.party.length>=8)return;s.party.push(s.storage.splice(i,1)[0]);save();manageParty()});$('partyBack').onclick=center
}
function manageModules(){
 const names=['Power Coil','Guard Plate','Weakening Field'];let list='<p>All basic modules work automatically. Up to four modules may be installed.</p>';
 names.forEach(n=>{const owned=s.modules.filter(m=>m===n).length,installed=s.installed.filter(m=>m===n).length;list+='<div><b>'+n+'</b> · owned '+owned+', installed '+installed+' <button class="btn" data-install="'+n+'" '+(owned<=installed||s.installed.length>=4?'disabled':'')+'>Install</button></div>'});
 list+='<h3>Installed ('+s.installed.length+'/4)</h3>'+s.installed.map((n,i)=>'<div>'+n+' <button class="btn" data-remove="'+i+'">Remove</button></div>').join('');
 open('Critter Index · Module Maintenance','<div class="options">'+list+'</div><button class="btn" id="modulesBack">Back</button>');
 document.querySelectorAll('[data-install]').forEach(b=>b.onclick=()=>{const n=b.dataset.install;if(s.installed.length<4&&s.modules.filter(m=>m===n).length>s.installed.filter(m=>m===n).length){s.installed.push(n);save();manageModules()}});
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{s.installed.splice(Number(b.dataset.remove),1);save();manageModules()});$('modulesBack').onclick=center
}
function shop(){
 const goods=[['Potion',30],['Revive',90],['Power Coil',120],['Guard Plate',120],['Weakening Field',150]];
 open('Village Shop','<p>Money: '+s.money+' ◇</p><div class="options">'+goods.map(([name,price])=>'<button class="btn" data-buy="'+name+'" '+(s.money<price?'disabled':'')+'>'+name+' — '+price+' ◇</button>').join('')+'</div><p class="muted">Basic modules can be bought now. Install them at a Critter Center.</p>');
 document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const name=b.dataset.buy,price=goods.find(g=>g[0]===name)[1];if(s.money<price)return;s.money-=price;if(['Potion','Revive'].includes(name))s.inventory[name]=(s.inventory[name]||0)+1;else s.modules.push(name);save();shop()})
}
function preview(id,g){const im=sprites[g],c=$(id),p=c.getContext('2d');p.imageSmoothingEnabled=false;function draw(){if(!im.naturalWidth)return;const m=spriteMetrics(g)?.[0]?.[0];if(!m)return;p.clearRect(0,0,c.width,c.height);const k=Math.min(c.width/(m.sw+10),c.height/(m.sh+8));p.drawImage(im,m.sx,m.sy,m.sw,m.sh,(c.width-m.sw*k)/2,c.height-m.sh*k-4,m.sw*k,m.sh*k)}im.addEventListener('load',draw);draw()}
preview('malePreview','male');preview('femalePreview','female');
$('new').onclick=()=>show('selection');
$('continue').onclick=()=>{s=read();if(!s)return;migrate();build();show('game')};
$('begin').onclick=()=>{const name=$('playerName').value.trim().replace(/\s+/g,' ');if(!name){$('error').textContent='Please enter a name.';return}
 s={name,gender:document.querySelector('.character.selected').dataset.gender,area:'village',x:17,y:16,face:'down',steps:0,starter:null,party:[],storage:[],inventory:{Potion:4,Revive:1},modules:[],installed:[],badges:0,defeated:{},puzzles:{},money:250,version:4};
 save();build();show('game');say(['Welcome, '+name+'!','Visit the research laboratory in the northeast of the village to receive your Critter Index and starter.'])};
document.querySelectorAll('.character').forEach(b=>b.onclick=()=>{document.querySelectorAll('.character').forEach(c=>c.classList.remove('selected'));b.classList.add('selected')});
$('index2').onclick=index;$('save').onclick=()=>{save();say(['Your adventure has been saved.'])};$('talk').onclick=interact;$('dialog').onclick=advance;$('close').onclick=close;
window.addEventListener('keydown',e=>{if(document.activeElement.tagName==='INPUT')return;const d={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'}[e.code];if(d){e.preventDefault();held[d]=true;if(Date.now()-last>120){move(d);last=Date.now()}}else if(['KeyE','Enter','Space'].includes(e.code)&&!modal){e.preventDefault();interact()}else if(e.code==='KeyI'&&!modal)index();else if(e.code==='Escape'&&modal&&!battle)close()});
window.addEventListener('keyup',e=>{const d={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'}[e.code];if(d)held[d]=false});// Mobile joystick uses a pointer captured by the joystick base; keyboard controls stay unchanged.
const stick=$('joystick'),thumb=$('joystickThumb');
let stickPointer=null,stickDirection=null,stickActive=false;
function positionStick(dx=0,dy=0){
 thumb.style.transform='translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px)';
}
function endStick(pointerId){
 if(pointerId!==undefined&&stickPointer!==pointerId)return;
 stickPointer=null;stickDirection=null;stickActive=false;
 stick.classList.remove('active');positionStick();
}
function releaseMovement(){held={};endStick()}
function aimStick(e){
 if(stickPointer!==e.pointerId)return;
 const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 const dx=e.clientX-cx,dy=e.clientY-cy;
 const distance=Math.hypot(dx,dy),range=Math.min(r.width,r.height)*0.29;
 const length=distance?Math.min(1,range/distance):0;
 positionStick(dx*length,dy*length);
 // Deliberate neutral deadzone avoids accidental steps when the stick is released.
 if(distance<Math.min(r.width,r.height)*0.15){stickDirection=null;return}
 stickDirection=Math.abs(dx)>=Math.abs(dy)?(dx>=0?'right':'left'):(dy>=0?'down':'up');
}
stick.addEventListener('pointerdown',e=>{
 if(screen!=='game'||modal||stickPointer!==null)return;
 if(e.pointerType==='mouse'&&e.button!==0)return;
 e.preventDefault();
 stickPointer=e.pointerId;stickActive=true;stick.classList.add('active');
 if(stick.setPointerCapture)try{stick.setPointerCapture(e.pointerId)}catch(err){}
 aimStick(e);
});
stick.addEventListener('pointermove',e=>{if(stickPointer===e.pointerId){e.preventDefault();aimStick(e)}});
for(const event of ['pointerup','pointercancel','lostpointercapture']){
 stick.addEventListener(event,e=>{if(stickPointer===e.pointerId){e.preventDefault();endStick(e.pointerId)}});
}
stick.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('pointerup',e=>endStick(e.pointerId));
window.addEventListener('pointercancel',e=>endStick(e.pointerId));
window.addEventListener('blur',releaseMovement);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseMovement()});
window.addEventListener('pagehide',releaseMovement);

document.addEventListener('touchmove',e=>{
 if(screen==='game'&&!e.target.closest('#shade'))e.preventDefault();
},{passive:false});
document.addEventListener('gesturestart',e=>{if(screen==='game')e.preventDefault()},{passive:false});
window.addEventListener('resize',()=>{if(screen==='game')resizeGameCanvas()});
if(read()?.name)$('continue').hidden=false;
function loop(){if(screen==='game'){finishDoorAnimation();if(stickActive&&stickDirection&&!modal&&!$('dialog').classList.contains('show')&&Date.now()-last>=120){move(stickDirection);last=Date.now()}else if(!stickActive){for(const d of ['up','down','left','right'])if(held[d]&&Date.now()-last>145){move(d);last=Date.now();break}}draw()}requestAnimationFrame(loop)}
loadCritterMoveData();
requestAnimationFrame(loop);
})();
