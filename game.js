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

function solidAt(x,y){
 if(x<0||y<0||x>=W||y>=H)return true;
 if(s.area==='village'&&villageObstacles.has(key(x,y)))return true;
 if(isInterior(s.area)&&interiorBlocked.has(key(x,y)))return true;
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
function critter(type,level=5){const hp=20+level*4;return {type,level,hp,maxHp:hp,xp:0,status:'',moves:['Strike',type+' Pulse','Guard','Focus']}}
function migrate(){
 if(!s)return;
 s.area=s.area||'village';if(!['village','lab','home','neighbor','route1','town','route2','forest','route3','cave','garden','gym'].includes(s.area))s.area='village';
 s.x=Number.isFinite(s.x)?s.x:17;s.y=Number.isFinite(s.y)?s.y:16;s.face=s.face||'down';
 if(!Array.isArray(s.party))s.party=s.starter?[critter(s.starter,5)]:[];
 s.party=s.party.map(p=>({...critter(p.type||'Rock',p.level||5),...p,maxHp:p.maxHp||36,hp:typeof p.hp==='number'?p.hp:36})).slice(0,8);
 if(!Array.isArray(s.storage))s.storage=[];s.storage=s.storage.map(p=>({...critter(p.type||'Grass',p.level||3),...p}));
 s.captureCount=s.captureCount||0;s.money=Number.isFinite(s.money)?s.money:250;
 s.inventory=s.inventory||{Potion:4,Revive:1};s.modules=Array.isArray(s.modules)?s.modules:[];s.installed=Array.isArray(s.installed)?s.installed:[];
 s.defeated=s.defeated||{};s.puzzles=s.puzzles||{};s.badges=s.badges||0;s.cut=s.badges>=1;
 s.rivalPassed=!!s.rivalPassed;s.introComplete=!!s.introComplete;
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
 migrate();tiles=Array.from({length:H},()=>Array(W).fill(['lab','gym','home','neighbor'].includes(s.area)?T.wood:T.grass));npcs=[];villageObstacles=new Set();interiorObjects=[];interiorBlocked=new Set();
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
 borders();roads();
 for(let y=11;y<=15;y++){put(0,y,y>=12&&y<=14?T.path:T.grass);put(1,y,y>=12&&y<=14?T.path:T.grass)}rect(11,7,2,6,T.path);rect(22,14,2,7,T.path);
 for(let y=2;y<12;y++)for(let x=3;x<31;x++)if(x!==11&&x!==12&&(x*7+y*11)%5!==0)put(x,y,(x+y)%4===0?T.rice:T.tall);
 for(let y=16;y<24;y++)for(let x=3;x<31;x++)if(x!==22&&x!==23&&(x*9+y*5)%6!==0)put(x,y,(x+y)%3===0?T.rice:T.tall);
 npc(9,11,['Route 1 has wild Critters hiding in the rice fields.','Use the Index beam when their HP is low.']);npc(20,13,['Want to test your team against mine?'],'routetrainer','rt1');
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
function resizeGameCanvas(){
 const width=Math.max(1,Math.round(C.clientWidth||C.getBoundingClientRect().width));
 const height=Math.max(1,Math.round(C.clientHeight||C.getBoundingClientRect().height));
 if(C.width!==width||C.height!==height){C.width=width;C.height=height;ctx.imageSmoothingEnabled=false}
}
function draw(){
 if(screen!=='game'||!s)return;
 resizeGameCanvas();
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
 ctx.fillStyle='#1c3835dc';ctx.fillRect(5,5,330,28);ctx.fillStyle='#fff1ca';ctx.font='bold 13px system-ui';ctx.fillText(s.name+' · '+(s.starter||'Visit lab')+' · '+s.money+' ◇ · '+s.badges+' Badge',11,23)
}
function region(area,x,y,textLine){doorTransition=null;s.area=area;s.x=x;s.y=y;build();save();if(textLine)say([textLine])}
function move(d){
 if(screen!=='game'||modal||doorTransition||$('dialog').classList.contains('show'))return;
 s.face=d;const v=dirs[d],x=s.x+v[0],y=s.y+v[1];
 if(s.area==='village'&&d==='right'&&x>=W-2&&tiles[y]?.[W-1]!==T.tree&&!solidAt(W-2,y)){if(!s.introComplete)return say(['Complete the laboratory tutorial before exploring Route 1.']);return region('route1',2,y,'Route 1 — Rice Fields. Wild Critters hide in tall grass.')}
 if(s.area==='route1'&&d==='left'&&x<=1&&tiles[y]?.[0]!==T.tree&&!solidAt(1,y))return region('village',31,y);
 if(s.area==='route1'&&d==='right'&&x>=32&&[13,14].includes(y))return region('town',2,y,'You arrive at the first small town. Heal and shop here!');
 if(s.area==='town'&&d==='left'&&x<=1&&[13,14].includes(y))return region('route1',31,y);
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
function index(){
 if(screen!=='game'||battle)return;
 let slots='';s.party.forEach((p,i)=>{slots+='<div class="slot">'+(i+1)+' o’clock<br>'+ (symbols[p.type]||'◇')+'<br>'+p.type+' Lv'+p.level+'<br>HP '+p.hp+'/'+p.maxHp+'</div>'});
 for(let i=s.party.length;i<8;i++)slots+='<div class="slot">'+(i+1)+' o’clock<br>◇<br>Empty</div>';
 for(let i=0;i<4;i++)slots+='<div class="slot module">'+(i+9)+' o’clock<br>✧<br>'+(s.installed[i]||'Empty')+'</div>';
 open('Critter Index','<b>'+escapeHtml(s.name)+'</b> · Party '+s.party.length+'/8 · Home storage '+s.storage.length+'<div class="slots">'+slots+'</div><p>Money: '+s.money+' · Badges: '+s.badges+' · Captures: '+s.captureCount+'</p><p>Inventory: '+inventoryText()+'</p><p class="muted">Party changes and module installation happen at Critter Centers.</p><div class="options"><button class="btn" id="mSave">Save Adventure</button><button class="btn" id="mTitle">Return to Title</button></div>');
 $('mSave').onclick=()=>{save();close()};$('mTitle').onclick=()=>{save();close();show('title')}
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
function startBattle(data,msg){battle={...data,enemyIndex:0,allyIndex:firstAlive(),participants:[firstAlive()],defending:false};renderBattle(msg)}
function itemQty(name){return s.inventory[name]||0}
function selectPoke(){const options=s.party.map((p,i)=>'<button class="btn" data-poke="'+i+'" '+(p.hp<=0?'disabled':'')+'>'+symbols[p.type]+' '+p.type+' Lv'+p.level+' HP '+p.hp+'/'+p.maxHp+'</button>').join('');renderBattle('Switch your active Critter:<div class="options">'+options+'</div>');document.querySelectorAll('[data-poke]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.poke);if(!s.party[i]||s.party[i].hp<=0)return;battle.allyIndex=i;if(!battle.participants.includes(i))battle.participants.push(i);enemyTurn('You switched Critters!')})}
function renderBattle(message){
 if(!battle)return;const foe=battle.enemies[battle.enemyIndex],p=s.party[battle.allyIndex];if(!p)return blackout();
 const actions='<div class="options" style="grid-template-columns:1fr 1fr"><button class="btn" id="strike">Strike</button><button class="btn" id="pulse">'+p.type+' Pulse</button><button class="btn" id="guard">Guard</button><button class="btn" id="focus">Focus</button><button class="btn" id="switch">Switch</button><button class="btn" id="potion" '+(!itemQty('Potion')?'disabled':'')+'>Potion ('+itemQty('Potion')+')</button><button class="btn" id="revive" '+(!itemQty('Revive')||!s.party.some(q=>q.hp===0)?'disabled':'')+'>Revive ('+itemQty('Revive')+')</button>'+ (battle.kind==='wild'?'<button class="btn" id="capture">Capture Beam</button><button class="btn" id="run">Run</button>':'')+'</div>';
 open(battle.kind==='wild'?'Wild Encounter':battle.name,
 '<div class="battleNames"><div><b>'+escapeHtml(foe.type)+' · Lv '+foe.level+'</b><div class="health"><div style="width:'+Math.max(0,100*foe.hp/foe.maxHp)+'%"></div></div>HP '+foe.hp+'/'+foe.maxHp+'</div><div><b>'+escapeHtml(p.type)+' · Lv '+p.level+'</b><div class="health"><div style="width:'+Math.max(0,100*p.hp/p.maxHp)+'%"></div></div>HP '+p.hp+'/'+p.maxHp+'</div></div><div class="battleScene"><span>'+(symbols[foe.type]||'◇')+'</span><span>'+(symbols[p.type]||'✦')+'</span></div><p>'+message+'</p>'+actions+'<p class="muted" style="font-size:12px">Type advantages and participant-only experience are active. Species art, abilities and final balancing await the original roster.</p>');
 $('close').hidden=true;
 $('strike').onclick=()=>playerMove('Strike');$('pulse').onclick=()=>playerMove('Pulse');$('guard').onclick=()=>{battle.defending=true;enemyTurn('Your Critter braced for the next attack.')};$('focus').onclick=()=>{battle.focus=(battle.focus||0)+0.2;enemyTurn('Your Critter focused its strength.')};
 $('switch').onclick=selectPoke;$('revive').onclick=()=>{const down=s.party.find(q=>q.hp===0);if(!down||!itemQty('Revive'))return;s.inventory.Revive--;down.hp=Math.max(1,Math.floor(down.maxHp/2));enemyTurn('Revive restored '+down.type+' to half HP.')};$('potion').onclick=()=>{if(!itemQty('Potion'))return;s.inventory.Potion--;p.hp=Math.min(p.maxHp,p.hp+20);enemyTurn('You used a Potion and restored 20 HP.')};
 if(battle.kind==='wild'){$('capture').onclick=capture;$('run').onclick=()=>Math.random()<0.82?endBattle(true,'You escaped safely.',false):enemyTurn('You could not escape!')}
}
function playerMove(move){
 const p=s.party[battle.allyIndex],foe=battle.enemies[battle.enemyIndex];
 const typed=move==='Pulse',factor=typed?mult(p.type,foe.type):1;
 const dmg=Math.max(1,Math.floor((typed?7:6)+(p.level-foe.level)*0.6)*factor*activeModifier('ally')*(1+(battle.focus||0)));
 foe.hp=Math.max(0,foe.hp-dmg);battle.focus=0;
 const detail=(factor>1?' Super effective!':factor<1?' Not very effective.':'');
 if(foe.hp<=0){const message='Your '+p.type+' Critter dealt '+dmg+' damage.'+detail;return foeDefeated(message)}
 enemyTurn('Your '+p.type+' Critter dealt '+dmg+' damage.'+detail)
}
function foeDefeated(msg){
 const enemy=battle.enemies[battle.enemyIndex];
 const participants=[...new Set(battle.participants)].filter(i=>s.party[i]);const gain=Math.floor((enemy.level*13)/Math.max(1,participants.length));
 participants.forEach(i=>awardExperience(s.party[i],gain));
 battle.enemyIndex++;
 if(battle.enemyIndex>=battle.enemies.length)return endBattle(true,msg+' Victory!',true);
 battle.defending=false;renderBattle(msg+' Experience gained by participants. '+battle.name+' sends the next Critter!')
}
function enemyTurn(msg){
 const foe=battle.enemies[battle.enemyIndex];let p=s.party[battle.allyIndex];if(!foe||!p)return;
 const usedType=Math.random()<0.7;const factor=usedType?mult(foe.type,p.type):1;
 const dmg=Math.max(1,Math.floor((usedType?5:4)+(foe.level-p.level)*0.5)*factor*activeModifier('enemy')*(battle.defending?0.5:1));
 battle.defending=false;p.hp=Math.max(0,p.hp-dmg);save();
 if(p.hp<=0){const alive=firstAlive();if(alive<0)return blackout();
 battle.allyIndex=alive;if(!battle.participants.includes(alive))battle.participants.push(alive);p=s.party[alive];return renderBattle(msg+' The opponent dealt '+dmg+' damage. Your Critter fainted! '+p.type+' enters the battle.')}
 renderBattle(msg+' The opponent struck for '+dmg+' damage.'+(factor>1?' Super effective!':factor<1?' Not very effective.':''))
}
function capture(){
 if(!battle||battle.kind!=='wild')return;
 const foe=battle.enemies[0],chance=0.14+0.74*(1-foe.hp/foe.maxHp);
 if(Math.random()<chance){
  const caught={...foe,hp:Math.max(1,foe.hp),xp:0};if(s.party.length<8)s.party.push(caught);else s.storage.push(caught);
  s.captureCount++;return endBattle(true,'Capture successful! '+foe.type+' joined '+(s.party.includes(caught)?'your party.':'home storage.'),false)
 }
 enemyTurn('The Critter Index beam missed the capture! Lower the target’s HP for better odds.')
}
function awardExperience(p,xp){if(!p)return;p.xp=(p.xp||0)+xp;while(p.xp>=p.level*12){p.xp-=p.level*12;p.level++;p.maxHp+=4;p.hp=Math.min(p.maxHp,p.hp+4)}}
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
 s.lastCenter=s.area;s.party.forEach(p=>{p.hp=p.maxHp;p.status=''});save();
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
requestAnimationFrame(loop);
})();
