(()=>{
'use strict';
const $=id=>document.getElementById(id),C=$('world'),ctx=C.getContext('2d');ctx.imageSmoothingEnabled=false;
const S=32,W=34,H=26;
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
 if(!treeArtReady())return;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if(tiles[y]?.[x]!==T.tree)continue;
  const type=treeVariant(x,y),img=treeArt[type];
  const rootX=x*S+S*.5-ox,rootY=(y+1)*S-oy;
  const dense=s.area==='forest'||s.area==='route2';
  const width=dense?(type===1?48:55):(type===1?63:74);
  const height=width*(type===1?1.34:type===2?1.07:1.13);
  if(rootX+width/2<0||rootX-width/2>w||rootY-height>h||rootY<0)continue;
  // Shadow sits under the fixed solid tile; only the art moves in the breeze.
  ctx.fillStyle='rgba(20,54,32,.27)';
  ctx.beginPath();ctx.ellipse(rootX,rootY-5,width*.28,6,0,0,Math.PI*2);ctx.fill();
  const bend=Math.sin(now*.00086-x*.43-y*.22)*.012;
  ctx.save();ctx.translate(rootX,rootY-4);ctx.rotate(bend);
  ctx.drawImage(img,-width/2,-height,width,height);ctx.restore();
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
// Phase 15: optional walk-over landmarks; these never block map routes.
const EXPLORATION_SITES=[
 {id:'exp-bamboo',area:'route2',x:11,y:7,title:'Bamboo Wayfinder',text:'A ranger marked a shortcut through the bamboo.',reward:'Potion',quantity:1},
 {id:'exp-forest',area:'forest',x:17,y:9,title:'Hidden Forest Shrine',text:'A shrine glows beneath ancient trees.',reward:'Revive',quantity:1},
 {id:'exp-foothills',area:'route3',x:20,y:7,title:'Mountain Lookout',text:'The lookout reveals a beautiful valley.',credits:85},
 {id:'exp-cave',area:'cave',x:17,y:19,title:'Crystal Alcove',text:'Shimmering crystals hide emergency supplies.',reward:'Revive',quantity:1},
 {id:'exp-garden',area:'garden',x:16,y:13,title:'Garden Memorial',text:'A stone honors travelers who protect Critters.',credits:100}
];
function explorationSiteAt(area,x,y){return EXPLORATION_SITES.find(o=>o.area===area&&o.x===x&&o.y===y)}
function discoverExplorationSite(o){
 if(!o||s.discoveries?.[o.id])return false;
 s.discoveries=s.discoveries||{};s.discoveries[o.id]=true;
 const messages=[o.title+'.',o.text];
 if(o.reward){s.inventory[o.reward]=(s.inventory[o.reward]||0)+(o.quantity||1);messages.push('Found '+o.reward+' ×'+(o.quantity||1)+'!')}
 if(o.credits){s.money+=o.credits;messages.push('Found '+o.credits+' credits!')}
 save();say(messages);return true;
}
function drawExplorationSites(ox,oy){
 for(const o of EXPLORATION_SITES){
  if(o.area!==s.area||s.discoveries?.[o.id])continue;
  const x=o.x*S+16-ox,y=o.y*S+16-oy;
  ctx.fillStyle='#12372a';ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ffe49a';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#fff1a0';ctx.font='bold 17px system-ui';ctx.textAlign='center';
  ctx.fillText('✦',x,y+6);ctx.textAlign='left';
 }
}
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
function save(){if(s){s.version=4;localStorage.setItem('critters-v1',JSON.stringify(s));$('continue').hidden=false}}
function show(page){releaseMovement();document.querySelectorAll('.screen').forEach(p=>p.classList.toggle('show',p.id===page));screen=page;if(page==='game'){snapVisual();resizeGameCanvas()}}

// Editable Critter moves and species: authored in data/moves.json and data/critters.json.
// Missing/retired IDs fall back to safe basic moves instead of breaking old saves.
const PARTY_LIMIT=8;
// Critter IDs are the authoritative Index numbers, not a separate display field.
const STARTER_SPECIES_IDS={Water:'cr-001-starter-water-1',Rock:'cr-004-starter-rock-1',Electric:'cr-007-starter-electric-1'};
const starterSpeciesId=type=>STARTER_SPECIES_IDS[type]||type;
const critterIndexNumber=species=>{const match=/^cr-(\d{3})-/.exec(species?.speciesId||'');return match?Number(match[1]):9999};
function migrateSpeciesIds(){
 if(!s||!speciesRegistry.size)return;
 const alias=new Map();
 for(const sp of speciesRegistry.values())if(sp.legacySpeciesId&&sp.legacySpeciesId!==sp.speciesId)alias.set(sp.legacySpeciesId,sp.speciesId);
 const translate=id=>alias.get(id)||id;
 const moveRecord=p=>{
  if(!p||typeof p!=='object')return;
  if(p.speciesId)p.speciesId=translate(p.speciesId);
  for(const e of p.evolutionHistory||[]){if(e.from)e.from=translate(e.from);if(e.to)e.to=translate(e.to)}
 };
 for(const p of [...(s.party||[]),...(s.storage||[])])moveRecord(p);
 // Never guess a legacy starter from party position, type, or level.
 // Same-type wild catches may be in any party slot or Home storage.
 // Only explicit provenance written when the starter was chosen is trustworthy.
 for(const p of [...(s.party||[]),...(s.storage||[])])
  if(!p.speciesId&&p.starterOrigin===true&&s.starter&&p.type===s.starter)
   p.speciesId=starterSpeciesId(s.starter);
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
 const learned=[];
 for(const event of options){
  p.moves=Array.isArray(p.moves)?p.moves:[];
  p.moves=[...p.moves.filter(id=>id!==event.moveId),event.moveId].slice(-4);
  p.movePP=p.movePP||{};p.movePP[event.moveId]=validMove(event.moveId).pp;
  learned.push(validMove(event.moveId).name);
 }
 if(!spec)normalizeMoves(p);
 return learned;
}
function getMove(p,id){
 const move=validMove(id);
 if(move)return move;
 return moveFallbacks[0];
}
function refillMovePP(p){normalizeMoves(p);for(const id of p.moves)p.movePP[id]=getMove(p,id).pp}
async function loadCritterMoveData(){
 try{
  const res=await fetch('data/moves.json?v=57',{cache:'no-store'});
  if(!res.ok)throw Error('moves HTTP '+res.status);
  const data=await res.json();
  if(!Array.isArray(data.moves))throw Error('move catalog missing moves');
  for(const m of data.moves)if(m?.id&&typeof m.name==='string'&&typeof m.type==='string'&&Number.isFinite(m.pp)&&m.pp>0&&['physical','special','status'].includes(m.category))moveRegistry.set(m.id,m);
  moveDataReady=true;
 }catch(err){console.warn('Critter move database unavailable; safe basic moves remain available',err)}
 try{
  const res=await fetch('data/critters.json?v=57',{cache:'no-store'});
  if(!res.ok)throw Error('species HTTP '+res.status);
  const data=await res.json();
  if(Array.isArray(data.species))for(const sp of data.species)
   if(typeof sp.speciesId==='string'&&sp.speciesId&&!speciesRegistry.has(sp.speciesId)
    &&Array.isArray(sp.types)&&sp.types.length&&sp.types.every(isKnownType))
     speciesRegistry.set(sp.speciesId,sp);
  speciesDataReady=true;
 }catch(err){console.warn('Critter species registry unavailable; type placeholders remain available',err)}
 if(s){migrateSpeciesIds();for(const p of [...s.party,...s.storage]){refreshSpeciesMetadata(p);normalizeMoves(p)}migrateCollection();save();if(indexTab==='critters'&&screen==='game'&&!battle)renderIndex()}
 if(battle){for(const p of battle.enemies)normalizeMoves(p);if(battle.phase==='choose')renderBattle('Move library loaded. Choose your team’s actions.')}
}

function critter(type,level=5){
 const spec=speciesRegistry.get(type);
 const starterType=Object.entries(STARTER_SPECIES_IDS).find(([,id])=>id===type)?.[0];
 const primary=spec?.types?.[0]||starterType||type;
 const hp=spec?.baseStats?.hp?Math.max(1,spec.baseStats.hp+(level-1)*4):20+level*4;
 const p={type:primary,types:spec?.types||[primary],speciesId:spec?.speciesId||(starterType?type:null),name:spec?.name||(starterType?starterType+' Starter':primary),baseStats:spec?.baseStats||null,level,hp,maxHp:hp,xp:0,status:'',moves:[],movePP:{}};
 return normalizeMoves(refreshSpeciesMetadata(p));
}
function migrate(){
 if(!s)return;
 s.area=s.area||'village';if(!['village','lab','home','neighbor','route1','town','route2','forest','route3','cave','garden','gym'].includes(s.area))s.area='village';
 s.x=Number.isFinite(s.x)?s.x:17;s.y=Number.isFinite(s.y)?s.y:16;s.face=s.face||'down';
 if(!Array.isArray(s.party))s.party=s.starter?[critter(starterSpeciesId(s.starter),5)]:[];
 s.party=s.party.map(p=>normalizeMoves(refreshSpeciesMetadata({...critter(p.speciesId||p.type||'Rock',p.level||5),...p,maxHp:p.maxHp||36,hp:typeof p.hp==='number'?p.hp:36}))); 
 if(!Array.isArray(s.storage))s.storage=[];s.storage=s.storage.map(p=>normalizeMoves(refreshSpeciesMetadata({...critter(p.speciesId||p.type||'Grass',p.level||3),...p})));
 // Preserve excess Critters from older saves instead of silently dropping them.
 if(s.party.length>PARTY_LIMIT)s.storage.push(...s.party.splice(PARTY_LIMIT));
 s.wildStepsSinceEncounter=Number.isInteger(s.wildStepsSinceEncounter)?Math.max(0,Math.min(100,s.wildStepsSinceEncounter)):4;
 s.regionalWildEncounters=s.regionalWildEncounters&&typeof s.regionalWildEncounters==='object'&&!Array.isArray(s.regionalWildEncounters)?s.regionalWildEncounters:{};
 s.captureCount=s.captureCount||0;s.captureLog=Array.isArray(s.captureLog)?s.captureLog.filter(q=>q&&typeof q.type==='string').slice(-80):[];collectionData();s.money=Number.isFinite(s.money)?s.money:250;
 s.inventory=s.inventory||{Potion:4,Revive:1};s.modules=Array.isArray(s.modules)?s.modules:[];s.installed=Array.isArray(s.installed)?s.installed:[];
 s.defeated=s.defeated||{};s.puzzles=s.puzzles||{};s.badges=s.badges||0;s.cut=s.badges>=1;
 s.rivalPassed=!!s.rivalPassed;s.introComplete=!!s.introComplete;
 s.worldMinutes=Number.isFinite(s.worldMinutes)?((s.worldMinutes%1440)+1440)%1440:8*60;
 s.worldDay=Number.isFinite(s.worldDay)&&s.worldDay>=1?Math.floor(s.worldDay):1;
 s.discoveries=s.discoveries&&typeof s.discoveries==='object'?s.discoveries:{};
 s.sideQuests=s.sideQuests&&typeof s.sideQuests==='object'&&!Array.isArray(s.sideQuests)?s.sideQuests:{};
 s.questCaptureCounts=s.questCaptureCounts&&typeof s.questCaptureCounts==='object'&&!Array.isArray(s.questCaptureCounts)?s.questCaptureCounts:{};
 s.earlyJourney=s.earlyJourney&&typeof s.earlyJourney==='object'&&!Array.isArray(s.earlyJourney)?s.earlyJourney:{};
 if(s.captureLog?.some(q=>q.area==='route1'&&q.speciesId))s.earlyJourney.firstCapture=true;
 if(s.collection?.seen&&Object.values(s.collection.seen).some(q=>q&&q.firstArea==='route1'))s.earlyJourney.firstEncounter=true;
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
  reward:{item:'Water Stone',quantity:1}}
];
function sideQuest(id){return SIDE_QUESTS.find(q=>q.id===id)||null}
function sideQuestProgress(q){
 const saved=s.sideQuests?.[q.id];if(!saved)return 0;
 if(q.kind==='landmark')return s.discoveries?.[q.landmark]?1:0;
 return Math.max(0,(s.questCaptureCounts?.[q.captureArea]||0)-(saved.baseline||0));
}
function sideQuestGoal(q){return q.kind==='landmark'?1:q.required}
function sideQuestRewardLabel(q){
 return [q.reward.credits?q.reward.credits+' credits':'',q.reward.item?q.reward.item+' ×'+(q.reward.quantity||1):''].filter(Boolean).join(' + ');
}
function talkSideQuest(id){
 const q=sideQuest(id);if(!q)return;
 const state=s.sideQuests?.[id],progress=Math.min(sideQuestGoal(q),sideQuestProgress(q));
 const done=!!state&&state.status==='complete',ready=!!state&&state.status==='active'&&progress>=sideQuestGoal(q);
 const message=done?'Thank you again! Your help made a difference.':
  ready?'You did it! I have a reward for your work.':
  state?'Keep exploring. You have made '+progress+' / '+sideQuestGoal(q)+' progress.':
  'Would you like to help? This is optional, and your main journey will continue normally.';
 open(q.giver+' · Side Quest','<h3>'+escapeHtml(q.title)+'</h3><p>'+escapeHtml(q.description)+'</p>'
  +'<p><b>Progress:</b> '+progress+' / '+sideQuestGoal(q)+'</p>'
  +'<p><b>Reward:</b> '+escapeHtml(sideQuestRewardLabel(q))+'</p>'
  +'<p>'+escapeHtml(message)+'</p><div class="options">'
  +(ready?'<button class="btn primary" id="questClaim">Claim reward</button>':'')
  +(!state?'<button class="btn primary" id="questAccept">Accept quest</button>':'')
  +'<button class="btn" id="questClose">Leave</button></div>');
 if($('questAccept'))$('questAccept').onclick=()=>{
  s.sideQuests[q.id]={status:'active',baseline:q.kind==='captures'?(s.questCaptureCounts?.[q.captureArea]||0):0};
  save();talkSideQuest(q.id);
 };
 if($('questClaim'))$('questClaim').onclick=()=>{
  const active=s.sideQuests[q.id];if(!active||active.status!=='active'||sideQuestProgress(q)<sideQuestGoal(q))return;
  if(q.reward.credits)s.money+=q.reward.credits;
  if(q.reward.item)s.inventory[q.reward.item]=(s.inventory[q.reward.item]||0)+(q.reward.quantity||1);
  active.status='complete';save();
  talkSideQuest(q.id);
 };
 $('questClose').onclick=close;
}
function sideQuestIndex(){
 return '<div class="watchSectionTitle">Side quests <small>'+SIDE_QUESTS.filter(q=>s.sideQuests?.[q.id]?.status==='complete').length+'/'+SIDE_QUESTS.length+' complete</small></div>'
  +SIDE_QUESTS.map(q=>{
   const state=s.sideQuests?.[q.id],progress=Math.min(sideQuestGoal(q),sideQuestProgress(q));
   const status=state?.status==='complete'?'Completed':!state?'Not accepted':progress>=sideQuestGoal(q)?'Return to '+q.giver:progress+' / '+sideQuestGoal(q);
   return '<div class="watchRow"><span><b>'+escapeHtml(q.title)+'</b><small> · '+escapeHtml(q.giver)+' · '+escapeHtml(q.description)+'</small></span><span>'+escapeHtml(status)+'</span></div>';
  }).join('')
  +'<div class="watchReadOnly">Side quests are optional. Accept and claim rewards by speaking to their NPCs.</div>';
}
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
 npc(9,11,['Route 1 has wild Critters hiding in the rice fields.','The northern lookout and southern paddies are worth exploring.'],'sidequest','farmer-fieldwork');
 npc(20,13,['Want to test your team against mine?'],'routetrainer','rt1');
 break;
 case 'town':
 borders();roads();rect(16,8,2,5,T.path);rect(16,15,2,7,T.path);houses([[4,5,8,5],[21,5,9,5],[4,17,8,4],[21,17,9,4]]);
 npc(9,12,['Welcome to the town between the rice fields and the bamboo woods!']);
 npc(23,12,['Critter Center technicians heal your party and maintain your Index.'],'center');
 npc(14,18,['Welcome to the supply shop!'],'shop');
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
 case 'garden':
 borders();roads();rect(23,8,3,5,T.path);rect(5,8,2,5,T.path);houses([[2,3,9,4],[20,3,10,5],[3,18,8,4],[20,18,10,4]]);
 for(let x=12;x<19;x++)for(let y=3;y<11;y++)if((x+y)%4===0)put(x,y,T.flower);
 rect(11,16,8,6,T.water);rect(14,16,2,6,T.path);
 npc(7,12,['Garden Town is famous for koi ponds, lanterns and the Grass Gym.'],'sidequest','garden-memorial');
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
 const natural=t===T.grass||t===T.tall||t===T.rice||t===T.flower||(t===T.tree&&treeArtReady());
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
 if(t===T.tree&&!treeArtReady()){
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
// Decorative wind field shared by rice, grass and trees; all map hitboxes stay fixed.
function windAt(x,y,now){
 const t=now*.001;
 return .72*Math.sin(t*1.55-x*.33-y*.12)+.40*Math.sin(t*.83-x*.14+y*.22);
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
   drawRiceClump(sx,sy,x,y,now);
  }else if(t===T.water){
   const ripple=(now/235+x*11+y*17)%25;
   ctx.strokeStyle='rgba(234,255,237,.45)';ctx.lineWidth=1.2;
   ctx.beginPath();ctx.moveTo(sx+3+ripple,sy+9+(x+y)%9);ctx.lineTo(sx+9+ripple,sy+9+(x+y)%9);ctx.stroke();
  }else if(t===T.tall){
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
 if(daylight&&(s.area==='forest'||s.area==='route2'||s.area==='route1')){
  const phase=Math.sin(now/2500)*9;
  ctx.save();ctx.globalAlpha=s.area==='forest'?.08:.045;
  for(let n=0;n<3;n++){
   const atX=((n*257+94+phase)-ox*.08+w)%w;
   const grad=ctx.createLinearGradient(atX-45,0,atX+80,h);
   grad.addColorStop(0,'rgba(255,249,198,0)');
   grad.addColorStop(.45,'rgba(255,249,198,.8)');
   grad.addColorStop(1,'rgba(255,249,198,0)');
   ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(atX,0);ctx.lineTo(atX+44,0);ctx.lineTo(atX+120,h);ctx.lineTo(atX+40,h);ctx.closePath();ctx.fill();
  }
  ctx.restore();
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
 drawCinematicTrees(ox,oy,viewportWidth,viewportHeight,performance.now());
 drawExplorationSites(ox,oy);
 drawAtmosphericMotion(ox,oy,viewportWidth,viewportHeight,performance.now());
 drawRegionAtmosphere(ox,oy,viewportWidth,viewportHeight,performance.now());
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
 const exploration=explorationSiteAt(s.area,s.x,s.y);
 if(exploration&&discoverExplorationSite(exploration))return;
 if((['route1','route2','route3','forest','cave'].includes(s.area)&&[T.tall,T.rice,T.stone].includes(t)||s.area==='garden'&&t===T.flower)&&s.introComplete){
 const first=s.area==='route1'&&!s.earlyJourney?.firstEncounter;
 if(first){s.earlyJourney=s.earlyJourney||{};s.earlyJourney.fieldSteps=(s.earlyJourney.fieldSteps||0)+1}
 // Encounter spacing is counted only on eligible wild tiles; the first Route 1
  // encounter remains guaranteed after five steps of exploration.
  s.wildStepsSinceEncounter=(s.wildStepsSinceEncounter||0)+1;
  const guaranteed=first&&s.earlyJourney.fieldSteps>=5;
  if(guaranteed||(s.wildStepsSinceEncounter>=4&&Math.random()<wildEncounterChance(s.area)))startWild();
}
}
function interact(){
 if(modal||doorTransition)return;if($('dialog').classList.contains('show'))return advance();
 const v=dirs[s.face],x=s.x+v[0],y=s.y+v[1],p=npcs.find(q=>q.x===x&&q.y===y);
 if(p)p.face={up:'down',down:'up',left:'right',right:'left'}[s.face];
 if(p){if(p.kind==='sidequest')return talkSideQuest(p.id);
 if(p.kind==='researcher'){if(!s.starter)return say(p.text,starterMenu);return say(['Researcher: Your Critter Index is functioning well. Good luck!'])}
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
function open(title,body){
 releaseMovement();modal=true;
 const host=$('shade'),panel=host.querySelector('.modal'),watch=body.includes('class="watchShell"');
 const preserve=watch&&panel&&host.classList.contains('show')&&panel.dataset?.screenMode==='watch';
 const previous=preserve?panel.scrollTop:0;
 $('modalTitle').textContent=title;$('modalBody').innerHTML=body;host.classList.add('show');
 if(panel){panel.dataset.screenMode=watch?'watch':'other';panel.scrollTop=preserve?previous:0}
}
function close(){if(battle)return;modal=false;$('shade').classList.remove('show');$('close').hidden=false;releaseMovement()}
function firstAlive(){return s.party.findIndex(p=>p.hp>0)}
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
function combatStat(p,key){
 const profile=statProfile(p),lvl=Math.max(1,Number.isFinite(p?.level)?p.level:1);
 if(key==='hp')return Math.max(1,Math.round(profile.hp+(lvl-1)*4));
 return Math.max(1,Math.round(profile[key]+(lvl-1)*1.25));
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
 if(!p)return p;
 const species=speciesFor(p);
 if(species){
  p.type=species.types[0];
  p.types=species.types.slice(0,2);
  p.baseStats={...species.baseStats};
  p.name=species.name;
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
const INDEX_TABS=[['clock','⌚ Clock'],['party','◇ Party'],['items','▣ Bag'],['records','◎ Records'],['moves','✦ Moves'],['critters','◈ Critters'],['tools','⚙ Tools']];
let moveBookType='Water';
let critterBookType='All',critterBookArea='all',critterBookPage=0,critterBookSelected=null,critterBookSearch='';

function index(){
 if(screen!=='game'||battle)return;
 indexTab='clock';indexSelection=0;renderIndex();
}
function indexSlotContent(i){
 if(i<8){
  const p=s.party[i];
  return p?'<span class="watchSlotIcon">'+(symbols[p.type]||'◇')+'</span><span class="watchSlotName">'+escapeHtml(p.name||p.type)+'</span><small>Lv '+p.level+'</small>'
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
function battleIndexActive(){return !!(battle&&battle.phase==='choose'&&battle.indexOpen)}
function openBattleIndex(){
 if(!battle||battle.phase!=='choose')return;
 battle.indexOpen=true;indexTab='party';indexSelection=0;renderIndex();
}
function returnFromBattleIndex(){
 if(!battle||!battle.indexOpen)return;
 battle.indexOpen=false;battle.uiMenu='root';renderBattle();
}
function indexParty(){
 const cards=Array.from({length:8},(_,i)=>{
  const p=s.party[i];
  if(!p)return '<div class="watchPartyCard empty"><span>Slot '+(i+1)+'</span><strong>◇ Empty</strong></div>';
  const pct=Math.round(100*p.hp/Math.max(1,p.maxHp));
  return '<div class="watchPartyCard"><div><span class="watchPartyNumber">'+(i+1)+'</span><strong>'+(symbols[p.type]||'◇')+' '+escapeHtml(p.name||p.type)+'</strong>'
   +'<small>Lv '+p.level+'</small></div><div class="watchPartyMeta">'+escapeHtml(defendTypes(p).join(' / '))+'</div><div class="watchMeter"><div style="width:'+pct+'%"></div></div>'
   +'<div class="watchPartyMeta">HP '+p.hp+'/'+p.maxHp+' · '+escapeHtml(p.status||'Healthy')+'</div>'
    +'<div class="watchPartyMeta">XP '+Math.floor(p.xp||0)+' / '+experienceToNextLevel(p)+' to Lv '+(p.level+1)+'</div>'
    +'<div class="watchMeter"><div style="width:'+Math.min(100,Math.max(0,Math.round(100*(p.xp||0)/experienceToNextLevel(p))))+'%"></div></div>'
    +'<div class="watchPartyMeta">'+(nextLevelMove(p)?'Next move: '+escapeHtml(getMove(p,nextLevelMove(p).moveId).name)+' at Lv '+nextLevelMove(p).level:'No further level-up moves assigned')+'</div>'
   +(battleIndexActive()?'<div class="watchPartyMeta">'+(battle.allySlots.includes(i)?'Currently battling':p.hp>0?'Available to switch':'Fainted')+'</div>'+(p.hp>0&&!battle.allySlots.includes(i)&&!battle.pending.some(q=>q.kind==='switch'&&q.target===i)?'<button type="button" class="btn watchBattleAction" data-index-battle-switch="'+i+'">Switch into battle</button>':''):'')
    +'<div class="watchPartyMeta">ATK '+combatStat(p,'attack')+' · DEF '+combatStat(p,'defense')+' · S.ATK '+combatStat(p,'specialAttack')+' · S.DEF '+combatStat(p,'specialDefense')+' · SPD '+combatStat(p,'speed')+'</div>'
   +'<div class="watchPartyMeta">'+(p.moves||[]).map(id=>{const m=getMove(p,id);return escapeHtml(m.name)+' ('+(p.movePP?.[id]??m.pp)+' PP)'}).join(' · ')+'</div>'
   +(battleIndexActive()?'':partyEvolutionControls(p,i))+'</div>';
 }).join('');
 return (battleIndexActive()?'':evolutionNotification())+'<div class="watchSectionTitle">Active party <small>'+s.party.length+' / 8</small></div>'
  +'<div class="watchPartyGrid">'+cards+'</div><div class="watchReadOnly">⌁ Party rearranging and home storage retrieval require a Critter Center. Stored at home: '+s.storage.length+'</div>';
}
function indexItems(){
 const items=Object.entries(s.inventory||{}).filter(([,v])=>v>0);
 const list=items.length?items.map(([k,v])=>'<div class="watchRow"><span>▣ '+escapeHtml(k)+'</span><strong>×'+v+'</strong></div>').join(''):'<div class="watchEmpty">Your bag is empty.</div>';
 const modules=['Power Coil','Guard Plate','Weakening Field'];
 const owned=modules.map(m=>{const count=s.modules.filter(x=>x===m).length;return count?'<div class="watchRow"><span>✧ '+escapeHtml(m)+'</span><strong>×'+count+'</strong></div>':''}).join('');
 const current=battleIndexActive()?battle.allySlots[battle.acting]:-1;
 const battleTools=battleIndexActive()?'<div class="watchSectionTitle">Battle supplies</div><div class="battleBagActions">'
   +'<button type="button" class="btn" id="watchBattlePotion" '+(!itemQty('Potion')?'disabled':'')+'>Use Potion on '+escapeHtml(s.party[current]?.name||s.party[current]?.type||'active Critter')+' ('+itemQty('Potion')+')</button>'
   +'<button type="button" class="btn" id="watchBattleRevive" '+(!itemQty('Revive')||!s.party.some(p=>p.hp===0)?'disabled':'')+'>Use Revive ('+itemQty('Revive')+')</button></div>':'';
 return battleTools+'<div class="watchSectionTitle">Field inventory <small>View only</small></div>'+list
  +'<div class="watchSectionTitle">Available modules</div>'+(owned||'<div class="watchEmpty">No uninstalled modules owned.</div>')
  +'<div class="watchReadOnly">'+(battleIndexActive()?'Choose a battle item above to queue an action. Simply browsing the Index does not spend a turn.':'Items are usable during battles; modules are installed at Critter Centers.')+'</div>';
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
function encounterStamp(){return {day:Number.isFinite(s?.worldDay)?Math.max(1,Math.floor(s.worldDay)):1,area:s?.area||'unknown'}}
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
 return [m.credits+' credits',m.potions?m.potions+' Potions':'',m.revives?m.revives+' Revives':''].filter(Boolean).join(' · ');
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

function indexRecords(){
 const log=(s.captureLog||[]).slice(-12).reverse();
 const history=log.length?log.map(q=>'<div class="watchRow"><span>'+(symbols[q.type]||'◇')+' '+escapeHtml(q.name||q.type)+' <small>Lv '+Number(q.level||1)+'</small></span><span class="watchRecordLocation">'+escapeHtml(q.area||'Unknown')+' · '+escapeHtml(q.storage||'Party')+'</span></div>').join('')
  :'<div class="watchEmpty">New captures will appear here. Older saves retain their capture totals, but individual capture histories were not previously stored.</div>';
 return '<div class="watchMetrics">'
  +'<div><strong>'+s.captureCount+'</strong><span>Total captures</span></div>'
  +'<div><strong>'+s.storage.length+'</strong><span>Home storage</span></div>'
  +'<div><strong>'+s.badges+'</strong><span>Badges</span></div>'
   +'<div><strong>'+EXPLORATION_SITES.filter(o=>s.discoveries?.[o.id]).length+'/'+EXPLORATION_SITES.length+'</strong><span>Exploration finds</span></div>'
  +'</div><div class="watchSectionTitle">Recent capture registrations</div>'+history
  +'<div class="watchSectionTitle">Landmark discoveries</div>'
   +EXPLORATION_SITES.map(o=>'<div class="watchRow"><span>'+escapeHtml(o.title)+'</span><span>'+(s.discoveries?.[o.id]?'Discovered':'Not yet found')+'</span></div>').join('')
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
 // Art is never fabricated. Original sprites appear after Cody/Kyle uploads.
 if(sp?.art?.status==='ready'&&typeof sp.art.spritePath==='string'&&/^assets\/critters\/[a-z0-9/_-]+\.png$/.test(sp.art.spritePath)){
  return '<img class="speciesPortrait" alt="Artwork for '+escapeHtml(sp.name)+'" src="'+escapeHtml(sp.art.spritePath)+'" loading="lazy">';
 }
 return '<div class="speciesSilhouette" role="img" aria-label="Artwork pending"><span>◇</span><small>ART PENDING</small></div>';
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
   +' · Lv '+h.minLevel+'–'+h.maxLevel+' · '+escapeHtml(h.rarity||'common')+'</li>').join('');
  const moveRows=registeredLearnset(selection).map(e=>{
   const move=validMove(e.moveId);
   return '<div class="speciesMoveLine"><span>Lv '+e.level+'</span><strong>'+escapeHtml(move?.name||e.moveId)+'</strong><small>'+escapeHtml(move?.type||'Unknown')+'</small></div>';
  }).join('');
  body='<button class="btn speciesBack" type="button" id="critterBack">← Back to all Critters</button>'
   +'<div class="speciesIdentity">'+critterArtwork(selection)+'<div><span class="speciesNumber">#'+String(critterIndexNumber(selection)).padStart(3,'0')+'</span>'
   +'<h3>'+escapeHtml(selection.name)+'</h3><p>'+selection.types.map(escapeHtml).join(' / ')+'</p>'
   +'<small>'+escapeHtml(selection.role||'balanced')+' · '+(selection.art?.status==='ready'?'Art uploaded':'Awaiting original art')+'</small>'
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
    +'<span class="speciesMiniIcon">'+(symbols[sp.types?.[0]]||'◇')+'</span><span><small>#'+String(critterIndexNumber(sp)).padStart(3,'0')+'</small><strong>'+escapeHtml(sp.name)+'</strong>'
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
  +'<div class="watchToolCard"><strong>✧ Capture Beam</strong><span>ONLINE</span><p>Capture wild Critters during 1v1 encounters. Lower target HP to improve capture chances.</p></div>'
  +'<div class="watchToolCard"><strong>⚙ Vegetation Cutter</strong><span>'+(cutter?'UNLOCKED':'LOCKED')+'</span><p>'+(cutter?'First-badge cutting function is active.':'Earn the first Grass Gym badge to unlock vegetation cutting.')+'</p></div>'
  +'<div class="watchToolCard"><strong>◇ Module Access</strong><span>'+level.toUpperCase()+'</span><p>Basic at 0 badges · Advanced at 2 · Rare at 5.</p></div>'
  +'<div class="watchSectionTitle">Module sockets</div>'+modules
  +'<div class="watchReadOnly">Your watch is read-only away from a Critter Center. Modules are automatic after installation.</div>';
}
function renderIndex(){
 if(!s||screen!=='game'||(battle&&!battleIndexActive()))return;
 const battleViewing=battleIndexActive();
 const tabs=INDEX_TABS.map(([key,label])=>'<button type="button" class="watchTab '+(indexTab===key?'selected':'')+'" data-watch-tab="'+key+'" aria-pressed="'+(indexTab===key)+'">'+label+'</button>').join('');
 let content=indexTab==='clock'?indexClock():indexTab==='party'?indexParty():indexTab==='items'?indexItems():indexTab==='records'?indexRecords():indexTab==='moves'?indexMoves():indexTab==='critters'?indexCritters():indexTools();
 open('Critter Index','<div class="watchShell '+(battleViewing?'battleIndexShell':'')+'"><div class="watchStatus"><span>◉ WATCH CONNECTED</span><strong>'+escapeHtml(s.name)+'</strong></div>'
  +'<div class="watchStats"><span>◇ '+s.money+' credits</span><span>✧ '+s.badges+' badge'+(s.badges===1?'':'s')+'</span>'
  +'<span>▤ '+s.captureCount+' captures</span></div><nav class="watchTabs" aria-label="Critter Index screens">'+tabs+'</nav>'
  +'<div class="watchScreen" role="region" aria-label="Critter Index '+escapeHtml(indexTab)+' screen">'+content+'</div>'
  +'<div class="watchFooter">'+(battleViewing?
    '<button type="button" class="btn primary" id="watchReturnBattle">Return to Battle</button>'
    +(battle.kind==='wild'?'<button type="button" class="btn" id="watchCaptureBattle">⌚ Capture Beam · '+Math.round(captureChance(battle.enemies[0])*100)+'%</button>':''):
    '<button type="button" class="btn" id="mSave">Save Adventure</button><button type="button" class="btn" id="mTitle">Return to Title</button>')+'</div></div>');
 document.querySelectorAll('[data-watch-tab]').forEach(b=>b.onclick=()=>{
  if(!INDEX_TABS.some(([key])=>key===b.dataset.watchTab))return;
  indexTab=b.dataset.watchTab;renderIndex();
 });
 document.querySelectorAll('[data-move-type]').forEach(b=>b.onclick=()=>{
  if(!Object.keys(strengths).concat('Typeless').includes(b.dataset.moveType))return;
  moveBookType=b.dataset.moveType;renderIndex();
 });
 document.querySelectorAll('[data-evolve-party]').forEach(b=>b.onclick=()=>{
  if(battleViewing)return;
  const i=Number(b.dataset.evolveParty),p=s.party[i];if(!p||!evolutionReady(p,true))return;
  const result=tryEvolveChain(p,2,true);if(!result.length)return;
  renderIndex();save();
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
 document.querySelectorAll('[data-collection-claim]').forEach(b=>b.onclick=()=>{if(claimCollectionMilestone(Number(b.dataset.collectionClaim)))renderIndex()});
 const back=$('critterBack');if(back)back.onclick=()=>{critterBookSelected=null;renderIndex()};
 const prev=$('critterPrev');if(prev)prev.onclick=()=>{critterBookPage=Math.max(0,critterBookPage-1);renderIndex()};
 const next=$('critterNext');if(next)next.onclick=()=>{critterBookPage++;renderIndex()};
 document.querySelectorAll('[data-index-slot]').forEach(b=>b.onclick=()=>{
  const n=Number(b.dataset.indexSlot);if(!Number.isInteger(n)||n<0||n>=12)return;
  indexSelection=n;renderIndex();
 });
 const view=$('watchViewTab');
 if(view)view.onclick=()=>{indexTab=indexSelection<8?'party':'tools';renderIndex()};
 if(battleViewing){
  $('watchReturnBattle').onclick=returnFromBattleIndex;
  document.querySelectorAll('[data-index-battle-switch]').forEach(el=>el.onclick=()=>{
   const target=Number(el.dataset.indexBattleSwitch);
   if(!Number.isInteger(target))return;
   battle.indexOpen=false;queueBattleAction({kind:'switch',target});
  });
  const potion=$('watchBattlePotion');if(potion)potion.onclick=()=>{
   if(!itemQty('Potion'))return;
   const actor=battle.allySlots[battle.acting];
   battle.indexOpen=false;queueBattleAction({kind:'potion',target:actor});
  };
  const revive=$('watchBattleRevive');if(revive)revive.onclick=selectRevive;
  const capture=$('watchCaptureBattle');if(capture)capture.onclick=()=>{
   if(battle.kind!=='wild')return;
   battle.indexOpen=false;queueBattleAction({kind:'capture'});
  };
 }else{
  $('mSave').onclick=()=>{save();close()};
  $('mTitle').onclick=()=>{save();close();show('title')};
 }
}
function inventoryText(){return Object.entries(s.inventory).filter(([,v])=>v>0).map(([k,v])=>k+' ×'+v).join(', ')||'Empty'}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function noteOpeningEvent(key){
 s.earlyJourney=s.earlyJourney&&typeof s.earlyJourney==='object'?s.earlyJourney:{};
 if(!s.earlyJourney[key]){s.earlyJourney[key]=true;save()}
}
function earlyBattleTip(){
 if(!battle)return '';
 if(battle.kind==='tutorial')return '<p class="openingTip">Training match: Try your starter’s attacks! Everyone will be healed afterward.</p>';
 if(battle.kind==='wild'&&s.area==='route1'&&!s.earlyJourney?.firstCapture)return '<p class="openingTip">Capture hint: Lower the wild Critter’s HP, then tap Capture Beam. Attempts can fail.</p>';
 if(battle.id==='rt1'&&!s.defeated?.rt1)return '<p class="openingTip">Trainer tip: Guard, switch Critters, or use a Potion if you need to.</p>';
 return '';
}

function starterMenu(){
 open('Choose Your Starter','<p>Choose your first partner. The Critter Index holds your team, inventory, and capture beam.</p><div class="options"><button class="btn" data-starter="Rock">⛰ Rock</button><button class="btn" data-starter="Water">💧 Water</button><button class="btn" data-starter="Electric">⚡ Electric</button></div><p class="muted">Water beats Rock · Rock beats Electric · Electric beats Water</p>');
 document.querySelectorAll('[data-starter]').forEach(b=>b.onclick=()=>{s.starter=b.dataset.starter;const starterId=starterSpeciesId(s.starter);
  const partner=critter(starterId,5);
  if(!speciesRegistry.has(starterId)){partner.speciesId=starterId;partner.name=s.starter+' Starter';partner.type=s.starter;partner.types=[s.starter]}
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
// Each habitat is exclusive to one region in the authored library. Keep only
// a small, stable selection active initially; exploration reveals additional
// resident species without changing their original assigned location.
const STARTING_WILD_ROSTER={route1:9,route2:12,forest:12,route3:13,garden:12,cave:13};
function wildRosterOrder(area){
 const residents=[...speciesRegistry.values()].filter(sp=>effectiveWildHabitat(sp,area));
 const groups={common:[],uncommon:[],rare:[],legendary:[]};
 for(const sp of residents){
  const rarity=wildHabitat(sp,area).rarity||'common';
  (groups[rarity]||groups.common).push(sp);
 }
 // Stable ordering means a saved game sees the same unlock sequence each visit.
 for(const [rarity,list] of Object.entries(groups))list.sort((a,b)=>{
  const rank=id=>{let h=2166136261;for(const ch of area+':'+rarity+':'+id)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;return h};
  return rank(a.speciesId)-rank(b.speciesId)||a.speciesId.localeCompare(b.speciesId);
 });
 const ordered=[],pattern=['common','common','uncommon','common','rare','uncommon'];
 while(ordered.length<residents.length){
  let progressed=false;
  for(const rarity of pattern){
   if(groups[rarity]?.length){ordered.push(groups[rarity].shift());progressed=true}
  }
  if(!progressed)break;
 }
 // Legendary species stay separate, and only become available under the
 // existing first-badge requirement.
 ordered.push(...groups.legendary);
 return ordered;
}
function encounterSpeciesFor(area){
 const ordered=wildRosterOrder(area),encounters=Math.max(0,Number(s?.regionalWildEncounters?.[area])||0);
 const initial=STARTING_WILD_ROSTER[area]||10;
 const unlocked=initial+Math.floor(encounters/8)*4;
 return ordered.slice(0,Math.min(ordered.length,unlocked));
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
 const hour=worldHour(),night=hour>=20||hour<5;
 if(night&&sp.types.some(t=>t==='Ghost'||t==='Shadow'))weight*=1.35;
 else if(!night&&sp.types.some(t=>t==='Grass'||t==='Flying'))weight*=1.12;
 return Math.max(0,weight);
}
function chooseWildSpecies(area,roll=Math.random()){
 const pool=encounterSpeciesFor(area),weights=pool.map(sp=>encounterWeight(sp,area));
 const total=weights.reduce((a,b)=>a+b,0);if(total<=0)return null;
 let target=Math.max(0,Math.min(.999999999,roll))*total;
 for(let i=0;i<pool.length;i++){target-=weights[i];if(target<0)return pool[i]}
 return pool[pool.length-1]||null;
}
function wildEncounterChance(area){return WILD_AREA_BALANCE[area]?.stepRate||0}
function areaTypes(){return {route1:['Grass','Water','Flying'],route2:['Grass','Flying','Venom'],forest:['Grass','Ghost','Shadow'],route3:['Rock','Electric','Fighting'],cave:['Rock','Ghost','Ice'],garden:['Grass','Water','Psychic']}[s.area]||['Grass']}
function startWild(){
 if(firstAlive()<0)return blackout();
 s.wildStepsSinceEncounter=0;
 const choice=chooseWildSpecies(s.area);
 s.regionalWildEncounters=s.regionalWildEncounters||{};
 s.regionalWildEncounters[s.area]=(s.regionalWildEncounters[s.area]||0)+1;
 if(choice){
  const h=wildHabitat(choice,s.area);
  const min=Math.max(1,Math.floor(h.minLevel)),max=Math.max(min,Math.floor(h.maxLevel));
  const level=min+Math.floor(Math.random()*(max-min+1));
  const foe=critter(choice.speciesId,level);
  return startBattle({kind:'wild',enemies:[foe],name:'Wild Critter',award:0},'A wild '+choice.name+' appeared!');
 }
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
function startTrainer(id){
 if(firstAlive()<0)return blackout();
 const area=id.startsWith('rt')?({rt1:'route1',rt2:'route2',rt3:'route3'}[id]||'route2'):'garden';
 const used=new Set();
 const make=(t,l)=>trainerSpecies(t,l,area,id,used.size,used);
 const starter=t=>critter(starterSpeciesId(t),5);
 let enemies,name,award,kind='trainer';
 if(id==='tutorial'){enemies=[starter(s.rival)];name='Childhood Rival';award=0;kind='tutorial'}
 else if(id==='rival'){enemies=[critter(starterSpeciesId(s.rival),12),make('Fighting',10),make('Flying',14)];name='Childhood Rival';award=65}
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
 const area=BATTLE_AREAS.includes(s.area)?s.area:'route1';
 const tile=tiles?.[s.y]?.[s.x];
 const terrain=tile===T.rice?'rice':tile===T.tall?'grass':tile===T.stone?'stone':tile===T.flower?'flowers':tile===T.path?'path':tile===T.water?'water':'field';
 return {area,terrain,phase:worldPhase()};
}
function startBattle(data,msg){
 const doubles=data.kind==='trainer'&&['rt2','rt3'].includes(data.id)&&s.party.filter(p=>p.hp>0).length>=2&&data.enemies.length>=2;
 const allySlots=s.party.map((p,i)=>p.hp>0?i:-1).filter(i=>i>=0).slice(0,doubles?2:1);
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
  +'<div class="combatCardHead"><strong>'+(symbols[p.type]||'◇')+' '+escapeHtml(p.name||p.type)+'</strong><small>Lv '+p.level+'</small></div>'
  +'<div class="health"><div class="'+(low?'low':'')+'" style="width:'+pct+'%"></div></div>'
  +'<div class="combatCardFoot">HP '+p.hp+'/'+p.maxHp+(p.hp===0?' · Fainted':'')+' · '+escapeHtml(defendTypes(p).join('/'))+'</div></div>';
}
function sceneFigure(p,side,i){
 if(!p||p.hp<=0)return '';
 return '<div class="combatFigure '+side+' '+(battle.impact===side&&battle.lastTarget===i?'hit':'')+'" aria-label="'+escapeHtml(p.name||p.type)+'">'
  +'<span class="combatAura"></span><span class="combatSymbol">'+(symbols[p.type]||'✦')+'</span>'
  +'<small>'+escapeHtml(p.name||p.type)+'</small></div>';
}
function battleVisual(){
 const fx=battle?.lastVfx;
 if(!fx)return '';
 const safeType=String(fx.type||'Typeless').replace(/[^a-zA-Z]/g,'');
 const direction=fx.side==='enemy'?'reverse':'forward';
 const typeClass='vfx-'+safeType.toLowerCase();
 return '<div class="battleVfx '+typeClass+' '+direction+(fx.missed?' missed':'')+'" aria-hidden="true">'
  +'<span class="battleVfxBeam"></span><span class="battleVfxCore"></span><span class="battleVfxBurst"></span>'
  +'<span class="battleVfxLabel">'+escapeHtml(fx.name||'Attack')+'</span></div>';
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
  +'<div class="combatRoster"><div><div class="rosterTitle">OPPONENT TEAM</div>'+foe+'</div><div><div class="rosterTitle">YOUR TEAM</div>'+ally+'</div></div>'
  +'<div class="combatArena '+battleEnvironmentClass()+'"><div class="battleScenery" aria-hidden="true"><span class="sceneryCloud cloudA"></span><span class="sceneryCloud cloudB"></span><span class="sceneryTree treeA"></span><span class="sceneryTree treeB"></span><span class="sceneryTree treeC"></span><span class="sceneDetail detailA"></span><span class="sceneDetail detailB"></span><span class="sceneStructure"></span></div><div class="combatSide enemies">'+their+'</div><div class="combatSide allies">'+ours+'</div>'+battleVisual()+moveOverlay+'</div>';
}
function battleMessage(msg){return '<div class="combatMessage" role="status">'+escapeHtml(msg||battle.feedback||'Choose your actions.')+'</div>'}
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
     m.target==='ally'?activeAllies().filter(a=>a!==i):[i];
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
   actions='<div class="classicSubmenu"><strong>'+escapeHtml(actor.name||actor.type)+' · Choose a move'+(battle.mode===2?' and target':'')+'</strong>'
     +'<button class="btn" id="battleGuard">Guard</button><button class="btn" id="battleFocus">Focus</button><button class="btn" id="battleBack">Back</button></div>';
  }else if(mode==='index'){
   actions='<div class="classicMenu classicIndexMenu"><button class="btn" id="indexSwitch">↔ Switch Critter</button>'
     +'<button class="btn" id="indexItem">▣ Use Item</button>'
     +(battle.kind==='wild'?'<button class="btn" id="indexCapture">⌚ Capture Beam · '+Math.round(captureChance(battle.enemies[0])*100)+'%</button>':'')
     +'<button class="btn" id="battleBack">Back</button></div>';
  }else if(mode==='items'){
   actions='<div class="classicMenu classicItemsMenu">'
     +'<button class="btn" id="potion" '+(!itemQty('Potion')?'disabled':'')+'>Potion · '+itemQty('Potion')+'</button>'
     +'<button class="btn" id="revive" '+(!itemQty('Revive')||!s.party.some(q=>q.hp===0)?'disabled':'')+'>Revive · '+itemQty('Revive')+'</button>'
     +'<button class="btn" id="battleBack">Back</button></div>';
  }else{
   actions='<div class="classicMenu classicMainMenu">'
     +'<button class="btn classicBattle" id="menuBattle"><span>⚔</span> Battle</button>'
     +'<button class="btn classicIndex" id="menuIndex"><span>⌚</span> Index</button>'
     +'<button class="btn classicEscape" id="menuEscape" '+(battle.kind!=='wild'?'disabled title="Cannot escape a trainer battle"':'')+'><span>↗</span> Escape</button></div>'
     +(battle.kind!=='wild'?'<p class="classicFootnote">Escape is unavailable against trainers.</p>':'');
  }
 }else if(battle.phase==='resolve')actions='<div class="combatProcessing">Resolving team turn…</div>';
 open(battle.kind==='wild'?'Wild Encounter':battle.name,battleHeader(moveOverlay)+battleMessage(battle.feedback)
  +(queued?'<div class="combatQueue"><b>Queued:</b> '+escapeHtml(queued)+'</div>':'')
  +actions+recentBattleLog()+earlyBattleTip());
 $('close').hidden=true;
 if(battle.phase!=='choose')return;
 const menuTo=(next)=>{battle.uiMenu=next;renderBattle()};
 if($('menuBattle'))$('menuBattle').onclick=()=>menuTo('battle');
 if($('menuIndex'))$('menuIndex').onclick=openBattleIndex;
 if($('menuEscape'))$('menuEscape').onclick=()=>{if(battle.kind==='wild')queueBattleAction({kind:'run'})};
 if($('battleBack'))$('battleBack').onclick=()=>menuTo(mode==='items'?'index':'root');
 document.querySelectorAll('[data-use-move]').forEach(el=>el.onclick=()=>{
  const moveId=el.dataset.useMove,target=Number(el.dataset.moveTarget);
  if(!validMove(moveId)||((actor.movePP[moveId]||0)<1&&!(moveId==='opening-flick'&&noUsableMoves)))return;
  queueBattleAction({kind:'move',moveId,target});
 });
 if($('battleGuard'))$('battleGuard').onclick=()=>queueBattleAction({kind:'guard'});
 if($('battleFocus'))$('battleFocus').onclick=()=>queueBattleAction({kind:'focus'});
 if($('indexSwitch'))$('indexSwitch').onclick=selectPoke;
 if($('indexItem'))$('indexItem').onclick=()=>menuTo('items');
 if($('indexCapture'))$('indexCapture').onclick=()=>{if(battle.kind==='wild')queueBattleAction({kind:'capture'})};
 if($('potion'))$('potion').onclick=()=>{if(itemQty('Potion'))queueBattleAction({kind:'potion',target:i})};
 if($('revive'))$('revive').onclick=()=>{if(itemQty('Revive')&&s.party.some(q=>q.hp===0))selectRevive()};
}

function queueBattleAction(action){
 if(!battle||battle.phase!=='choose')return;
 const actor=battle.allySlots[battle.acting];
 if(actor==null||!s.party[actor]||s.party[actor].hp<=0)return;
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
  if(action.kind==='revive'&&(!Number.isInteger(action.target)||s.party[action.target]?.hp!==0))return;
  battle.pending.push({...action,actor});
 battle.indexOpen=false;
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
 // Last Resort is a temporary desperation action, not a learned move.
 // Never overwrite one of the Critter's four equipped attacks.
 const fallback=moveId==='opening-flick'&&(actor.movePP[moveId]||0)<=0;
 if(fallback&&actor.moves.some(id=>(actor.movePP[id]||0)>0))return;
 if(fallback){
  log.push((actor.name||actor.type)+' has no remaining PP and uses Last Resort!');
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
 // Store the final animated action only; the damage and turn system are unchanged.
 battle.lastVfx={name:move.name,type:move.type,side,missed:false};
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
  log.push(dmg+' damage.'+(factor>=4?' Devastatingly effective (4×)!':factor>1?' Super effective!':factor<=.25?' Barely effective (¼×).':factor<1?' Not very effective.':''));
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
  case 'potion':if(itemQty('Potion')){s.inventory.Potion--;const healed=Math.min(20,actor.maxHp-actor.hp);actor.hp+=healed;log.push(actor.type+' recovered '+healed+' HP.')}return;
  case 'revive':if(itemQty('Revive')&&s.party[action.target]?.hp===0){s.inventory.Revive--;const q=s.party[action.target];q.hp=Math.max(1,Math.floor(q.maxHp/2));log.push(q.type+' was revived with '+q.hp+' HP.')}return;
  case 'capture':if(battle.kind==='wild'){
    const foe=battle.enemies[0];
    if(!foe||foe.hp<=0){log.push('Capture target is unavailable.');return}
    const chance=captureChance(foe);
    if(Math.random()<chance){
     const caught={...foe,hp:Math.max(1,foe.hp),xp:0};
     const destination=addCapturedCritter(caught);
     s.questCaptureCounts=s.questCaptureCounts||{};
     s.questCaptureCounts[s.area]=(s.questCaptureCounts[s.area]||0)+1;
     s.captureCount++;noteCritterCaptured(caught);if(s.area==='route1')noteOpeningEvent('firstCapture');s.captureLog=s.captureLog||[];s.captureLog.push({speciesId:foe.speciesId||null,name:foe.name||foe.type,type:foe.type,level:foe.level,area:s.area,storage:destination});s.captureLog=s.captureLog.slice(-80);
     endBattle(true,'Capture successful! '+(foe.name||foe.type)+(destination==='Party'?' joined your party ('+s.party.length+'/'+PARTY_LIMIT+').':' was automatically sent to home storage ('+s.storage.length+' stored).'),false);
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
 const accuracy=Math.min(1,Math.max(.05,(move.accuracy??100)/100));
 return Math.max(1,base*ratio*stages*factor)*accuracy;
}
function trainerMoveScore(foe,move,enemyIndex,allyIndex){
 const target=s.party[allyIndex],hpRatio=foe.hp/Math.max(1,foe.maxHp);
 if(!target||target.hp<=0)return -Infinity;
 if(move.target==='enemy'&&move.category!=='status'){
  const damage=predictedMoveDamage(foe,target,move,enemyIndex,allyIndex);
  const reward=damage>=target.hp?18:0;
  const advantage=move.type==='Typeless'?1:mult(move.type,target);
  return damage+reward+Math.min(4,advantage)*.4+(move.priority||0)*1.5;
 }
 const effect=move.effect||{};
 if(move.target==='self'||move.target==='ally'||move.target==='ally_team'||move.target==='field'){
  if(effect.id==='heal')return hpRatio<.42?27:hpRatio<.7?13:-8;
  if(effect.id==='cure_status')return foe.status?12:-8;
  if(effect.id==='guard'||effect.id==='team_guard')return hpRatio<.35?9:1;
  if(effect.id==='raise_stat'||effect.id==='team_buff'){
   const stat=effect.stat||'attack',stage=battleStages('enemy',enemyIndex)[stat]||0;
   return battle.turn<=3&&stage<2?8:-3;
  }
  if(effect.id==='terrain')return !battle.terrain&&battle.turn<=3?5:-4;
 }
 if(move.target==='enemy'&&effect.id==='ailment')return target.status?-3:7;
 if(move.target==='enemy'&&effect.id==='lower_stat')return battle.turn<=3?5:-1;
 return -5;
}
function chooseTrainerAction(enemyIndex){
 const foe=battle?.enemies[enemyIndex],allies=activeAllies();
 if(!foe||!allies.length)return null;
 normalizeMoves(foe);
 const legal=foe.moves.map(id=>getMove(foe,id)).filter(m=>(foe.movePP?.[m.id]||0)>0);
 if(!legal.length)return {enemyIndex,move:moveFallbacks[0],target:allies[0]};
 const relaxed=battle.kind==='wild'||battle.kind==='tutorial';
 if(relaxed){
  const attack=legal.filter(m=>m.target==='enemy'&&m.category!=='status');
  const choices=attack.length?attack:legal;
  const move=choices[Math.floor(Math.random()*choices.length)];
  const target=allies[Math.floor(Math.random()*allies.length)];
  return {enemyIndex,move,target};
 }
 const candidates=[];
 for(const move of legal){
  const enemyTarget=move.target==='enemy';
  const candidatesForMove=enemyTarget?allies:move.target==='ally'?activeEnemies():[enemyIndex];
  for(const target of candidatesForMove){
   const score=trainerMoveScore(foe,move,enemyIndex,enemyTarget?target:allies[0]);
   // Small variation prevents repetitive AI without overwhelming smarter choices.
   candidates.push({enemyIndex,move,target,score:score+(Math.random()-.5)*3});
  }
 }
 candidates.sort((a,b)=>b.score-a.score);
 return candidates[0]||null;
}
function recentBattleLog(){
 if(!battle?.lastTurnLog?.length)return '';
 return '<details class="combatLog" open><summary>Last turn · '+battle.lastTurnLog.length+' events</summary>'
  +'<ol>'+battle.lastTurnLog.slice(-18).map(entry=>'<li>'+escapeHtml(entry)+'</li>').join('')+'</ol></details>';
}

function resolveTeamTurn(){
 if(!battle)return;
 const log=[];
 battle.phase='resolve';battle.impact='';battle.lastTarget=null;battle.lastVfx=null;
 const actions=battle.pending.slice();battle.pending=[];
 // Team order: one player action per deployed Critter, followed by all living enemies.
 // Resolve priority within a team without changing the approved team-turn order.
 actions.sort((a,b)=>{
  const ma=a.kind==='move'?validMove(a.moveId):null,mb=b.kind==='move'?validMove(b.moveId):null;
  const pa=ma?.priority||0,pb=mb?.priority||0;
  return pb-pa||combatSpeed('ally',b.actor)-combatSpeed('ally',a.actor);
 });
 for(const action of actions){
  if(!battle)return;
  performPlayerAction(action,log);
 }
 if(!battle)return; // capture / escape can end the battle mid-phase
 const livingEnemy=battle.enemies.some(p=>p.hp>0);
 if(!livingEnemy)return endBattle(true,log.join(' ')+' Victory!',true);
 // The opposing team uses exactly the same move executor and PP rules.
 const enemyChoices=activeEnemies().map(chooseTrainerAction).filter(Boolean)
  .sort((a,b)=>(b.move.priority||0)-(a.move.priority||0)
   ||combatSpeed('enemy',b.enemyIndex)-combatSpeed('enemy',a.enemyIndex));
 for(const {enemyIndex,move,target} of enemyChoices){
  if(!battle)return;
  const foe=battle.enemies[enemyIndex];
  if(foe.hp<=0||!activeAllies().length)continue;
  // A target may faint during this team turn; performMove retargets safely.
  performMove(foe,move,'enemy',enemyIndex,target,log);
 }
 // Conditions tick after both teams act. Guard remains active through these ticks,
 // then expires before the next team's action selection.
 endOfTeamTurn(log);
 battle.guards={};battle.enemyGuards={};
 if(!battle.enemies.some(p=>p.hp>0))return endBattle(true,log.join(' ')+' Victory!',true);
 if(!s.party.some(p=>p.hp>0))return blackout();
 battle.enemySlots=battle.enemySlots.filter(i=>battle.enemies[i]?.hp>0);
 refillEnemyTeam();refillAllyTeam(log);
 battle.lastTurnLog=log.slice(-30);
 battle.turn++;battle.acting=0;battle.phase='choose';battle.uiMenu='root';
 save();
 renderBattle(log.slice(-3).join(' '));
}
function capture(){if(battle&&battle.kind==='wild')queueBattleAction({kind:'capture'})}

// v30 Evolution progression. Chains are authored in data/critters.json.
// Evolutions consume no items or credits, cannot affect opponents, and
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

function experienceToNextLevel(p){return Math.max(12,(p?.level||1)*12)}
function nextLevelMove(p){
 const spec=speciesFor(p);
 return registeredLearnset(spec).find(e=>e.level>p.level&&validMove(e.moveId))||null;
}
function awardExperience(p,xp){
 if(!p)return [];
 const events=[];
 p.xp=Math.max(0,Number.isFinite(p.xp)?p.xp:0)+Math.max(0,Math.floor(xp));
 // Existing level requirements and health growth remain unchanged.
 while(p.xp>=experienceToNextLevel(p)){
  p.xp-=experienceToNextLevel(p);
  p.level++;
  p.maxHp+=4;
  p.hp=Math.min(p.maxHp,p.hp+4);
  events.push((p.name||p.type)+' reached Lv '+p.level+'!');
  const learned=gainLevelMoves(p);
  if(learned.length)events.push((p.name||p.type)+' learned '+learned.join(', ')+'.');
  const evolved=tryEvolveChain(p);
  for(const result of evolved)events.push(result.from+' evolved into '+result.to+'!');
 }
 return events;
}
function endBattle(won,message,defeated){
 const b=battle;battle=null;$('close').hidden=false;
 if(b.kind==='tutorial'){s.introComplete=true;s.party.forEach(p=>{p.hp=p.maxHp;p.status='';refillMovePP(p)})}
 else if(defeated&&won){s.money+=b.award||0;if(b.id&&b.id!=='tutorial')s.defeated[b.id]=true;
  if(b.id==='leader'&&!s.badges){s.badges=1;s.cut=true;message+=' You earned your first badge! The Critter Index vegetation cutter is now unlocked.'}
 }
 else if(!won){s.money=Math.max(0,s.money-Math.floor(s.money*0.1));s.party.forEach(p=>p.hp=p.maxHp);s.area='town';s.x=17;s.y=15;build()}
 const evolveMessages=evolutionNotification();
 const captureVisual=won&&b.kind==='wild'&&message.startsWith('Capture successful!')
  ?'<div class="captureCelebration" aria-label="Critter captured"><div class="captureWatch">⌚</div><span class="captureBeam"></span><span class="captureSpark">✦</span><strong>CAPTURE REGISTERED</strong></div>':'';
 save();open(won?'Battle Complete':'Defeated',captureVisual+'<p>'+message+'</p>'+evolveMessages+(b.kind==='tutorial'?'<p>The researcher heals both starters. No money penalty applies.</p>':'')+'<button class="btn primary" id="battleDone">Continue</button>');
 $('battleDone').onclick=()=>{close();if(b.kind==='tutorial')say(['Researcher: Excellent! Your team is fully healed.','Travel east to Route 1 and walk in rice fields to find wild Critters.','Lower wild Critters’ HP before using the Index capture beam.']);if(b.id==='leader')build()}
}
function blackout(){
 const wasTutorial=battle?.kind==='tutorial';battle=null;$('close').hidden=false;
 if(!wasTutorial)s.money=Math.max(0,s.money-Math.floor(s.money*0.1));s.party.forEach(p=>p.hp=p.maxHp);
 if(wasTutorial){s.introComplete=true;s.area='lab';s.x=17;s.y=14;s.party.forEach(p=>refillMovePP(p))}else{s.area=s.lastCenter||'village';s.x=s.area==='garden'?14:17;s.y=s.area==='garden'?14:s.area==='town'?15:16}build();save();
 open('Blackout','<p>'+(wasTutorial?'Your friendly tutorial match ended. The researcher healed your starter without a penalty.':'Your whole party fainted. You lost a little money and recovered at your last Critter Center.')+'</p><button class="btn primary" id="blackoutDone">Continue</button>');$('blackoutDone').onclick=close
}
function center(){
 s.lastCenter=s.area;s.party.forEach(p=>{p.hp=p.maxHp;p.status='';refillMovePP(p)});save();
 open('Critter Center','<p>Your Critters were fully healed! The technician can also manage party storage and install modules.</p><div class="options"><button class="btn" id="manageParty">Manage Party / Home Storage</button><button class="btn" id="manageModules">Install Critter Index Modules</button><button class="btn" id="centerDone">Leave</button></div>');
 $('manageParty').onclick=manageParty;$('manageModules').onclick=manageModules;$('centerDone').onclick=close
}
// Center-only storage browser. Filters are ephemeral UI state, not save data.
let centerStorageSearch='',centerStorageSort='recent',centerStoragePage=0,centerSwapSlot=0;
const CENTER_STORAGE_PAGE_SIZE=16;
function manageParty(){
 const partyCount=s.party.length;
 centerSwapSlot=Math.max(0,Math.min(centerSwapSlot,partyCount-1));
 const list=s.party.map((p,i)=>'<div class="centerPartyRow"><b>Slot '+(i+1)+': '+escapeHtml(p.name||p.type)+' · Lv '+p.level+'</b> <small>'+escapeHtml(defendTypes(p).join('/'))+' · HP '+p.hp+'/'+p.maxHp+'</small> '
  +'<button class="btn" data-party-up="'+i+'" '+(!i?'disabled':'')+'>↑</button> '
  +'<button class="btn" data-party-down="'+i+'" '+(i===partyCount-1?'disabled':'')+'>↓</button> '
  +'<button class="btn" data-store="'+i+'" '+(partyCount<=1?'disabled':'')+'>Send Home</button></div>').join('');
 const term=centerStorageSearch.trim().toLowerCase();
 const matching=s.storage.map((p,i)=>({p,i})).filter(({p})=>!term||
  (p.name||p.type||'').toLowerCase().includes(term)||defendTypes(p).some(t=>t.toLowerCase().includes(term))||
  String(p.level).includes(term));
 if(centerStorageSort==='name')matching.sort((a,b)=>(a.p.name||a.p.type).localeCompare(b.p.name||b.p.type)||a.i-b.i);
 if(centerStorageSort==='level')matching.sort((a,b)=>b.p.level-a.p.level||a.i-b.i);
 const pages=Math.max(1,Math.ceil(matching.length/CENTER_STORAGE_PAGE_SIZE));
 centerStoragePage=Math.max(0,Math.min(centerStoragePage,pages-1));
 const selected=matching.slice(centerStoragePage*CENTER_STORAGE_PAGE_SIZE,(centerStoragePage+1)*CENTER_STORAGE_PAGE_SIZE);
 const stored=selected.map(({p,i})=>'<div class="centerPartyRow"><b>'+escapeHtml(p.name||p.type)+' · Lv '+p.level+'</b> <small>'+escapeHtml(defendTypes(p).join('/'))+' · HP '+p.hp+'/'+p.maxHp+'</small> '
  +'<button class="btn" data-retrieve="'+i+'" '+(partyCount>=PARTY_LIMIT?'disabled':'')+'>Add to Party</button> '
  +'<button class="btn" data-swap-storage="'+i+'" '+(!partyCount?'disabled':'')+'>Swap</button></div>').join('')
  ||'<p class="muted">No stored Critters match your search.</p>';
 const partySlots=s.party.map((p,i)=>'<option value="'+i+'" '+(i===centerSwapSlot?'selected':'')+'>Slot '+(i+1)+': '+escapeHtml(p.name||p.type)+'</option>').join('');
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
  const i=Number(b.dataset.store);if(s.party.length<=1||i<0||i>=s.party.length)return;
  s.storage.push(s.party.splice(i,1)[0]);save();manageParty()
 });
 document.querySelectorAll('[data-retrieve]').forEach(b=>b.onclick=()=>{
  const i=Number(b.dataset.retrieve);if(s.party.length>=PARTY_LIMIT||i<0||i>=s.storage.length)return;
  s.party.push(s.storage.splice(i,1)[0]);save();manageParty()
 });
 document.querySelectorAll('[data-swap-storage]').forEach(b=>b.onclick=()=>{
  const i=Number(b.dataset.swapStorage),slot=centerSwapSlot;
  if(!Number.isInteger(i)||!Number.isInteger(slot)||!s.storage[i]||!s.party[slot])return;
  [s.party[slot],s.storage[i]]=[s.storage[i],s.party[slot]];
  save();manageParty();
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
  s.installed.push(n);save();manageModules();
 });
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{
  const i=Number(b.dataset.remove);if(!Number.isInteger(i)||i<0||i>=s.installed.length)return;
  s.installed.splice(i,1);save();manageModules()
 });
 $('modulesBack').onclick=center
}
function shop(){
 const supplies=[['Potion',30],['Revive',90]];
 const modules=[['Power Coil',120],['Guard Plate',120],['Weakening Field',150]];
 // Shops sell stones directly into the Critter Index bag, not module sockets.
 const stones=EVOLUTION_STONE_TYPES.map(type=>[type+' Stone',220]);
 const goods=[...supplies,...modules,...stones];
 const section=(title,items)=>'<h3>'+title+'</h3><div class="options">'
  +items.map(([name,price])=>'<button class="btn" data-buy="'+escapeHtml(name)+'" '+(s.money<price?'disabled':'')+'>'
   +escapeHtml(name)+' — '+price+' ◇'+(EVOLUTION_STONES[name]?' · Owned '+(s.inventory[name]||0):'')+'</button>').join('')+'</div>';
 open('Critter Shop','<p>Credits: '+s.money+' ◇</p>'
  +section('Healing items',supplies)+section('Index modules',modules)
  +section('Evolution stones',stones)
  +'<p class="muted">Evolution stones are used from the Critter Index Party screen after the required level is reached. Each successful stone evolution consumes one stone. Modules are installed at a Critter Center.</p>');
 document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{
  const name=b.dataset.buy,entry=goods.find(g=>g[0]===name);
  if(!entry||s.money<entry[1])return;
  s.money-=entry[1];
  if(modules.some(g=>g[0]===name))s.modules.push(name);
  else s.inventory[name]=(s.inventory[name]||0)+1;
  save();shop();
 });
}
function preview(id,g){const im=sprites[g],c=$(id),p=c.getContext('2d');p.imageSmoothingEnabled=false;function draw(){if(!im.naturalWidth)return;const m=spriteMetrics(g)?.[0]?.[0];if(!m)return;p.clearRect(0,0,c.width,c.height);const k=Math.min(c.width/(m.sw+10),c.height/(m.sh+8));p.drawImage(im,m.sx,m.sy,m.sw,m.sh,(c.width-m.sw*k)/2,c.height-m.sh*k-4,m.sw*k,m.sh*k)}im.addEventListener('load',draw);draw()}
preview('malePreview','male');preview('femalePreview','female');
$('new').onclick=()=>show('selection');
$('continue').onclick=()=>{backUpLegacySaveBeforeMigration();s=read();if(!s)return;migrate();build();show('game')};
$('begin').onclick=()=>{const name=$('playerName').value.trim().replace(/\s+/g,' ');if(!name){$('error').textContent='Please enter a name.';return}
 s={name,gender:document.querySelector('.character.selected').dataset.gender,area:'village',x:17,y:16,face:'down',steps:0,starter:null,party:[],storage:[],inventory:{Potion:4,Revive:1},modules:[],installed:[],badges:0,defeated:{},puzzles:{},money:250,version:4};
 save();build();show('game');say(['Welcome, '+name+'!','Use the left joystick to move and Talk / Use to interact.','Visit the northeast laboratory to receive your starter and Critter Index.'])};
document.querySelectorAll('.character').forEach(b=>b.onclick=()=>{document.querySelectorAll('.character').forEach(c=>c.classList.remove('selected'));b.classList.add('selected')});
$('index2').onclick=index;$('save').onclick=()=>{save();say(['Your adventure has been saved.'])};$('talk').onclick=interact;$('dialog').onclick=advance;$('close').onclick=close;
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;const d={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'}[e.code];if(d){e.preventDefault();held[d]=true;if(Date.now()-last>120){move(d);last=Date.now()}}else if(['KeyE','Enter','Space'].includes(e.code)&&!modal){e.preventDefault();interact()}else if(e.code==='KeyI'&&!modal)index();else if(e.code==='Escape'&&modal&&!battle)close()});
window.addEventListener('keyup',e=>{const d={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'}[e.code];if(d)held[d]=false});// Mobile joystick uses a pointer captured by the joystick base; keyboard controls stay unchanged.
const stick=$('joystick'),thumb=$('joystickThumb');
let stickPointer=null,stickDirection=null,stickActive=false,stickRepeatAt=0;
function positionStick(dx=0,dy=0){
 thumb.style.transform='translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px)';
}
function endStick(pointerId){
 if(pointerId!==undefined&&stickPointer!==pointerId)return;
 stickPointer=null;stickDirection=null;stickActive=false;stickRepeatAt=0;
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
 if(distance<Math.min(r.width,r.height)*0.18){stickDirection=null;return}
 const next=Math.abs(dx)>=Math.abs(dy)?(dx>=0?'right':'left'):(dy>=0?'down':'up');
 if(next!==stickDirection){stickDirection=next;stickRepeatAt=0}
}
stick.addEventListener('pointerdown',e=>{
 if(screen!=='game'||modal||stickPointer!==null)return;
 if(e.pointerType==='mouse'&&e.button!==0)return;
 e.preventDefault();
 stickPointer=e.pointerId;stickActive=true;stickRepeatAt=0;stick.classList.add('active');
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
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseMovement();if(s&&screen==='game')save()}});
window.addEventListener('pagehide',()=>{releaseMovement();if(s&&screen==='game')save()});

document.addEventListener('touchmove',e=>{
 if(screen==='game'&&!e.target.closest('#shade'))e.preventDefault();
},{passive:false});
document.addEventListener('gesturestart',e=>{if(screen==='game')e.preventDefault()},{passive:false});
window.addEventListener('resize',()=>{if(screen==='game')resizeGameCanvas()});
if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>{if(screen==='game')resizeGameCanvas()});
if(read()?.name)$('continue').hidden=false;
function loop(){if(screen==='game'){finishDoorAnimation();if(stickActive&&stickDirection&&!modal&&!$('dialog').classList.contains('show')&&Date.now()>=stickRepeatAt){move(stickDirection);stickRepeatAt=Date.now()+135;last=Date.now()}else if(!stickActive){for(const d of ['up','down','left','right'])if(held[d]&&Date.now()-last>145){move(d);last=Date.now();break}}draw()}requestAnimationFrame(loop)}
loadCritterMoveData();
requestAnimationFrame(loop);
})();
