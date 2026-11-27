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
  assert.ok(Array.isArray(sp.habitats),sp.name+' has invalid habitats');
  if(!sp.habitats.length)assert.ok(sp.catalogOnly||['cr-011-falrift','cr-012-falgrath','cr-014-mothoxin'].includes(sp.speciesId),sp.name+' has no home habitat');
  assert.ok(sp.habitats.every(h=>Number.isFinite(h.minLevel)&&Number.isFinite(h.maxLevel)&&h.minLevel<=h.maxLevel));
  for(const learn of sp.levelUp||[])assert.ok(moveIds.has(learn.moveId),sp.name+' has unknown move '+learn.moveId);
  if(!sp.evolvesTo)continue;
  assert.ok(speciesIds.has(sp.evolvesTo.speciesId),sp.name+' has missing evolution');
  assert.ok(Number.isInteger(sp.evolvesTo.minLevel)&&sp.evolvesTo.minLevel>=1);
  if(sp.evolvesTo.stone)assert.ok(stones.some(t=>t+' Stone'===sp.evolvesTo.stone),sp.name+' has unknown evolution stone');
 }
 assert.equal(species.filter(sp=>sp.evolvesTo?.stone).length,11); // Current catalog; do not restore superseded evolution rules.
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
 const start=game.indexOf('function battleMainActions(mode){');
 const finish=game.indexOf('\nfunction queueBattleAction(',start);
 assert.ok(start>=0&&finish>start,'Battle renderer exists');
 const s={party:[{name:'Tester',type:'Water',level:8,hp:20,maxHp:30,moves:['tide-splash'],movePP:{'tide-splash':10}}],inventory:{Potion:2,Revive:0}};
 const battle={phase:'choose',uiMenu:'root',allySlots:[0],enemySlots:[0],enemies:[{name:'Wildling',type:'Grass',hp:30,maxHp:35}],pending:[],acting:0,kind:'wild',mode:1,turn:1,feedback:'A wild Critter appeared!'};
 let screen='';
 const context={battle,s,
  activeEnemies:()=>[0],activeAllies:()=>[0],normalizeMoves:()=>{},
  validMove:id=>id==='tide-splash'?{id,name:'Tide Splash',type:'Water',target:'enemy',category:'special',power:40,pp:15}:null,
  getMove:()=>({name:'Tide Splash',type:'Water',target:'enemy',category:'special',power:40,pp:15}),
  escapeHtml:v=>String(v),battleHeader:v=>'<div class="combatArena">'+v+'</div>',battleMessage:v=>v||'',attachCombatNarrator:()=>{},
  recentBattleLog:()=>'',earlyBattleTip:()=>'',open:(title,html)=>{screen=html},
  $:()=>({hidden:false}),document:{querySelectorAll:()=>[]},
  captureChance:()=>.5,itemQty:()=>2,queueBattleAction:()=>{},selectPoke:()=>{},selectRevive:()=>{}};
 const sandbox=vm.createContext(context);
 vm.runInContext(game.slice(start,finish),sandbox);
 sandbox.renderBattle();
 assert.match(screen,/id="menuBattle"/);assert.match(screen,/id="menuUse"/);assert.match(screen,/id="menuCritters"/);assert.match(screen,/id="menuEscape"/);
 assert.doesNotMatch(screen,/battleMovesAround/);
 battle.uiMenu='battle';sandbox.renderBattle();
 assert.match(screen,/battleMovesAround/);assert.match(screen,/Tide Splash/);
 assert.match(screen,/id="menuBattle" aria-pressed="true">Attack<\/button>/);
 assert.doesNotMatch(screen,/classicSubmenu|id="battleGuard"|id="battleFocus"|Choose a move/);
 assert.match(screen,/data-move-target="0"/);
 // Index is a separate full-screen watch; it should not be a small arena submenu.
 assert.match(game,/openBattleIndex\('items'\)/);
 assert.match(game,/openBattleIndex\('clock'\)/);
 battle.uiMenu='root';battle.kind='trainer';sandbox.renderBattle();
 assert.match(screen,/id="menuEscape" disabled/);
});

test('battle environments use the actual map area, nearby tile and time',()=>{
 const start=game.indexOf('const BATTLE_AREAS=');
 const end=game.indexOf('function startBattle(data,msg){',start);
 assert.ok(start>=0&&end>start);
 const s={area:'route1',x:8,y:9},T={rice:6,tall:11,stone:16,flower:7,path:1,water:13};
 const tiles=Array.from({length:26},()=>Array(34).fill(0));tiles[9][8]=T.rice;
 const ctx=vm.createContext({s,tiles,T,SECRET_AREAS:{},worldPhase:()=> 'Dusk'});
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
 assert.match(game,/beamBattleButton\('watchBattleBeam'\)/);
 assert.match(game,/battle.indexOpen=false;queueBattleAction/);
});

test('Critter species IDs are the Index numbers with starter families first',()=>{
 assert.equal(species.length,209);
 const idSet=new Set(species.map(sp=>sp.speciesId));
 for(let i=0;i<species.length;i++){
  const sp=species[i],expected='cr-'+String(i+1).padStart(3,'0')+'-';
  assert.ok(sp.speciesId.startsWith(expected),'wrong ID at '+(i+1)+' '+sp.name);
  assert.equal(Object.hasOwn(sp,'number'),false,'no separate display number allowed');
  if(i<209)assert.ok(sp.legacySpeciesId,'old ID alias missing for save migration');
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
 const old=species.find(sp=>sp.legacySpeciesId?.startsWith('cr-')&&sp.legacySpeciesId!==sp.speciesId&&!species.some(other=>other.speciesId===sp.legacySpeciesId));
 const s={
  party:[{speciesId:old.legacySpeciesId,level:15,evolutionHistory:[{from:old.legacySpeciesId,to:old.legacySpeciesId}]}],
  storage:[{speciesId:old.legacySpeciesId,level:12}],
  captureLog:[{speciesId:old.legacySpeciesId,type:'Grass'}],
  collection:{seen:{[old.legacySpeciesId]:{firstArea:'route2'}},caught:{[old.legacySpeciesId]:{firstArea:'route2',evolvedFrom:old.legacySpeciesId}}},
  evolutionNews:[{fromId:old.legacySpeciesId,toId:old.legacySpeciesId}]
 };
 const speciesRegistry=new Map(species.map(sp=>[sp.speciesId,sp]));
 const context=vm.createContext({s,speciesRegistry,STARTER_SPECIES_IDS:{Water:'cr-001-starter-water-1'},isEgg:p=>p?.isEgg===true&&!!p.egg});
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

test('v56 hotfix never guesses a legacy starter from same type or party position',()=>{
 const start=game.indexOf('function migrateSpeciesIds(){');
 const end=game.indexOf('const moveRegistry=',start);
 assert.ok(start>=0&&end>start);
 const starterId='cr-001-starter-water-1';
 const s={starter:'Water',
  party:[{type:'Water',name:'Caught Water Critter',level:5,speciesId:null},
         {type:'Water',name:'Another Water Critter',level:10,speciesId:null}],
  storage:[{type:'Water',name:'Old unmarked starter',speciesId:null},
           {type:'Water',name:'Verified starter',speciesId:null,starterOrigin:true}],
  collection:{seen:{},caught:{}},captureLog:[]};
 const registry=new Map(species.map(sp=>[sp.speciesId,sp]));
 const sandbox=vm.createContext({s,speciesRegistry:registry,starterSpeciesId:()=>starterId,isEgg:p=>p?.isEgg===true&&!!p.egg});
 vm.runInContext(game.slice(start,end),sandbox);
 sandbox.migrateSpeciesIds();
 assert.equal(s.party[0].speciesId,null,'same-type catch in slot zero must not be rewritten');
 assert.equal(s.party[1].speciesId,null,'another same-type catch must not be rewritten');
 assert.equal(s.storage[0].speciesId,null,'unknown legacy starter in Home must not be guessed');
 assert.equal(s.storage[1].speciesId,starterId,'only explicitly marked starter can be upgraded');
 sandbox.migrateSpeciesIds();
 assert.equal(s.storage[1].speciesId,starterId,'migration remains idempotent');
});
test('hotfix snapshots the legacy save before Continue and marks future starters',()=>{
 assert.match(game,/backUpLegacySaveBeforeMigration\(\);s=read\(\)/);
 assert.match(game,/critters-v1-before-species-id-migration/);
 assert.match(game,/partner\.starterOrigin=true/);
 assert.doesNotMatch(game,/s\.party\.indexOf\(p\)===0\)p\.speciesId=starterSpeciesId/);
});

test('approved nine starters use their correct names, IDs, and local sprite assets',()=>{
 const expected=[["Drizzlet","assets/critters/starters/water.png"],["Riptalon","assets/critters/gallery/water-starter-stage-2.png"],["Tidalisk","assets/critters/gallery/water-starter-stage-3.png"],["Craglet","assets/critters/starters/rock.png"],["Granibuck","assets/critters/gallery/rock-starter-stage-2.png"],["Monolithorn","assets/critters/gallery/rock-starter-stage-3.png"],["Sparkin","assets/critters/starters/electric.png"],["Voltrix","assets/critters/gallery/electric-starter-stage-2.png"],["Tempestrike","assets/critters/gallery/electric-starter-stage-3.png"]];
 for(let i=0;i<9;i++){
  const sp=species[i];
  assert.equal(sp.name,expected[i][0]);
  assert.equal(sp.art.status,'ready');
  assert.equal(sp.art.spritePath,expected[i][1]);
  assert.ok(sp.speciesId.startsWith('cr-'+String(i+1).padStart(3,'0')+'-'));
  const png=readFileSync(new URL('../'+sp.art.spritePath,import.meta.url));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 }
});
test('starter sprite rendering is wired to battle, Index, and selection without changing other Critters',()=>{
 assert.match(game,/function critterSpriteTag\(/);
 assert.match(game,/critterSpriteTag\(p,'combatSprite'\)/);
 assert.match(game,/critterSpriteTag\(p,'watchPartySprite'\)/);
 assert.match(game,/critterSpriteTag\(sp,'speciesMiniSprite'\)/);
 assert.match(game,/critterSpriteTag\(sp,'speciesPortrait'\)/);
 assert.match(game,/class="starterChoiceSprite"/);
 assert.match(game,/partner\.starterOrigin=true/);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/\.combatFigure \.combatSprite/);
 assert.match(html,/\.starterChoices/);
});

test('joystick run/walk mode persists and changes movement cadence',()=>{
 const start=game.indexOf('const movementStepInterval=');
 const end=game.indexOf('function beginStep(',start);
 assert.ok(start>=0&&end>start);
 const s={movementMode:'run'};
 const state={labels:[],classes:[]};
 const stick={setAttribute:(k,v)=>state.labels.push([k,v]),classList:{toggle:(k,on)=>state.classes.push([k,on])}};
 let saves=0;
 const sandbox=vm.createContext({s,screen:'game',modal:false,$:()=>stick,save:()=>saves++,trainerApproachLocked:()=>false});
 vm.runInContext(game.slice(start,end)+'\nObject.assign(globalThis,{movementStepInterval,movementStepDuration});',sandbox);
 assert.equal(sandbox.movementStepInterval(),135);
 assert.equal(sandbox.movementStepDuration(),135);
 sandbox.toggleMovementMode();
 assert.equal(s.movementMode,'walk');
 assert.equal(sandbox.movementStepInterval(),235);
 assert.equal(sandbox.movementStepDuration(),235);

 sandbox.toggleMovementMode();
 assert.equal(s.movementMode,'run');

 assert.equal(saves,2);
});
test('portrait UI has joystick double-tap speed and contextual Interact',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/id="movementToggle"/);
 assert.match(html,/id="talk"[^>]*>Interact<\/button>/);
 assert.ok(!html.includes('Talk / Use</button>'));
 assert.match(game,/now-lastWorldTap\.time<=WORLD_DOUBLE_TAP_MS/);
 assert.match(game,/s\.movementMode=s\.movementMode==='walk'\?'run':'walk'/);
 assert.match(game,/stickRepeatAt=Date\.now\(\)\+movementStepInterval\(\)/);
 assert.match(game,/visual\.duration=movementStepDuration\(\)/);
});

test('v70 battle bag and 2x2 menu are wired to inventory and watch switching',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(game,/id="menuUse">Use<\/button>/);
 assert.match(game,/id="menuCritters">Critters<\/button>/);
 assert.match(game,/openBattleIndex\('items'\)/);
 assert.match(game,/openBattleIndex\('clock'\)/);
 assert.match(game,/case 'ppPotion'/);
 assert.match(game,/data-battle-pp-move/);
 assert.match(game,/watchBattleBeam/);
 assert.match(game,/\['PP Potion',45\]/);
 assert.match(html,/\.classicMainMenu \.classicCritters/);
 assert.match(html,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('v71 battle watch uses focused non-navigable bag and clock screens',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.doesNotMatch(game,/\['party','◇ Party'\]/);
 assert.match(game,/openBattleIndex\('items'\)/);
 assert.match(game,/openBattleIndex\('clock'\)/);
 assert.match(game,/battleViewing\?'':INDEX_TABS/);
 assert.match(game,/if\(battleIndexActive\(\)\)return battleTools/);
 assert.match(game,/data-index-battle-switch/);
 assert.match(game,/battleQuickView/);
 assert.match(html,/color:#080b10!important;border-color:#060e1c!important/);
});

test('v72 Attack uses move overlay without a Guard/Focus popup',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(game,/function battleMainActions\(mode\)/);
 assert.match(game,/battleMainActions\('battle'\)/);
 assert.match(game,/battleMainActions\('root'\)/);
 assert.match(game,/const next=mode==='battle'\?'root':'battle'/);
 assert.match(game,/id="menuBattle" aria-pressed=/);
 assert.doesNotMatch(game,/id="battleGuard"|id="battleFocus"/);
 assert.match(html,/color:#0b1016!important/);
});

test('v73 narrator stages attacks individually and exposes tap-to-finish typing',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(game,/async function resolveTeamTurn\(\)/);
 assert.match(game,/await narrateCombatEvents\(log.slice\(before\),fx\)/);
 assert.match(game,/function attachCombatNarrator\(\)/);
 assert.match(game,/if\(!state.typed\)finish\(\)/);
 assert.match(game,/combatNarratorTick=setInterval/);
 assert.match(game,/Choose a move…/);
 assert.match(game,/log.push\(name\+' uses '\+move.name/);
 assert.match(game,/log.push\('Super effective!'\)/);
 assert.match(game,/log.push\('Not very effective.'\)/);
 assert.match(html,/\.classicMainMenu \.btn,\s*#shade:has\(\.combatTop\) \.classicMainMenu \.classicCritters/);
});

test('v74 battle narrator advances automatically without resolving-turn popup',()=>{
 assert.match(game,/combatNarratorDelay=setTimeout\(\(\)=>/);
 assert.match(game,/\},1000\)/);
 assert.match(game,/state.scheduleAdvance\(\)/);
 assert.match(game,/if\(state.ready\)advance\(\)/);
 assert.doesNotMatch(game,/Resolving team turn…/);
 assert.doesNotMatch(game,/class="combatProcessing"/);
});

test('v75 overworld removes run toggle, canvas banner and top Save button',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/id="movementToggle"/);
 assert.doesNotMatch(html,/id="save"/);
 assert.doesNotMatch(html,/class="hud"><div>/);
 assert.doesNotMatch(game,/ctx\.fillText\(s\.name\+' · '/);
 assert.match(game,/now-lastWorldTap\.time<=WORLD_DOUBLE_TAP_MS/);
 assert.match(game,/WORLD_DOUBLE_TAP_MS=330/);
 assert.match(game,/function canInteractAhead\(\)/);
 assert.match(game,/function updateInteractVisibility\(\)/);
 assert.match(html,/\.actions #talk\.interactable/);
 assert.match(game,/Money: /);
 assert.doesNotMatch(game,/ credits!/);
});

test('inactive Interact and floating touch controls retain mobile affordances',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/#world\{touch-action:none/);
 assert.match(html,/id="talk"[^>]*>Interact<\/button>/);
 assert.match(game,/Double-tap an empty part of the overworld/);
 assert.match(html,/opacity:\.58!important/);
});

test('v77 player and encyclopedia tabs consolidate former root tabs',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(game,/const INDEX_TABS=\[\['clock','Index'\],\['player','Player'\],\['encyclopedia','Encyclopedia'\],\['settings','Settings'\]\]/);
 assert.match(game,/data-player-section/);
 assert.match(game,/data-encyclopedia-section/);
 assert.match(game,/function indexPlayer\(\)/);
 assert.match(game,/function indexEncyclopedia\(\)/);
 assert.match(game,/indexTab==='encyclopedia'\?indexEncyclopedia\(\)/);
 assert.doesNotMatch(game,/class="watchStatus"/);
 assert.doesNotMatch(game,/class="watchStats"/);
 assert.match(game,/key==='player'\?escapeHtml\(s\.name\)/);
 assert.match(html,/\.watchTabs\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test('v78 Index first and field item use supports safe targeted consumables',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(game,/indexTab='clock';[^\n]*playerIndexSection='bag'/);
 assert.match(game,/function fieldBagItemUsable\(name\)/);
 assert.match(game,/function fieldBagTargets\(name\)/);
 assert.match(game,/function useFieldBagItem\(name,target,moveId=null\)/);
 assert.match(game,/data-field-target/);
 assert.match(game,/data-field-move/);
 assert.match(game,/data-field-item/);
 assert.match(game,/fieldBagItem==='PP Potion'/);
 assert.match(game,/if\(battleIndexActive\(\)\)return battleTools/);
 assert.match(html,/\.fieldBagTargets/);
});

test('v79 Tools moved under Index and Settings houses Save',()=>{
 assert.match(game,/const INDEX_SECTIONS=/);
 assert.match(game,/function indexMain\(\)/);
 assert.match(game,/function indexSettings\(\)/);
 assert.match(game,/id="settingsSaveGame"/);
 assert.match(game,/id="settingsReturnTitle"/);
 assert.match(game,/Environmental audio/);
 assert.doesNotMatch(game,/id="mSave"/);
});

test('v80 Route 1 sprite registry and rear battle views are wired',()=>{
 const source=JSON.parse(readFileSync(new URL('../data/critters.json',import.meta.url),'utf8'));
 for(const id of ['cr-010-falquill','cr-011-falrift','cr-012-falgrath','cr-013-toxidot','cr-014-mothoxin','cr-015-scruffin']){
  const spec=source.species.find(s=>s.speciesId===id);
  assert.ok(spec);
  assert.equal(spec.art.status,'ready');
  assert.ok(spec.art.spritePath.endsWith('-front.png'));
  assert.ok(spec.art.rearSpritePath.endsWith('-back.png'));
 }
 assert.match(game,/variant\?\.rearSpritePath/);
});

test('v81 regional atlas and discovered-center travel are connected to Index',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const map=readFileSync(new URL('../assets/region-map.svg',import.meta.url),'utf8');
 assert.match(game,/\['map','Map'\]/);
 assert.match(game,/function indexRegionMap\(\)/);
 assert.match(game,/function ensureMapDiscovery\(\)/);
 assert.match(game,/function mapCanFastTravel\(id\)/);
 assert.match(game,/function fastTravelToCenter\(id\)/);
 assert.match(game,/if\(!mapCanFastTravel\(id\)\)return false/);
 assert.match(game,/id="regionMapConfirm"/);
 assert.match(game,/function center\(\)\{/);
 assert.match(game,/s\.discoveredCenters\[parent\]=true/);
 assert.match(html,/\.regionMapBoard/);
 assert.match(map,/<svg/);
 assert.match(map,/viewBox="0 0 900 560"/);
});

test('v82 continuous branching outdoor region with interior and battle fades',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const atlas=readFileSync(new URL('../assets/region-map.svg',import.meta.url),'utf8');
 assert.match(game,/const OUTDOOR_GRID=Object\.freeze/);
 assert.match(game,/const OUTDOOR_LINKS=/);
 assert.match(game,/function drawOutdoorWorld\(\)/);
 assert.match(game,/function outdoorChunk\(area\)/);
 assert.match(game,/function tryOutdoorExit\(d,x,y\)/);
 assert.match(game,/function fadeWorldChange\(effect\)/);
 assert.match(game,/fadeWorldChange\(\(\)=>beginBattleAfterFade\(data,msg\)\)/);
 assert.match(game,/if\(OUTDOOR_GRID\[s\.area\]\)return drawOutdoorWorld\(\)/);
 assert.match(game,/if\(tryOutdoorExit\(d,x,y\)\)return/);
 assert.match(game,/Arrival popups remain disabled/);
 assert.match(html,/id="worldFade"/);
 assert.match(html,/#worldFade\.active/);
 assert.match(atlas,/viewBox="0 0 900 560"/);
});

test('v82 outer route graph has two loops and a cave fade',()=>{
 const names=['village','route1','town','route2','route3','garden','forest'];
 for(const id of names)assert.match(game,new RegExp(id+':\\['));
 assert.match(game,/region\('cave',17,23/);
 assert.match(game,/\['forest',15,18\]/);
 assert.match(game,/\['garden',12,14\]/);
 assert.match(game,/regionMapArt" src="assets\/region-map-expanded.svg\?v=1"/);
});

test('v83 region sections have distinct dimensions, asymmetric borders, area HUD and longer fade',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const atlas=readFileSync(new URL('../assets/region-map.svg',import.meta.url),'utf8');
 assert.match(game,/const OUTDOOR_COL_WIDTHS=\[36,40,44,51,44,46,42,44,42,44,42,44,42,44\]/);
 assert.match(game,/OUTDOOR_ROW_HEIGHTS=\[34,40,38\]/);
 assert.match(game,/function outdoorSize\(area\)/);
 assert.match(game,/function outdoorOrigin\(area\)/);
 assert.match(game,/function decorateExpandedOutdoor\(\)/);
 assert.match(game,/function applyAreaSize\(area\)/);
 assert.match(game,/W=chunk\.w;H=chunk\.h/);
 assert.match(game,/const destinationSize=outdoorSize\(dest\)/);
 assert.match(game,/REGION_MAP_INTERIORS\.find\(p=>p\.id===s\.area\)/);
 assert.match(game,/ctx\.fillText\(timeLabel,x\+width-8,y\+17\)/);
 assert.match(game,/worldFadeTimer=setTimeout\(\(\)=>\{worldTransitionBusy=false;worldFadeTimer=null\},770\)/);
 assert.match(html,/transition:opacity 750ms ease/);
 assert.match(atlas,/region-district-shapes/);
 assert.match(atlas,/region-bamboo/);
 assert.match(atlas,/region-garden/);
});

test('v84 outdoor transitions keep world-space animation and a continuous damped camera',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(game,/function followOutdoorCamera\(targetX,targetY/);
 assert.match(game,/outdoorCamera\.x\+=\(targetX-outdoorCamera\.x\)\*factor/);
 assert.match(game,/const beginX=old\?origin\.x\+visual\.x:null/);
 assert.match(game,/visual\.x=beginX-targetOrigin\.x/);
 assert.match(game,/visual\.duration=Math\.max\(movementStepDuration\(\)/);
 assert.match(game,/Deliberately do not reset outdoorCamera here/);
 assert.match(game,/const camera=followOutdoorCamera\(targetX,targetY\)/);
 assert.match(html,/game\.js\?v=[^"\s]+/);
});

 test('v87 every ready species and gender variant has both actual PNG files',()=>{
 for(const sp of species.filter(s=>s.art?.status==='ready'))for(const a of [sp.art,...Object.values(sp.art.genderVariants||{})])for(const p of [a.spritePath,a.rearSpritePath]){
 assert.match(p,/^assets\/critters\/[a-z0-9/_-]+\.png$/);const png=readFileSync(new URL('../'+p,import.meta.url));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 }
 assert.equal(species.filter(s=>s.art?.status==='ready').length,46);
 assert.equal(species.slice(9,46).length,37);assert.ok(species.slice(9,46).every(s=>s.art.status==='ready'));assert.ok(species.slice(46).every(s=>s.art.status!=='ready'));
 });

test('v90 floating world touch direction has neutral deadzone and cardinal movement',()=>{
 const sandbox=extract('function touchDirection(dx,dy){','function aimStick(e){',{WORLD_DRAG_DEADZONE:12});
 assert.equal(sandbox.touchDirection(3,4),null);assert.equal(sandbox.touchDirection(25,4),'right');assert.equal(sandbox.touchDirection(-25,4),'left');assert.equal(sandbox.touchDirection(4,-25),'up');assert.equal(sandbox.touchDirection(4,25),'down');
});

test('v92 routes field notices and Index confirmations through overworld narrator',()=>{
 assert.match(game,/function indexNotice\(message\)/);
 assert.match(game,/indexNotice\('Game saved successfully\.'\)/);
 assert.match(game,/indexNotice\('Quest completed:/);
 assert.match(game,/function routeEvolutionNotices\(/);
 assert.doesNotMatch(game,/fieldBagResult\?'<div class="watchBagNotice"/);
});

test('v93 homestead sale is gated behind badge four and mother conversation',()=>{assert.match(game,/function canBuyHomestead\(\)/);assert.match(game,/homesteadConstructionStage\(\)===4&&s\.homestead\?\.offered/);assert.match(game,/s\.homestead\.offered=true;save\(\)/);assert.match(game,/const HOMESTEAD_PRICE=10000/);assert.match(game,/homesteadHome/)});

test('solar shadows follow the game clock and disappear at night',()=>{
 const {solarShadowAt}=extract('function solarShadowAt(','function startSceneryLayer(',{});
 assert.equal(solarShadowAt(0),null);
 assert.equal(solarShadowAt(6),null);
 assert.equal(solarShadowAt(18),null);
 const morning=solarShadowAt(8),noon=solarShadowAt(12),evening=solarShadowAt(16);
 assert.ok(morning.dx<0&&evening.dx>0);
 assert.ok(Math.hypot(morning.dx,morning.dy)>Math.hypot(noon.dx,noon.dy));
 assert.ok(Math.hypot(evening.dx,evening.dy)>Math.hypot(noon.dx,noon.dy));
 assert.ok(solarShadowAt(12,'rain').opacity<noon.opacity);
});
test('scenery and actors share stable ground-depth ordering',()=>{
 const order=[];
 const ctx={save(){},restore(){},globalAlpha:1};
 const sandbox=extract('let sceneryForeground=null','const RESIDENTIAL_ART=',{ctx,performance:{now:()=>1000}});
 sandbox.startSceneryLayer(1000,1000);
 sandbox.sceneryLayer('south',0,0,20,60,60,()=>order.push('south'));
 sandbox.queueWorldActor(40,()=>order.push('actor'));
 sandbox.sceneryLayer('north',0,0,20,20,20,()=>order.push('north'));
 sandbox.finishSceneryLayer();
 assert.deepEqual(order,['north','actor','south']);
});

test('expanded world has unique coordinates, reciprocal portals and reachable districts',()=>{
 const sandbox=extract('const REGIONAL_EXPANSION=','const outdoorChunks=',{TOWN_ROOMS:{}});
 const world=vm.runInContext('({grid:OUTDOOR_GRID,links:OUTDOOR_LINKS,expansion:REGIONAL_EXPANSION})',sandbox);
 assert.equal(Object.keys(world.grid).length,30);
 assert.equal(Object.keys(world.expansion).length,20);
 assert.equal(new Set(Object.values(world.grid).map(p=>p.join(','))).size,30);
 assert.equal(Object.values(world.expansion).filter(p=>p.gym).map(p=>p.gym).sort((a,b)=>a-b).join(','),'2,3,4,5,6,7,8');
 const delta={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]},opposite={left:'right',right:'left',up:'down',down:'up'};
 for(const [id,links] of Object.entries(world.links))for(const [dir,[to,a,b]] of Object.entries(links)){
  if(!world.grid[to])continue;
  const [dx,dy]=delta[dir];
  assert.equal(world.grid[to][0],world.grid[id][0]+dx,id+' '+dir);
  assert.equal(world.grid[to][1],world.grid[id][1]+dy,id+' '+dir);
  assert.equal(world.links[to][opposite[dir]].join(','),[id,a,b].join(','));
 }
 const seen=new Set(['garden']),q=['garden'];
 for(let i=0;i<q.length;i++)for(const [id] of Object.values(world.links[q[i]]||{}))if(world.grid[id]&&!seen.has(id)){seen.add(id);q.push(id)}
 assert.equal(seen.size,30);
});
test('every expanded district has a continuous path between all its portals',()=>{
 const T={grass:0,path:1,tree:2,rock:3,stone:4,water:5,tall:6,flower:7};
 const context={T,TOWN_ROOMS:{},npcs:[],EXPANSION_TRAINERS:{},naturalSeed:(x,y)=>Math.abs((x*73856093^y*19349663)>>>0),W:0,H:0,tiles:[]};
 const sandbox=extract('const REGIONAL_EXPANSION=','const outdoorChunks=',context);
 const planStart=game.indexOf('const SETTLEMENT_PLANS='),planEnd=game.indexOf('const TOWN_ROOMS=',planStart);
 vm.runInContext(game.slice(planStart,planEnd),sandbox);
 T.roof=8;T.wall=9;T.door=10;
 const start=game.indexOf('function buildExpansionArea('),end=game.indexOf('function outdoorChunk(',start);
 vm.runInContext(game.slice(start,end),sandbox);
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&y>=0&&x<W&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 function borders(t){rect(0,0,W,1,t);rect(0,H-1,W,1,t);rect(0,0,1,H,t);rect(W-1,0,1,H,t)}
 function npc(x,y,text,kind,id){npcs.push({x,y,text,kind,id})}
 function yardContains(o,x,y){return x>=o.x&&x<o.x+o.w&&y>=o.y&&y<o.y+o.h}
 `,sandbox);
 const ids=vm.runInContext('Object.keys(REGIONAL_EXPANSION)',sandbox);
 for(const id of ids){
  sandbox.area=id;
  const data=vm.runInContext(`(()=>{const size=outdoorSize(area);W=size.w;H=size.h;npcs=[];tiles=Array.from({length:H},()=>Array(W).fill(T.grass));buildExpansionArea(area);return {tiles,W,H,links:OUTDOOR_LINKS[area]}})()`,sandbox);
  const {tiles,W,H,links}=data,queue=[[18,13]],seen=new Set(['18,13']);
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(tiles[ny]?.[nx]!==T.path||seen.has(key))continue;seen.add(key);queue.push([nx,ny])}}
  for(const [side,[dest,a,b]] of Object.entries(links))for(let n=a;n<=b;n++){
   const x=side==='left'?0:side==='right'?W-1:n,y=side==='up'?0:side==='down'?H-1:n;
   assert.ok(seen.has(x+','+y),id+' disconnected from '+dest+' at '+x+','+y);
  }
 }
});

test('new settlement plans have 35 nonoverlapping lots and 35 accessible rooms',()=>{
 const ctx=extract('const SETTLEMENT_PLANS=','const TOWN_ROOMS=',{});
 const result=vm.runInContext('({plans:Object.keys(SETTLEMENT_PLANS),lots:Object.keys(SETTLEMENT_PLANS).flatMap(settlementLots),rooms:settlementRoomDefinitions()})',ctx);
 assert.equal(result.plans.length,7);assert.equal(result.lots.length,35);assert.equal(Object.keys(result.rooms).length,35);
 for(const area of result.plans){
  const lots=ctx.settlementLots(area);
  assert.equal(lots.filter(b=>b.kind==='gym').length,1);
  assert.equal(lots.filter(b=>b.kind==='center').length,1);
  assert.equal(lots.filter(b=>b.kind==='shop').length,1);
  for(const a of lots)for(const b of lots)if(a!==b)assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h+2<=b.y||b.y+b.h+2<=a.y,area+' overlapping lots');
 }
});

test('expansion route habitats preserve original roster and exclude starters and legendary types',()=>{
 const routes=['coastRoute','marshRoute','canyonRoute','volcanicRoute','ashPass','snowRoute','ancientRoute','victoryRoad'];
 for(const area of routes){const pool=species.filter(p=>p.habitats.some(h=>h.areaId===area));assert.ok(pool.length>=10,area);assert.ok(pool.every(p=>!p.starterFamily&&!p.types.some(t=>['Dragon','Primordial','Beast'].includes(t))&&p.habitats.filter(h=>h.areaId===area).every(h=>h.rarity!=='legendary')));}
});

test('Phase 5 special sites have accessible stationary attendants and no battle or capture triggers',()=>{
 const T={grass:0,path:1,tree:2,rock:3,stone:4,water:5,tall:6,flower:7,roof:8,wall:9};
 const context={T,W:42,H:38,tiles:[],npcs:[]};
 const ctx=extract('function buildSpecialStorySite(','function populateExpansionArea(',context);
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&y>=0&&x<W&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 function npc(x,y,text,kind,id){npcs.push({x,y,text,kind,id})}
 `,ctx);
 for(const area of ['leagueGrounds','eclipseSite','legendaryReserveA','legendaryReserveB','legendaryReserveC']){
  ctx.area=area;
  const {tiles,npcs}=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.grass));npcs=[];rect(17,0,3,15,T.path);rect(17,12,W-17,3,T.path);if(!buildSpecialStorySite(area))throw Error(area);return {tiles,npcs}})()`,ctx);
  assert.ok(npcs.length>0,area);
  const blocked=new Set([T.rock,T.water,T.roof,T.wall,T.tree]);
  const occupied=new Set(npcs.map(p=>p.x+','+p.y));
  const seen=new Set(['18,13']),queue=[[18,13]];
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(tiles[ny]?.[nx]===undefined||blocked.has(tiles[ny][nx])||occupied.has(k)||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
  for(const p of npcs){assert.equal(p.kind,'site-attendant');assert.equal(tiles[p.y][p.x],T.grass);assert.ok([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((p.x+dx)+','+(p.y+dy))),p.id);}
  assert.ok(seen.has('18,0'));assert.ok(seen.has('41,13'));
 }
});

test('Phase 6 Center destination resolver accepts real centers and rejects unknown areas',()=>{
 const TOWN_ROOMS={townCenter:{parent:'town',kind:'center'},harborTownCenter:{parent:'harborTown',kind:'center'},harborTownShop:{parent:'harborTown',kind:'shop'}};
 const ctx=extract('function centerArrival(','function ensureMapDiscovery(',{TOWN_ROOMS,roomExit:()=>[12,16]});
 for(const id of ['town','harborTown','harborTownCenter']){
  const result=ctx.centerArrival(id);
  assert.equal(result.x,12);assert.equal(result.y,14);
  assert.equal(result.room,id==='town'?'townCenter':'harborTownCenter');
 }
 assert.equal(ctx.centerArrival('unknown'),null);
 assert.equal(ctx.centerArrival('harborTownShop'),null);
 assert.match(game,/const target=centerArrival\(s.lastCenter\)/);
});
test('Phase 6 battle placeholders cover all expanded biomes',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const biome of ['coast','marsh','canyon','volcanic','snow','ancient','highland'])assert.ok(html.includes('.combatArena.biome-'+biome),biome);
});
