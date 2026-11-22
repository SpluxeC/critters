import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const game=readFileSync(new URL('../game.js',import.meta.url),'utf8');
const species=JSON.parse(readFileSync(new URL('../data/critters.json',import.meta.url),'utf8')).species;
const moves=JSON.parse(readFileSync(new URL('../data/moves.json',import.meta.url),'utf8')).moves;

function extract(start,end,context){
 const at=game.indexOf(start),finish=game.indexOf(end,at);
 assert.ok(at>=0&&finish>at,'Expected game function boundaries '+start);
 const sandbox=vm.createContext(context);
 vm.runInContext(game.slice(at,finish),sandbox);
 return sandbox;
}
const stones=['Grass','Water','Fire','Rock','Electric','Ice','Flying','Shadow','Ghost','Venom','Psychic','Fighting','Normal','Steel','Ground'];
test('game source parses',()=>assert.doesNotThrow(()=>new Function(game)));
test('species, moves, and evolution links have valid IDs',()=>{
 assert.equal(species.length,209);
 assert.equal(moves.length,315);
 const speciesIds=new Set(species.map(s=>s.speciesId));
 const moveIds=new Set(moves.map(m=>m.id).concat('opening-flick','brace-up'));
 assert.equal(speciesIds.size,species.length);
 assert.equal(new Set(moves.map(m=>m.id)).size,moves.length);
 for(const sp of species){
  assert.ok(sp.habitats.length>=1,sp.name+' has no home habitat');
  assert.ok(sp.habitats.every(h=>Number.isFinite(h.minLevel)&&Number.isFinite(h.maxLevel)&&h.minLevel<=h.maxLevel));
  for(const learn of sp.levelUp||[])assert.ok(moveIds.has(learn.moveId),sp.name+' has unknown move '+learn.moveId);
  if(!sp.evolvesTo)continue;
  assert.ok(speciesIds.has(sp.evolvesTo.speciesId),sp.name+' has missing evolution');
  assert.ok(Number.isInteger(sp.evolvesTo.minLevel)&&sp.evolvesTo.minLevel>=1);
  if(sp.evolvesTo.stone)assert.ok(stones.some(t=>t+' Stone'===sp.evolvesTo.stone),sp.name+' has unknown evolution stone');
 }
 assert.equal(species.filter(sp=>sp.evolvesTo?.stone).length,15);
});
test('capture odds stay bounded and favor weakened targets',()=>{
 const {captureChance}=extract('function captureChance(','function addCapturedCritter(',{});
 const full=captureChance({hp:100,maxHp:100});
 const low=captureChance({hp:1,maxHp:100});
 assert.equal(full,.14);
 assert.ok(low>full&&low<=.88);
 assert.equal(captureChance({hp:0,maxHp:0}),0);
});
test('eighth party slot is the limit, extra captures go home',()=>{
 const s={party:Array.from({length:7},(_,i)=>({slot:i})),storage:[]};
 const {addCapturedCritter}=extract('function addCapturedCritter(','function performPlayerAction(',{s,PARTY_LIMIT:8});
 assert.equal(addCapturedCritter({name:'eighth'}),'Party');
 assert.equal(s.party.length,8);
 assert.equal(addCapturedCritter({name:'ninth'}),'Home');
 assert.equal(s.party.length,8);
 assert.equal(s.storage.length,1);
});
test('stone evolutions need the level and a stone; badge conditions stack',()=>{
 const s={inventory:{'Ground Stone':1,'Steel Stone':1},badges:0,area:'town'};
 const {evolutionReady}=extract('function evolutionReady(','function registerEvolution(',{
  s,evolutionRule:p=>p.rule,evolutionTarget:r=>r.target,
  EVOLUTION_STONES:{'Ground Stone':'Ground','Steel Stone':'Steel'},worldHour:()=>12
 });
 const ground={speciesId:'a',hp:10,level:11,rule:{minLevel:12,stone:'Ground Stone',target:{speciesId:'b',types:['Ground']}}};
 assert.equal(evolutionReady(ground,true),false);
 ground.level=12;
 assert.equal(evolutionReady(ground,false),false);
 assert.equal(evolutionReady(ground,true),true);
 s.inventory['Ground Stone']=0;
 assert.equal(evolutionReady(ground,true),false);
 const steel={speciesId:'c',hp:10,level:23,rule:{minLevel:23,stone:'Steel Stone',condition:{kind:'badge',minimum:1},target:{speciesId:'d',types:['Steel']}}};
 assert.equal(evolutionReady(steel,true),false);
 s.badges=1;
 assert.equal(evolutionReady(steel,true),true);
});
test('side quests count only captures since accepting and landmarks when found',()=>{
 const s={sideQuests:{field:{status:'active',baseline:3},shrine:{status:'active'}},questCaptureCounts:{route1:4},discoveries:{}};
 const {sideQuestProgress,sideQuestGoal}=extract('function sideQuestProgress(','function sideQuestRewardLabel(',{s});
 const field={id:'field',kind:'captures',captureArea:'route1',required:2};
 const shrine={id:'shrine',kind:'landmark',landmark:'exp-forest'};
 assert.equal(sideQuestProgress(field),1);
 assert.equal(sideQuestGoal(field),2);
 s.questCaptureCounts.route1=5;
 assert.equal(sideQuestProgress(field),2);
 assert.equal(sideQuestProgress(shrine),0);
 s.discoveries['exp-forest']=true;
 assert.equal(sideQuestProgress(shrine),1);
});
test('Last Resort never writes itself into the learned move slots',()=>{
 assert.ok(game.includes('const fallback=moveId===\'opening-flick\''));
 assert.ok(!game.includes('actor.moves=[moveId,...actor.moves]'));
});

test('classic battle menus keep the three choices, move overlay and Index actions',()=>{
 const start=game.indexOf('function renderBattle(message){');
 const finish=game.indexOf('\nfunction queueBattleAction(',start);
 assert.ok(start>=0&&finish>start,'Battle renderer exists');
 const s={party:[{name:'Tester',type:'Water',level:8,hp:20,maxHp:30,moves:['tide-splash'],movePP:{'tide-splash':10}}],inventory:{Potion:2,Revive:0}};
 const battle={phase:'choose',uiMenu:'root',allySlots:[0],enemySlots:[0],enemies:[{name:'Wildling',type:'Grass',hp:30,maxHp:35}],pending:[],acting:0,kind:'wild',mode:1,turn:1,feedback:'A wild Critter appeared!'};
 let screen='';
 const context={battle,s,
  activeEnemies:()=>[0],activeAllies:()=>[0],normalizeMoves:()=>{},
  validMove:id=>id==='tide-splash'?{id,name:'Tide Splash',type:'Water',target:'enemy',category:'special',power:40,pp:15}:null,
  getMove:()=>({name:'Tide Splash',type:'Water',target:'enemy',category:'special',power:40,pp:15}),
  escapeHtml:v=>String(v),battleHeader:v=>'<div class="combatArena">'+v+'</div>',battleMessage:v=>v||'',
  recentBattleLog:()=>'',earlyBattleTip:()=>'',open:(title,html)=>{screen=html},
  $:()=>({hidden:false}),document:{querySelectorAll:()=>[]},
  captureChance:()=>.5,itemQty:()=>2,queueBattleAction:()=>{},selectPoke:()=>{},selectRevive:()=>{}};
 const sandbox=vm.createContext(context);
 vm.runInContext(game.slice(start,finish),sandbox);
 sandbox.renderBattle();
 assert.match(screen,/id="menuBattle"/);assert.match(screen,/id="menuIndex"/);assert.match(screen,/id="menuEscape"/);
 assert.doesNotMatch(screen,/battleMovesAround/);
 battle.uiMenu='battle';sandbox.renderBattle();
 assert.match(screen,/battleMovesAround/);assert.match(screen,/Tide Splash/);
 assert.match(screen,/data-move-target="0"/);
 // Index is a separate full-screen watch; it should not be a small arena submenu.
 assert.match(game,/if\(\$\('menuIndex'\)\)\$\('menuIndex'\)\.onclick=openBattleIndex/);
 battle.uiMenu='root';battle.kind='trainer';sandbox.renderBattle();
 assert.match(screen,/id="menuEscape" disabled/);
});

test('battle environments use the actual map area, nearby tile and time',()=>{
 const start=game.indexOf('const BATTLE_AREAS=');
 const end=game.indexOf('function startBattle(data,msg){',start);
 assert.ok(start>=0&&end>start);
 const s={area:'route1',x:8,y:9},T={rice:6,tall:11,stone:16,flower:7,path:1,water:13};
 const tiles=Array.from({length:26},()=>Array(34).fill(0));tiles[9][8]=T.rice;
 const ctx=vm.createContext({s,tiles,T,worldPhase:()=> 'Dusk'});
 vm.runInContext(game.slice(start,end),ctx);
 const first=ctx.battleEnvironment();
 assert.equal(first.area,'route1');assert.equal(first.terrain,'rice');assert.equal(first.phase,'Dusk');
 s.area='lab';tiles[9][8]=T.path;
 const indoor=ctx.battleEnvironment();
 assert.equal(indoor.area,'lab');assert.equal(indoor.terrain,'path');
 // An earlier battle snapshot must not change when the player enters a building.
 assert.equal(first.area,'route1');assert.equal(first.terrain,'rice');
 s.area='cave';tiles[9][8]=T.stone;
 assert.equal(ctx.battleEnvironment().terrain,'stone');
});
test('all overworld and interior arenas have specific visual variants',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const area of ['village','route1','town','route2','forest','route3','cave','garden','gym','lab','home','neighbor']){
  assert.ok(html.includes('.arena-'+area),area+' is missing battle scenery CSS');
 }
 assert.match(game,/environment:battleEnvironment\(\)/);
 assert.match(game,/battleEnvironmentClass\(\)/);
});

test('all eight approved cinematic battle scenes are self-contained and assigned to the right areas',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const files=['rice-fields','bamboo-forest','hidden-forest','mountain-foothills','mountain-cave','town-garden','grass-gym','research-lab'];
 const classes=['rice','bamboo','hidden-forest','foothills','cave','town','gym','laboratory'];
 for(let i=0;i<files.length;i++){
  const path=new URL('../assets/battle-scenes/'+files[i]+'.svg',import.meta.url);
  const asset=readFileSync(path,'utf8');
  assert.match(asset,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(asset,/href="data:image\/(?:jpeg|png);base64,/);
  assert.ok(asset.length>50000,files[i]+' should contain an actual painted scene');
  assert.ok(html.includes('assets/battle-scenes/'+files[i]+'.svg'),files[i]+' CSS reference missing');
  assert.ok(html.includes('.scene-'+classes[i]),classes[i]+' CSS class missing');
 }
 const start=game.indexOf('const BATTLE_SCENE_ART=');
 const end=game.indexOf('function battleHeader(',start);
 assert.ok(start>=0&&end>start);
 const battle={environment:{area:'route1',terrain:'rice',phase:'Day'}};
 const ctx=vm.createContext({battle});
 vm.runInContext(game.slice(start,end),ctx);
 const mapping={village:'rice',route1:'rice',route2:'bamboo',forest:'hidden-forest',route3:'foothills',
  cave:'cave',town:'town',garden:'town',gym:'gym',lab:'laboratory'};
 for(const [area,art] of Object.entries(mapping)){
  battle.environment.area=area;
  assert.ok(ctx.battleEnvironmentClass().includes('scene-image scene-'+art),area+' mapped incorrectly');
 }
 battle.environment.area='home';
 assert.ok(!ctx.battleEnvironmentClass().includes('scene-image'),'unillustrated home keeps existing indoor fallback');
 assert.ok(html.includes('background-size:113% auto'),'rice field gets requested closer framing');
 assert.ok(html.includes('background-size:112% auto'),'bamboo gets requested closer framing');
});

test('opening and closing the full-screen Index preserves the current battle turn',()=>{
 const start=game.indexOf('function battleIndexActive(){');
 const end=game.indexOf('function indexParty(){',start);
 assert.ok(start>=0&&end>start);
 const battle={phase:'choose',turn:3,pending:[{actor:0,kind:'move'}],acting:1,uiMenu:'root',indexOpen:false};
 let indexRenders=0,battleRenders=0;
 const context=vm.createContext({battle,renderIndex:()=>{indexRenders++},renderBattle:()=>{battleRenders++}});
 vm.runInContext("let indexTab='clock',indexSelection=0;"+game.slice(start,end),context);
 context.openBattleIndex();
 assert.equal(battle.indexOpen,true);
 assert.equal(battle.acting,1);assert.equal(battle.turn,3);
 assert.equal(battle.pending.length,1);
 assert.equal(indexRenders,1);
 context.returnFromBattleIndex();
 assert.equal(battle.indexOpen,false);
 assert.equal(battle.uiMenu,'root');
 assert.equal(battle.acting,1);assert.equal(battle.turn,3);
 assert.equal(battle.pending.length,1);
 assert.equal(battleRenders,1);
});
test('battle Index provides real battle actions and takes over the screen',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const selector of ['#shade:has(.combatTop) .modal','#shade:has(.battleIndexShell) .modal',
  '.classicMainMenu','#shade:has(.combatTop) .combatArena','#shade .battleIndexShell']){
  assert.ok(html.includes(selector),selector+' full-screen CSS missing');
 }
 assert.match(game,/id="watchReturnBattle"/);
 assert.match(game,/data-index-battle-switch=/);
 assert.match(game,/id="watchBattlePotion"/);
 assert.match(game,/id="watchBattleRevive"/);
 assert.match(game,/id="watchCaptureBattle"/);
 assert.match(game,/battle.indexOpen=false;queueBattleAction/);
});

test('Critter species IDs are the Index numbers with starter families first',()=>{
 assert.equal(species.length,209);
 const idSet=new Set(species.map(sp=>sp.speciesId));
 for(let i=0;i<species.length;i++){
  const sp=species[i],expected='cr-'+String(i+1).padStart(3,'0')+'-';
  assert.ok(sp.speciesId.startsWith(expected),'wrong ID at '+(i+1)+' '+sp.name);
  assert.equal(Object.hasOwn(sp,'number'),false,'no separate display number allowed');
  assert.ok(sp.legacySpeciesId,'old ID alias missing for save migration');
  if(sp.evolvesTo){
   assert.ok(idSet.has(sp.evolvesTo.speciesId));
   const to=species.find(x=>x.speciesId===sp.evolvesTo.speciesId);
   assert.equal(to.evolvesFrom,sp.speciesId,'evolution link not reciprocal');
   assert.equal(species.indexOf(to),i+1,'evolved form must immediately follow');
  }
 }
 assert.deepEqual(species.slice(0,9).map(sp=>sp.types[0]),[
  'Water','Water','Water','Rock','Rock','Rock','Electric','Electric','Electric']);
 assert.equal(species.filter(x=>x.starterFamily).length,9);
 assert.equal(species.filter(x=>x.starterFamily==='Water').length,3);
 assert.equal(species.filter(x=>x.starterFamily==='Rock').length,3);
 assert.equal(species.filter(x=>x.starterFamily==='Electric').length,3);
 for(const [t,id] of [['Water','starter-water-tidal-heart'],['Rock','starter-rock-bedrock-vow'],['Electric','starter-electric-storm-promise']]){
  const sig=moves.find(x=>x.id===id);
  assert.ok(sig&&sig.type===t,'missing signature move for '+t);
  assert.ok(species.filter(x=>x.starterFamily===t).every(x=>x.levelUp.some(l=>l.moveId===id)),'signature not learnable by all '+t+' forms');
  assert.ok(species.filter(x=>x.starterFamily!==t).every(x=>!x.levelUp.some(l=>l.moveId===id)),'signature move leaked to another family');
 }
});
test('legacy saves migrate every old species ID to the authoritative new ID',()=>{
 const start=game.indexOf('function migrateSpeciesIds(){');
 const end=game.indexOf('const moveRegistry=',start);
 assert.ok(start>=0&&end>start);
 const old=species.find(sp=>sp.legacySpeciesId.startsWith('cr-001-'));
 const s={
  party:[{speciesId:old.legacySpeciesId,level:15,evolutionHistory:[{from:old.legacySpeciesId,to:old.legacySpeciesId}]}],
  storage:[{speciesId:old.legacySpeciesId,level:12}],
  captureLog:[{speciesId:old.legacySpeciesId,type:'Grass'}],
  collection:{seen:{[old.legacySpeciesId]:{firstArea:'route2'}},caught:{[old.legacySpeciesId]:{firstArea:'route2',evolvedFrom:old.legacySpeciesId}}},
  evolutionNews:[{fromId:old.legacySpeciesId,toId:old.legacySpeciesId}]
 };
 const speciesRegistry=new Map(species.map(sp=>[sp.speciesId,sp]));
 const context=vm.createContext({s,speciesRegistry,STARTER_SPECIES_IDS:{Water:'cr-001-starter-water-1'}});
 vm.runInContext(game.slice(start,end),context);
 context.migrateSpeciesIds();
 assert.equal(s.party[0].speciesId,old.speciesId);
 assert.equal(s.storage[0].speciesId,old.speciesId);
 assert.equal(s.captureLog[0].speciesId,old.speciesId);
 assert.equal(s.party[0].evolutionHistory[0].from,old.speciesId);
 assert.equal(s.collection.seen[old.speciesId].firstArea,'route2');
 assert.equal(s.collection.caught[old.speciesId].evolvedFrom,old.speciesId);
 assert.equal(s.evolutionNews[0].toId,old.speciesId);
 assert.equal(s.collection.seen[old.legacySpeciesId],undefined);
 context.migrateSpeciesIds();
 assert.equal(Object.keys(s.collection.seen).length,1,'migration must be idempotent');
});
