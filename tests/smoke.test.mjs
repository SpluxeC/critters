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
 const ctx=vm.createContext({s,tiles,T,SECRET_AREAS:{},REGIONAL_EXPANSION:{},worldPhase:()=> 'Dusk'});
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
 const reserveStart=game.indexOf('function npcReservedCell('),reserveEnd=game.indexOf('function npcStepAllowed(',reserveStart);
 vm.runInContext(game.slice(reserveStart,reserveEnd),sandbox);
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
 const T={grass:0,path:1,tree:2,rock:3,stone:4,water:5,tall:6,flower:7,roof:8,wall:9,door:10};
 const context={T,W:42,H:38,tiles:[],npcs:[],naturalSeed:(x,y)=>x*31+y*17};
 const ctx=extract('function sanctuaryKind(','function populateExpansionArea(',context);
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

test('Phase 7 NPCs avoid authored doorways and regional portal approaches',()=>{
 const TOWN_ROOMS={townCenter:{parent:'town',door:[25,11]},harborTownCenter:{parent:'harborTown',door:[9,10]}};
 const OUTDOOR_LINKS={town:{right:['route4',12,14]},harborTown:{up:['route',17,19]}};
 const ctx=extract('function npcReservedCell(','function npcStepAllowed(',{TOWN_ROOMS,OUTDOOR_LINKS,VILLAGE_HOUSES:[],roomExit:()=>[12,16]});
 for(const [area,x,y] of [['town',25,12],['town',24,14],['town',40,13],['harborTown',18,3],['harborTown',9,13]])assert.equal(ctx.npcReservedCell(area,x,y,44,40),true,area+':'+x+','+y);
 assert.equal(ctx.npcReservedCell('town',10,20,44,40),false);
 assert.equal(ctx.npcReservedCell('townCenter',12,14,24,17),true);
});
test('Phase 7 blocked trainer approach cancels instead of initiating a distant battle',()=>{
 const p={x:5,y:5,walking:false},s={area:'route1',x:8,y:5,defeated:{}};
 let finished=0,cancelled=0;
 const ctx=extract('function tickTrainerApproach(','function checkTrainerSight(',{trainerApproach:{p,area:s.area,x:s.x,y:s.y,until:0,deadline:4000},s,npcs:[p],battle:null,screen:'game',document:{hidden:false},modal:false,worldTransitionBusy:false,doorTransition:null,narratorBlocking:()=>false,trainerApproachStep:()=>({x:6,y:5}),npcStepAllowed:()=>false,finishTrainerApproach:()=>finished++,cancelTrainerApproach:()=>cancelled++});
 assert.equal(ctx.tickTrainerApproach(1000),true);assert.equal(cancelled,1);assert.equal(finished,0);
 p.x=7;assert.equal(ctx.tickTrainerApproach(1000),true);assert.equal(finished,1);
});

test('Phase 8 artwork cache evicts least recently used completed images and keeps loading images',()=>{
 const cache=new Map([['loading',{complete:false}],['old',{complete:true}],['new',{complete:true}]]);
 const ctx=extract('function trimArtworkCache(','// Only scenery objects',{uploadedArtCache:cache,ART_CACHE_LIMIT:2});
 ctx.trimArtworkCache();assert.deepEqual([...cache.keys()],['loading','new']);
});
test('Phase 8 yard footprint caches both solid and decorative cells per geometry',()=>{
 let calls=0;
 const ctx=extract('function yardFootprint(','function yardBuildings(',{tiles:[],yardFootprintCache:new WeakMap(),key:(x,y)=>x+','+y,buildingYardLayout:()=>{calls++;return [{x:2,y:3,w:2,h:1,solid:true},{x:4,y:3,w:1,h:1,solid:false}]}});
 const first=ctx.yardFootprint('town');assert.ok(first.solid.has('3,3'));assert.ok(first.occupied.has('4,3'));assert.ok(!first.solid.has('4,3'));
 assert.equal(ctx.yardFootprint('town'),first);assert.equal(calls,1);
 ctx.tiles=[];ctx.yardFootprint('town');assert.equal(calls,2);
});
test('Phase 8 presentation pacing skips excess draws but forces resize frames',()=>{
 let draws=0,clock=0,cost=25;
 const ctx=extract('let lastWorldRender=','function loop(now=',{canvasSizeDirty:false,draw:()=>{draws++;clock+=cost},trimArtworkCache:()=>{},performance:{now:()=>clock}});
 ctx.renderWorldFrame(0);ctx.renderWorldFrame(5);assert.equal(draws,1);
 ctx.canvasSizeDirty=true;ctx.renderWorldFrame(5);assert.equal(draws,2);
 ctx.canvasSizeDirty=false;
 for(let i=1;i<=50;i++)ctx.renderWorldFrame(i*40);
 const before=draws;ctx.renderWorldFrame(2017);assert.equal(draws,before);
});

test('Phase 9.1 coastal quays remain connected and shoreline remains water',()=>{
 const T={grass:0,path:1,water:2,stone:3,rock:4,tall:5};
 const ctx=extract('function coastalShoreline(','function buildSpecialStorySite(',{T,W:44,H:40,tiles:[],naturalSeed:(x,y)=>x*31+y*17});
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&x<W&&y>=0&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 `,ctx);
 for(const area of ['coastRoute','harborTown']){
  ctx.area=area;
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.grass));rect(0,12,W,3,T.path);rect(17,13,3,H-13,T.path);buildCoastalLandscape(area);return tiles})()`,ctx);
  assert.equal(tiles[13][18],T.path);
  if(area==='coastRoute'){assert.equal(tiles[34][19],T.path);assert.equal(tiles[36][25],T.water);}
  else{for(let y=27;y<=37;y++)assert.equal(tiles[y][9],T.path);assert.equal(tiles[32][5],T.path);assert.equal(tiles[36][13],T.water);assert.equal(tiles[39][18],T.path);}
 }
});

test('Phase 9.2 wetland boardwalks connect to roads while pools remain impassable',()=>{
 const T={grass:0,path:1,water:2,stone:3,rock:4,tall:5};
 const ctx=extract('function marshDeckCell(','function buildSpecialStorySite(',{T,W:44,H:40,tiles:[],naturalSeed:(x,y)=>x*31+y*17});
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&x<W&&y>=0&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 `,ctx);
 for(const area of ['marshRoute','marshTown']){
  ctx.area=area;
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.grass));rect(0,12,W,3,T.path);rect(17,13,3,H-13,T.path);rect(2,26,W-4,2,T.path);buildMarshLandscape(area);return tiles})()`,ctx);
  assert.equal(tiles[13][18],T.path);
  const seen=new Set(['18,13']),queue=[[18,13]];
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(tiles[ny]?.[nx]!==T.path||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
  if(area==='marshRoute'){assert.ok(seen.has('9,28'));assert.ok(seen.has('31,28'));assert.equal(tiles[24][5],T.water);assert.equal(tiles[24][34],T.water);}
  else{assert.ok(seen.has('9,34'));assert.ok(seen.has('14,34'));assert.equal(tiles[32][12],T.water);assert.ok(seen.has('18,39'));}
  for(let y=0;y<40;y++)for(let x=0;x<44;x++)if(ctx.marshDeckCell(area,x,y))assert.equal(tiles[y][x],T.path,area+' '+x+','+y);
 }
});

test('Phase 9.3 canyon cliffs preserve regional roads and scenic trail connectivity',()=>{
 const T={grass:0,path:1,rock:2,tall:3,stone:4};
 const ctx=extract('function canyonCliffCell(','function buildSpecialStorySite(',{T,W:42,H:40,tiles:[],naturalSeed:(x,y)=>x*31+y*17,settlementPublicProps:()=>[]});
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&x<W&&y>=0&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 `,ctx);
 for(const area of ['canyonRoute','canyonTown']){
  ctx.area=area;
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.grass));rect(0,12,W,3,T.path);rect(17,13,3,H-13,T.path);rect(2,26,W-4,2,T.path);buildCanyonLandscape(area);return tiles})()`,ctx);
  for(let x=0;x<42;x++)assert.equal(tiles[13][x],T.path);
  for(let y=13;y<40;y++)assert.equal(tiles[y][18],T.path);
  if(area==='canyonRoute'){
   assert.equal(tiles[3][10],T.rock);assert.equal(tiles[8][30],T.rock);
   assert.equal(tiles[24][15],T.path);assert.equal(tiles[24][28],T.path);
   const seen=new Set(['18,13']),queue=[[18,13]];
   for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(tiles[ny]?.[nx]!==T.path||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
   assert.ok(seen.has('10,21'));assert.ok(seen.has('28,25'));
  }else{assert.equal(tiles[31][7],T.stone);assert.equal(tiles[28][10],T.path);}
 }
});

test('Phase 9.4 volcanic pools and ridges preserve roads and thermal overlooks',()=>{
 const T={grass:0,path:1,rock:2,tall:3,stone:4,water:5};
 const ctx=extract('function isVolcanicDistrict(','function buildSpecialStorySite(',{T,W:44,H:40,tiles:[],naturalSeed:(x,y)=>x*31+y*17,settlementPublicProps:()=>[]});
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&x<W&&y>=0&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 `,ctx);
 for(const area of ['volcanicRoute','volcanicTown']){
  ctx.area=area;
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.grass));rect(0,12,W,3,T.path);rect(17,0,3,H,T.path);rect(2,26,W-4,2,T.path);buildVolcanicLandscape(area);return tiles})()`,ctx);
  for(let x=0;x<44;x++)assert.equal(tiles[13][x],T.path);
  for(let y=0;y<40;y++)assert.equal(tiles[y][18],T.path);
  const seen=new Set(['18,13']),queue=[[18,13]];
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(![T.path,T.stone].includes(tiles[ny]?.[nx])||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
  if(area==='volcanicRoute'){assert.equal(tiles[29][8],T.water);assert.equal(tiles[29][29],T.water);assert.equal(tiles[7][29],T.rock);assert.ok(seen.has('13,25'));assert.ok(seen.has('26,25'));}
  else{assert.equal(tiles[33][9],T.water);assert.ok(seen.has('14,34'));assert.ok(seen.has('9,28'));}
 }
 assert.equal(ctx.isVolcanicDistrict('ashPass'),false);
 assert.equal(ctx.isVolcanicDistrict('legendaryReserveC'),false);
});

test('Phase 9.5 Ash Pass preserves actual west and south crossings and the scenic loop',()=>{
 const T={grass:0,path:1,rock:2,tall:3};
 const ctx=extract('function ashRidgeCell(','function buildSpecialStorySite(',{T,W:44,H:34,tiles:[],naturalSeed:(x,y)=>x*31+y*17});
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&x<W&&y>=0&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 `,ctx);
 const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.grass));rect(0,12,20,3,T.path);rect(17,12,3,H-12,T.path);buildAshPassLandscape();return tiles})()`,ctx);
 const seen=new Set(['18,13']),queue=[[18,13]];
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(tiles[ny]?.[nx]!==T.path||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
 for(const point of ['0,12','0,13','0,14','17,33','18,33','19,33','28,22','9,21'])assert.ok(seen.has(point),point);
 assert.equal(tiles[7][24],T.rock);assert.equal(tiles[17][34],T.rock);
 assert.ok(tiles.flat().filter(t=>t===T.tall).length>20);
});

test('Phase 9.6 winter lakes remain solid and snowy routes retain east-west crossings',()=>{
 const T={grass:0,path:1,rock:2,tall:3,stone:4,water:5,tree:6,flower:7};
 const ctx=extract('function isSnowDistrict(','function buildSpecialStorySite(',{T,W:44,H:34,tiles:[],naturalSeed:(x,y)=>x*31+y*17,settlementPublicProps:()=>[]});
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&x<W&&y>=0&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 `,ctx);
 for(const area of ['snowRoute','snowTown']){
  ctx.area=area;ctx.W=area==='snowRoute'?44:42;
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.grass));rect(0,12,W,3,T.path);rect(17,1,3,H-2,T.path);rect(2,26,W-4,2,T.path);buildSnowLandscape(area);return tiles})()`,ctx);
  for(let x=0;x<ctx.W;x++)assert.equal(tiles[13][x],T.path);
  const seen=new Set(['18,13']),queue=[[18,13]];
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(![T.path,T.stone].includes(tiles[ny]?.[nx])||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
  if(area==='snowRoute'){assert.equal(tiles[25][27],T.water);assert.ok(seen.has('19,27'));assert.ok(seen.has('35,23'));assert.ok(tiles.flat().includes(T.tree));}
  else{assert.equal(tiles[30][9],T.water);assert.ok(seen.has('15,31'));assert.ok(seen.has('12,27'));}
 }
});

test('Phase 9.7 Highland Town terraces preserve roads and connect both stairways',()=>{
 const T={grass:0,path:1,rock:2,stone:3,flower:4};
 const ctx=extract('function highlandWallCell(','function buildSpecialStorySite(',{T,W:42,H:34,tiles:[],settlementPublicProps:()=>[]});
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&x<W&&y>=0&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 `,ctx);
 const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.grass));rect(0,12,W,3,T.path);rect(17,1,3,H-2,T.path);rect(2,26,W-4,2,T.path);buildHighlandLandscape();return tiles})()`,ctx);
 const seen=new Set(['18,13']),queue=[[18,13]];
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(![T.path,T.stone].includes(tiles[ny]?.[nx])||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
 for(const point of ['0,13','41,13','9,32','18,32','14,31','20,31'])assert.ok(seen.has(point),point);
 assert.equal(tiles[32][5],T.rock);assert.equal(tiles[32][24],T.rock);
 for(let y=28;y<=32;y++)for(const x of [8,9,10,17,18,19])assert.equal(tiles[y][x],T.path);
});

test('Phase 9.8 ancient ruins preserve roads and courtyard access',()=>{
 const T={grass:0,path:1,rock:2,stone:3,tall:4};
 const ctx=extract('function ancientRuinKind(','function buildSpecialStorySite(',{T,W:44,H:34,tiles:[],naturalSeed:(x,y)=>x*31+y*17,settlementPublicProps:()=>[]});
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&x<W&&y>=0&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 `,ctx);
 for(const area of ['ancientRoute','ancientTown']){
  ctx.area=area;ctx.W=area==='ancientRoute'?44:42;
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.grass));rect(0,12,W,3,T.path);rect(17,1,3,H-2,T.path);rect(2,26,W-4,2,T.path);buildAncientLandscape(area);return tiles})()`,ctx);
  const seen=new Set(['18,13']),queue=[[18,13]];
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(![T.path,T.stone].includes(tiles[ny]?.[nx])||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
  assert.ok(seen.has('0,13'));assert.ok(seen.has((ctx.W-1)+',13'));
  if(area==='ancientRoute'){assert.equal(tiles[5][8],T.rock);assert.equal(tiles[9][7],T.rock);assert.ok(seen.has('30,25'));}
  else{assert.equal(tiles[29][4],T.rock);assert.ok(seen.has('9,32'));assert.ok(seen.has('15,31'));}
 }
});

test('Phase 9.9 sanctuary courts, monuments and north entrances remain accessible',()=>{
 const T={grass:0,path:1,tree:2,rock:3,stone:4,water:5,tall:6,flower:7};
 const ctx=extract('function sanctuaryKind(','function buildSpecialStorySite(',{T,W:44,H:38,tiles:[],naturalSeed:(x,y)=>x*31+y*17});
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&y>=0&&x<W&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 `,ctx);
 for(const area of ['legendaryReserveA','legendaryReserveB','legendaryReserveC']){
  ctx.area=area;
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.grass));buildSanctuaryLandscape(area);return tiles})()`,ctx);
  const seen=new Set(['18,0']),queue=[[18,0]];
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(![T.path,T.stone,T.grass,T.tall,T.flower].includes(tiles[ny]?.[nx])||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
  for(const point of ['17,0','19,0','18,24','18,31','12,17'])assert.ok(seen.has(point),area+' '+point);
  assert.equal(tiles[32][18],T.rock);assert.equal(tiles[29][13],T.rock);
  if(area==='legendaryReserveB'){assert.equal(tiles[23][15],T.water);assert.equal(tiles[28][9],T.path);}
  if(area==='legendaryReserveC')assert.equal(tiles[25][33],T.water);
  if(area==='legendaryReserveA')assert.equal(tiles[36][20],T.water);
 }
});

test('Phase 9.10 Eclipse compound preserves public access and closed facility collision',()=>{
 const T={grass:0,path:1,rock:2,stone:3,roof:4};
 const ctx=extract('function eclipseGroundKind(','function buildSpecialStorySite(',{T,W:42,H:38,tiles:[]});
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&y>=0&&x<W&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 `,ctx);
 const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.grass));rect(17,0,3,15,T.path);buildEclipseLandscape();return tiles})()`,ctx);
 const seen=new Set(['18,0']),queue=[[18,0]];
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(![T.path,T.stone,T.grass].includes(tiles[ny]?.[nx])||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
 for(const point of ['17,0','19,0','18,13','12,17','18,30','29,28'])assert.ok(seen.has(point),point);
 assert.equal(tiles[3][8],T.rock);assert.equal(tiles[7][12],T.roof);assert.equal(tiles[7][27],T.roof);
 assert.equal(tiles[21][8],T.rock);assert.equal(tiles[24][28],T.rock);
 for(const y of [3,11])for(const x of [17,18,19])assert.equal(tiles[y][x],T.path);
});

test('Phase 9.11/13.1 Ascension Pass and championship court retain their crossings and hall entrance',()=>{
 const T={grass:0,path:1,rock:2,stone:3,roof:4,tree:5,flower:6};
 const ctx=extract('function victoryRidgeCell(','function buildSpecialStorySite(',{T,W:44,H:34,tiles:[]});
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&y>=0&&x<W&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 `,ctx);
 for(const area of ['victoryRoad','leagueGrounds']){
  ctx.area=area;ctx.W=area==='victoryRoad'?44:42;
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.grass));rect(0,12,W,3,T.path);if(area==='victoryRoad')buildVictoryLandscape();else buildLeagueLandscape();return tiles})()`,ctx);
  const seen=new Set(['18,13']),queue=[[18,13]];
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(![T.path,T.stone].includes(tiles[ny]?.[nx])||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
  assert.ok(seen.has((ctx.W-1)+',13'));
  if(area==='victoryRoad'){assert.ok(seen.has('0,13'));assert.ok(seen.has('29,25'));assert.equal(tiles[7][29],T.rock);}
  else{assert.ok(seen.has('20,11'));assert.ok(seen.has('20,28'));assert.equal(tiles[10][20],T.door);assert.equal(tiles[17][8],T.rock);}
 }
});

test('Phase 10 nearby ambient NPCs receive distinct lifestyles and staggered routines',()=>{
 const ctx=extract('const NPC_LIFESTYLES=','function npcRoutineDialogue(',{NPC_STATIONARY:new Set(['leader','gymtrainer']),performance:{now:()=>1000}});
 const actors=Array.from({length:6},(_,i)=>({homeX:10+i,homeY:12,id:'resident-'+i,kind:''}));
 ctx.assignNpcLifestyles('town',actors);
 assert.equal(new Set(actors.map(p=>p.lifestyle)).size,6);
 assert.equal(new Set(actors.map(p=>p.nextRoutine)).size,6);
 assert.ok(new Set(actors.map(p=>p.walkPace)).size>3);
 assert.ok(new Set(actors.map(p=>ctx.npcLifestylePlan('town',p,12).task)).size>=5);
 for(const p of actors){
  const plan=ctx.npcLifestylePlan('town',p,12,'storm');
  assert.equal(plan.task,'Sheltering');assert.equal(plan.points.length,1);
  assert.equal(ctx.npcLifestylePlan('town',p,1).task,'Resting');
 }
});

test('Phase 11 archive progress is independent from original ruins puzzle',()=>{
 const s={sideQuests:{archive:{status:'active'},ruins:{status:'active'}},puzzles:{archiveOpened:true,ruinsOpened:false}};
 const ctx=extract('function sideQuestProgress(','function sideQuestRewardLabel(',{s});
 assert.equal(ctx.sideQuestProgress({id:'archive',kind:'archive-puzzle'}),1);
 assert.equal(ctx.sideQuestProgress({id:'ruins',kind:'puzzle'}),0);
});
test('Phase 11 regional secret rooms have open exits and accessible supply chests',()=>{
 const T={rock:0,grass:1,stone:2,path:3,door:4,tall:5,water:6,flower:7,tree:8};
 const ctx=extract('function buildSecretArea(','function prepareExplorationGeometry(',{T,W:34,H:26,tiles:[]});
 vm.runInContext(`
 function put(x,y,t){if(x>=0&&y>=0&&x<W&&y<H)tiles[y][x]=t}
 function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)}
 function borders(t){rect(0,0,W,1,t);rect(0,H-1,W,1,t);rect(0,0,1,H,t);rect(W-1,0,1,H,t)}
 `,ctx);
 for(const area of ['coastalNook','marshHideaway','mountainAlcove','springCavern','snowShelter','oldArchive']){
  ctx.area=area;
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.rock));buildSecretArea(area);return tiles})()`,ctx);
  const seen=new Set(['17,22']),queue=[[17,22]];
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(![T.grass,T.stone,T.path,T.door,T.tall,T.flower].includes(tiles[ny]?.[nx])||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
  assert.ok(seen.has('17,25'),area);assert.ok(seen.has('23,8'),area);
 }
});

test('Phase 12.2 Harbor Gym requires Grass badge, all trainers and tide puzzle',()=>{
 const ctx=extract('const GYM_CHALLENGES=','function roomSize(',{});
 const state={badges:1,defeated:{},puzzles:{}};
 ctx.normalizeGymProgress(state);
 const g=ctx.gymChallenge('harborTown');
 assert.equal(g.type,'Water');assert.equal(g.trainers.length,3);
 assert.equal(ctx.gymRequirements(g,state).ready,false);
 for(const id of g.trainerIds)state.defeated[id]=true;
 assert.equal(ctx.gymRequirements(g,state).ready,false);
 assert.equal(ctx.completeGymPuzzle(g,state),true);
 assert.equal(ctx.awardGymBadge(g,state),true);
 assert.equal(state.badges,2);
 assert.equal(ctx.awardGymBadge(g,state),false);
 assert.equal(state.badges,2);
});

test('Phase 12.3 marsh boardwalks connect each island in order',()=>{
 const T={grass:0,path:1,water:2,wall:3};
 const ctx=extract('function marshGymGeometry(','function operateMarshBridge(',{T,W:30,H:24,tiles:[],gymChallenge:()=>({}),gymEarned:()=>false});
 vm.runInContext(`function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)tiles[yy][xx]=t}`,ctx);
 for(let stage=0;stage<=3;stage++){
  ctx.state={gymProgress:{marshBridges:{west:stage>=1,east:stage>=2,north:stage>=3}}};
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.wall));marshGymGeometry(state);return tiles})()`,ctx);
  const seen=new Set(['15,21']),q=[[15,21]];
  for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(tiles[ny]?.[nx]!==T.path||seen.has(k))continue;seen.add(k);q.push([nx,ny])}}
  assert.ok(seen.has('7,19'));assert.equal(seen.has('22,14'),stage>=1);assert.equal(seen.has('7,10'),stage>=2);assert.equal(seen.has('15,6'),stage>=3);
 }
});

test('Phase 12.4 canyon counterweights preserve retreat and gate the leader',()=>{
 const T={stone:1,rock:2,path:3,wall:4};
 const ctx=extract('function canyonGateState(','function furnishCanyonGym(',{T,W:30,H:24,tiles:[],gymChallenge:()=>({}),gymEarned:()=>false});
 vm.runInContext(`function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)tiles[yy][xx]=t}`,ctx);
 for(const mask of [0,1,2,3])for(const done of [false,true]){
  ctx.state={gymProgress:{canyonWeights:mask,puzzles:{canyonTown:done}}};
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.wall));canyonGymGeometry(state);return tiles})()`,ctx);
  const seen=new Set(['15,21']),q=[[15,21]];
  for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(![T.path,T.stone].includes(tiles[ny]?.[nx])||seen.has(k))continue;seen.add(k);q.push([nx,ny])}}
  assert.ok(seen.has('7,19'));assert.ok(seen.has('23,19'));
  assert.equal(seen.has('7,12'),done||mask!==0);assert.equal(seen.has('15,6'),done);
 }
});

test('Phase 12.5 thermal settings require all four targets and keep the exit accessible',()=>{
 const T={stone:1,rock:2,path:3,water:4,wall:5};
 const ctx=extract('const THERMAL_TARGET=','function furnishVolcanicGym(',{T,W:30,H:24,tiles:[],gymChallenge:()=>({}),gymEarned:()=>false});
 assert.equal(ctx.thermalBalanced(ctx.thermalSettings({})),false);
 assert.equal(ctx.thermalBalanced([1,2,0,1]),true);
 assert.equal(ctx.thermalBalanced([1,2,0,2]),false);
 vm.runInContext(`function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)tiles[yy][xx]=t}`,ctx);
 for(const done of [false,true]){
  ctx.state={gymProgress:{puzzles:{volcanicTown:done}}};
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.wall));volcanicGymGeometry(state);return tiles})()`,ctx);
  const seen=new Set(['15,21']),q=[[15,21]];
  for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(![T.path,T.stone].includes(tiles[ny]?.[nx])||seen.has(k))continue;seen.add(k);q.push([nx,ny])}}
  for(const p of ['7,19','23,19','7,12','23,12','15,9','5,18','25,18','5,11','25,11','15,22'])assert.ok(seen.has(p),p);
  assert.equal(seen.has('15,6'),done);
 }
});

test('Phase 12.6 snow sliding stops at obstacles and rough stone',()=>{
 const ctx=extract('function snowSlideNext(','let snowSlideDirection=',{});
 const ice=(x,y)=>x>=7&&x<=22&&y>=10&&y<=19;
 assert.equal(ctx.snowSlideNext(7,10,'right',ice,()=>false).x,8);
 assert.equal(ctx.snowSlideNext(7,10,'right',ice,()=>true),null);
 assert.equal(ctx.snowSlideNext(6,10,'right',ice,()=>false),null);
});
test('Phase 12.6 ice gym all beacons and trainers reachable without opening leader seal',()=>{
 const T={stone:1,rock:2,path:3,tall:4,wall:5};
 const ctx=extract('const SNOW_BEACONS=','function furnishSnowGym(',{T,W:30,H:24,tiles:[],gymChallenge:()=>({}),gymEarned:()=>false});
 vm.runInContext(`function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)tiles[yy][xx]=t}`,ctx);
 for(const done of [false,true]){
  ctx.state={gymProgress:{puzzles:{snowTown:done}}};
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.wall));snowGymGeometry(state);return tiles})()`,ctx);
  const obstacles=new Set(['5,19','24,19','5,10','24,10','15,6','12,21','15,9']);
  const pass=(x,y)=>[T.stone,T.path,T.tall].includes(tiles[y]?.[x])&&!obstacles.has(x+','+y);
  const seen=new Set(['15,21']),q=[[15,21]],crossed=new Set();
  for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   let nx=x+dx,ny=y+dy;if(!pass(nx,ny))continue;
   while(tiles[ny][nx]===T.tall&&pass(nx+dx,ny+dy)){crossed.add(nx+','+ny);nx+=dx;ny+=dy;}
   const k=nx+','+ny;if(!seen.has(k)){seen.add(k);q.push([nx,ny]);}
  }}
  for(const p of ['5,15','24,15','15,10','15,22'])assert.ok(seen.has(p)||crossed.has(p),p);
  for(const p of [[5,19],[24,19],[5,10],[24,10]])assert.ok([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((p[0]+dx)+','+(p[1]+dy))),p.join(','));
  assert.equal(seen.has('15,7'),done);
 }
});

test('Phase 12.7 Highland Gym vanes preserve retreat and gate the leader',()=>{
 const T={stone:1,rock:2,path:3,wall:4};
 const ctx=extract('const HIGHLAND_CONTROLS=','function furnishHighlandGym(',{T,W:30,H:24,tiles:[],gymChallenge:()=>({}),gymEarned:()=>false});
 vm.runInContext(`function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)tiles[yy][xx]=t}`,ctx);
 for(const values of [[0,0,0],[1,0,0],[0,2,0],[1,2,1]])for(const done of [false,true]){
  ctx.s={gymProgress:{highlandWind:values,puzzles:{highlandTown:done}}};
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.wall));highlandGymGeometry();return tiles})()`,ctx);
  const blocked=new Set(['5,19','24,19','5,12','24,12','15,6','13,20','8,17','21,17','15,10','16,9']);
  const seen=new Set(['15,21']),q=[[15,21]];
  for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(![T.path,T.stone].includes(tiles[ny]?.[nx])||seen.has(k)||blocked.has(k))continue;seen.add(k);q.push([nx,ny])}}
  for(const p of ['15,22','5,18','24,18','8,18','21,18'])assert.ok(seen.has(p),p);
  assert.equal(seen.has('5,11'),done||values[0]===1||values[1]===2);
  assert.equal(seen.has('15,7'),done);
 }
});
test('Phase 12.7 Flying teams use real species and Gale Badge is awarded once',()=>{
 const ctx=extract('const GYM_CHALLENGES=','function roomSize(',{});
 const g=ctx.gymChallenge('highlandTown'),state={badges:6,defeated:{}};
 ctx.normalizeGymProgress(state);
 assert.equal(g.type,'Flying');assert.equal(g.trainers.length,4);
 for(const trainer of [...g.trainers,g.leader])for(const member of trainer.team)assert.ok(species.find(sp=>sp.speciesId===member.speciesId)?.types.includes('Flying'),member.speciesId);
 assert.equal(ctx.completeGymPuzzle(g,state),false);
 for(const id of g.trainerIds)state.defeated[id]=true;
 assert.equal(ctx.gymRequirements(g,state).ready,false);
 assert.equal(ctx.completeGymPuzzle(g,state),true);
 assert.equal(ctx.awardGymBadge(g,state),true);
 assert.equal(state.badges,7);assert.equal(ctx.awardGymBadge(g,state),false);
});

test('Phase 12.8 Ancient Gym inscriptions preserve retreat and guard the sanctum',()=>{
 const T={stone:1,rock:2,path:3,wall:4};
 const ctx=extract('const ANCIENT_GLYPHS=','function furnishAncientGym(',{T,W:30,H:24,tiles:[],gymChallenge:()=>({}),gymEarned:()=>false});
 vm.runInContext(`function rect(x,y,w,h,t){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)tiles[yy][xx]=t}`,ctx);
 const order=['dawn','echo','memory','twilight'];
 assert.equal(ctx.ancientGlyphProgress({gymProgress:{ancientGlyphs:['dawn','twilight']}}).length,1);
 for(let stage=0;stage<=4;stage++)for(const done of [false,true]){
  ctx.state={gymProgress:{ancientGlyphs:order.slice(0,stage),puzzles:{ancientTown:done}}};
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.wall));ancientGymGeometry(state);return tiles})()`,ctx);
  const blocked=new Set(['5,20','24,20','5,12','24,12','15,6','12,21','8,18','21,18','8,11','21,11','16,9']);
  const seen=new Set(['15,21']),q=[[15,21]];
  for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(![T.path,T.stone].includes(tiles[ny]?.[nx])||seen.has(k)||blocked.has(k))continue;seen.add(k);q.push([nx,ny])}}
  for(const p of ['15,22','5,19','24,19','8,19','21,19'])assert.ok(seen.has(p),p);
  for(const p of ['5,11','24,11','8,10','21,10','15,9'])assert.equal(seen.has(p),done||stage>=2,p);
  assert.equal(seen.has('15,7'),done);
 }
});
test('Phase 12.8 Ghost teams and eighth badge preserve progression',()=>{
 const ctx=extract('const GYM_CHALLENGES=','function roomSize(',{});
 const g=ctx.gymChallenge('ancientTown'),state={badges:7,defeated:{}};
 ctx.normalizeGymProgress(state);
 assert.equal(g.type,'Ghost');assert.equal(g.trainers.length,4);assert.equal(g.leader.team.length,6);
 for(const trainer of [...g.trainers,g.leader])for(const member of trainer.team)assert.ok(species.find(sp=>sp.speciesId===member.speciesId)?.types.includes('Ghost'),member.speciesId);
 assert.equal(ctx.completeGymPuzzle(g,state),false);
 for(const id of g.trainerIds)state.defeated[id]=true;
 assert.equal(ctx.gymRequirements(g,state).ready,false);
 assert.equal(ctx.completeGymPuzzle(g,state),true);
 assert.equal(ctx.awardGymBadge(g,state),true);
 assert.equal(state.badges,8);assert.equal(ctx.awardGymBadge(g,state),false);
});

test('Phase 12.9 all eight Gym badges progress in order, once each, and unlock League eligibility',()=>{
 const ctx=extract('const GYM_CHALLENGES=','function roomSize(',{});
 const state={badges:0,defeated:{},puzzles:{}};
 ctx.normalizeGymProgress(state);
 for(let n=1;n<=8;n++){
  const g=vm.runInContext('GYM_CHALLENGES['+(n-1)+']',ctx);
  assert.equal(g.number,n);assert.equal(g.active,true);
  assert.equal(ctx.leagueEligible(state),false);
  assert.equal(ctx.gymRequirements(g,state).ready,false);
  assert.equal(ctx.completeGymPuzzle(g,state),false);
  for(const id of g.trainerIds)state.defeated[id]=true;
  assert.equal(ctx.gymRequirements(g,state).ready,false);
  assert.equal(ctx.completeGymPuzzle(g,state),true);
  assert.equal(ctx.awardGymBadge(g,state),true);
  assert.equal(ctx.awardGymBadge(g,state),false);
  assert.equal(state.badges,n);
  for(const t of [...(g.trainers||[]),...(g.leader?[g.leader]:[])])for(const m of t.team){
   assert.ok(species.find(sp=>sp.speciesId===m.speciesId)?.types.includes(g.type),m.speciesId);
  }
 }
 assert.equal(ctx.leagueEligible(state),true);
 for(let n=0;n<=8;n++){
  const legacy={badges:n};ctx.normalizeGymProgress(legacy);
  assert.equal(legacy.badges,n);assert.equal(ctx.leagueEligible(legacy),n===8);
  if(n)assert.equal(legacy.puzzles.gate,true);
 }
});
test('Phase 12.9 raw Critter art path is accepted without breaking JavaScript parsing',()=>{
 const ctx=extract('function uploadedArtPath(','\nfunction ',{RESIDENTIAL_ART:new Set()});
 assert.equal(ctx.uploadedArtPath('assets/critters/starters/water.png'),'assets/critters/starters/water.png');
});

test('Phase 13.1 championship entry, retreat and public corridors remain accessible',()=>{
 const T={wall:1,stone:2,mat:3,path:4,door:5};
 const ctx=extract('const CHAMPIONSHIP_ROOMS=','function buildChampionshipHall(',{T,W:38,H:34,tiles:[],s:{},leagueEligible:()=>false});
 vm.runInContext(`function put(x,y,t){tiles[y][x]=t}function rect(x,y,w,h,t){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,t)}function borders(t){rect(0,0,W,H,t)}`,ctx);
 const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.wall));championshipHallGeometry();return tiles})()`,ctx);
 const blocked=new Set(['12,28','13,28','14,28','25,28','4,28','5,28','6,28','30,28','31,28','32,28','4,31','30,31','13,27','24,26']);
 const seen=new Set(['19,31']),q=[[19,31]];
 for(let k=0;k<q.length;k++){const [x,y]=q[k];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,key=a+','+b;if(![T.stone,T.mat,T.path,T.door].includes(tiles[b]?.[a])||seen.has(key)||blocked.has(key))continue;seen.add(key);q.push([a,b]);}}
 for(const p of ['19,33','13,26','25,29','19,11'])assert.ok(seen.has(p),p);
 for(const p of ['5,7','24,7','5,18','24,18','19,8'])assert.ok(!seen.has(p),p);
});
test('Phase 13.1 Ascension Pass habitat labels preserve existing area IDs',()=>{
 const habitats=species.flatMap(sp=>sp.habitats||[]).filter(h=>h.areaId==='victoryRoad');
 assert.ok(habitats.length>0);
 assert.ok(habitats.every(h=>!h.areaName.includes('Victory Road')&&h.areaName.includes('Ascension Pass')));
});

test('Phase 13.2 Paragon registration, ordered victories, checkpoints and Champion eligibility',()=>{
 const ctx=extract('const CHAMPIONSHIP_ROOMS=','function buildChampionshipHall(',{leagueEligible:state=>state.badges===8});
 const state={badges:7};
 assert.equal(ctx.registerParagon(state),false);
 assert.equal(ctx.paragonChamberOpen(0,state),false);
 state.badges=8;assert.equal(ctx.registerParagon(state),true);
 assert.equal(ctx.paragonChamberOpen(0,state),true);
 assert.equal(ctx.paragonChamberOpen(1,state),false);
 assert.equal(ctx.recordParagonWin('paragon-2',state),false);
 // Simulate future authored opponents in this isolated context only.
 vm.runInContext('for(const m of PARAGON_MEMBERS){m.active=true;m.team=[{speciesId:"test",level:1}]}',ctx);
 for(let i=0;i<4;i++){
  const id='paragon-'+(i+1);
  assert.equal(ctx.paragonBattleReady(id,state),true);
  if(i<3)assert.equal(ctx.recordParagonWin('paragon-'+(i+2),state),false);
  assert.equal(ctx.recordParagonWin(id,state),true);
  assert.equal(ctx.recordParagonWin(id,state),false);
  assert.equal(ctx.paragonStatus(state).cleared,i+1);
  ctx.recordParagonLoss(state);
  assert.equal(ctx.paragonStatus(JSON.parse(JSON.stringify(state))).cleared,i+1);
  assert.equal(ctx.paragonStatus(state).championEligible,i===3);
 }
 assert.equal(state.paragonProgress.losses,4);
});
test('Phase 13.2 chamber gates open in order and always allow retreat',()=>{
 const T={wall:1,stone:2,mat:3,path:4,door:5};
 const ctx=extract('const CHAMPIONSHIP_ROOMS=','function buildChampionshipHall(',{T,W:38,H:34,tiles:[],leagueEligible:state=>state.badges===8});
 vm.runInContext(`function put(x,y,t){tiles[y][x]=t}function rect(x,y,w,h,t){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,t)}function borders(t){rect(0,0,W,H,t)}`,ctx);
 for(let stage=-1;stage<=4;stage++){
  ctx.state={badges:8,paragonProgress:{registered:stage>=0,cleared:Array.from({length:Math.max(0,stage)},(_,i)=>'paragon-'+(i+1))}};
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.wall));championshipHallGeometry(state);return tiles})()`,ctx);
  const seen=new Set(['19,31']),q=[[19,31]];
  for(let k=0;k<q.length;k++){const [x,y]=q[k];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,key=a+','+b;if(![T.stone,T.mat,T.path,T.door].includes(tiles[b]?.[a])||seen.has(key))continue;seen.add(key);q.push([a,b]);}}
  assert.ok(seen.has('19,33'));
  for(const [i,p] of ['5,7','24,7','5,18','24,18'].entries())assert.equal(seen.has(p),stage>=i,p);
  assert.equal(seen.has('19,8'),stage===4);
 }
});

test('Phase 13.3 Warden Veyra uses valid mixed-type defensive loadouts',()=>{
 const ctx=extract('const CHAMPIONSHIP_ROOMS=','function buildChampionshipHall(',{leagueEligible:state=>state.badges===8});
 const member=vm.runInContext('PARAGON_MEMBERS[0]',ctx);
 assert.equal(member.active,true);assert.equal(member.team.length,6);
 const types=new Set(),moveById=new Map(moves.map(m=>[m.id,m]));
 for(const t of member.team){
  const sp=species.find(s=>s.speciesId===t.speciesId);assert.ok(sp,t.speciesId);
  sp.types.forEach(type=>types.add(type));assert.equal(t.moves.length,4);
  assert.equal(new Set(t.moves).size,4);
  for(const id of t.moves){
   const m=moveById.get(id);assert.ok(m,id);
   assert.ok(sp.levelUp.some(q=>q.moveId===id&&q.level<=t.level)||(['restore-spark','second-breath'].includes(id)&&m.type==='Typeless'&&m.requiredLevelGuide<=t.level),id);
  }
  assert.ok(t.moves.some(id=>moveById.get(id).target==='enemy'&&moveById.get(id).power>0));
 }
 assert.ok(types.size>=5);
 const state={badges:8};ctx.registerParagon(state);
 assert.equal(ctx.paragonBattleReady('paragon-1',state),true);
 assert.equal(ctx.recordParagonWin('paragon-1',state),true);
 assert.equal(ctx.paragonChamberOpen(1,state),true);
});
test('Phase 13.3 defensive AI prefers early defense and injured recovery without full-HP healing',()=>{
 const foe={hp:100,maxHp:100,movePP:{guard:10,heal:5}},stages={defense:0};
 const ctx=extract('function trainerTactics(','function chooseTrainerAction(',{
  battle:{id:'paragon-1',turn:1,enemies:[foe]},s:{party:[]},STAGE_LIMIT:6,battleStages:()=>stages
 });
 const guard={id:'guard',target:'self',category:'status',effect:{id:'raise_stat',stat:'defense',chance:100}};
 const heal={id:'heal',target:'self',category:'status',effect:{id:'heal',fraction:.5,chance:100}};
 assert.ok(ctx.trainerMoveScore(foe,guard,0,0)>0);
 assert.ok(ctx.trainerMoveScore(foe,heal,0,0)<0);
 stages.defense=2;assert.ok(ctx.trainerMoveScore(foe,guard,0,0)<0);
 foe.hp=40;assert.ok(ctx.trainerMoveScore(foe,heal,0,0)>0);
});

test('Phase 13.4 Marshal Kael uses legal mixed-type offensive loadouts and unlocks chamber III',()=>{
 const ctx=extract('const CHAMPIONSHIP_ROOMS=','function buildChampionshipHall(',{leagueEligible:state=>state.badges===8});
 const member=vm.runInContext('PARAGON_MEMBERS[1]',ctx);
 assert.equal(member.active,true);assert.equal(member.team.length,6);
 const by=new Map(moves.map(m=>[m.id,m])),types=new Set();
 for(const t of member.team){
  const sp=species.find(s=>s.speciesId===t.speciesId);assert.ok(sp,t.speciesId);
  sp.types.forEach(type=>types.add(type));assert.equal(t.moves.length,4);assert.equal(new Set(t.moves).size,4);
  for(const id of t.moves){assert.ok(by.has(id),id);assert.ok(sp.levelUp.some(q=>q.moveId===id&&q.level<=t.level),id);}
  assert.ok(t.moves.some(id=>by.get(id).power>0));
 }
 assert.ok(types.size>=6);
 const state={badges:8};ctx.registerParagon(state);
 assert.equal(ctx.paragonBattleReady(member.id,state),false);
 assert.equal(ctx.recordParagonWin('paragon-1',state),true);
 assert.equal(ctx.paragonBattleReady(member.id,state),true);
 assert.equal(ctx.recordParagonWin(member.id,state),true);
 assert.equal(ctx.recordParagonWin(member.id,state),false);
 assert.equal(ctx.paragonChamberOpen(2,state),true);
 assert.equal(ctx.paragonStatus(state).championEligible,false);
});
test('Phase 13.4 offensive AI rewards finishing blows and avoids wasted setup and risky recoil',()=>{
 const foe={hp:100,maxHp:100,moves:['strike'],movePP:{strike:10,boost:10,burst:10,recoil:10,speed:10}};
 const target={hp:100,maxHp:100},stages={attack:0};
 const attack={id:'strike',target:'enemy',category:'physical',power:50};
 const boost={id:'boost',target:'self',category:'status',effect:{id:'raise_stat',stat:'attack'}};
 const speed={id:'speed',target:'self',category:'status',effect:{id:'raise_stat',stat:'speed'}};
 const burst={id:'burst',target:'enemy',category:'physical',power:50,effect:{id:'recharge'}};
 const recoil={id:'recoil',target:'enemy',category:'physical',power:50,effect:{id:'recoil',fraction:.2}};
 const ctx=extract('function trainerTactics(','function chooseTrainerAction(',{battle:{id:'paragon-2',turn:1,enemies:[foe]},s:{party:[target]},STAGE_LIMIT:6,battleStages:()=>stages,validMove:id=>id==='strike'?attack:null,predictedMoveDamage:()=>30});
 const score=m=>ctx.trainerMoveScore(foe,m,0,0);
 assert.ok(score(attack)>score(burst));assert.ok(score(boost)>0);assert.ok(score(speed)<0);
 stages.attack=2;assert.ok(score(boost)<0);
 target.hp=25;assert.ok(score(attack)>75);
 foe.hp=15;target.hp=100;assert.ok(score(recoil)<score(attack));
});

test('Phase 13.5 Sage Nyra has legal control loadouts and unlocks Chamber IV',()=>{
 const ctx=extract('const CHAMPIONSHIP_ROOMS=','function buildChampionshipHall(',{leagueEligible:state=>state.badges===8});
 const member=vm.runInContext('PARAGON_MEMBERS[2]',ctx),by=new Map(moves.map(m=>[m.id,m]));
 assert.equal(member.active,true);assert.equal(member.team.length,6);
 for(const t of member.team){
  const sp=species.find(s=>s.speciesId===t.speciesId);assert.ok(sp,t.speciesId);
  assert.equal(t.moves.length,4);assert.equal(new Set(t.moves).size,4);
  for(const id of t.moves){assert.ok(by.has(id),id);assert.ok(sp.levelUp.some(q=>q.moveId===id&&q.level<=t.level),id);}
  assert.ok(t.moves.some(id=>by.get(id).power>0));
  assert.ok(t.moves.some(id=>by.get(id).effect?.id==='terrain'));
  assert.ok(t.moves.some(id=>by.get(id).effect?.id==='ailment'));
 }
 const state={badges:8};ctx.registerParagon(state);
 assert.equal(ctx.paragonBattleReady(member.id,state),false);
 assert.equal(ctx.recordParagonWin('paragon-1',state),true);
 assert.equal(ctx.paragonBattleReady(member.id,state),false);
 assert.equal(ctx.recordParagonWin('paragon-2',state),true);
 assert.equal(ctx.paragonBattleReady(member.id,state),true);
 assert.equal(ctx.recordParagonWin(member.id,state),true);
 assert.equal(ctx.recordParagonWin(member.id,state),false);
 assert.equal(ctx.paragonChamberOpen(3,state),true);
 assert.equal(ctx.paragonStatus(state).championEligible,false);
});
test('Phase 13.5 control AI avoids redundant conditions and terrain',()=>{
 const foe={hp:100,maxHp:100,type:'Venom',moves:['strike'],movePP:{strike:10,status:10,terrain:10,lower:10}};
 const target={hp:100,maxHp:100},stages={defense:0};
 const attack={id:'strike',target:'enemy',category:'physical',power:50,type:'Venom'};
 const status={id:'status',target:'enemy',category:'status',effect:{id:'ailment',name:'poison'}};
 const terrain={id:'terrain',target:'field',category:'status',effect:{id:'terrain'}};
 const lower={id:'lower',target:'enemy',category:'status',effect:{id:'lower_stat',stat:'defense'}};
 const battle={id:'paragon-3',turn:1,enemies:[foe],allySlots:[0]};
 const ctx=extract('function trainerTactics(','function chooseTrainerAction(',{battle,s:{party:[target]},STAGE_LIMIT:6,battleStages:()=>stages,validMove:id=>id==='strike'?attack:null,predictedMoveDamage:()=>30});
 const score=m=>ctx.trainerMoveScore(foe,m,0,0);
 assert.ok(score(status)>score(attack));target.status='poison';assert.ok(score(status)<0);
 assert.ok(score(terrain)>0);battle.terrain={type:'Venom',turns:3};assert.ok(score(terrain)<0);
 battle.terrain={type:'Fire',turns:3};assert.ok(score(terrain)>0);
 assert.ok(score(lower)>0);stages.defense=-2;assert.ok(score(lower)<0);
 target.hp=20;assert.ok(score(attack)>score(status));
});

test('Phase 13.6 Arbiter Soren roster and complete Paragon progression',()=>{
 const ctx=extract('const CHAMPIONSHIP_ROOMS=','function buildChampionshipHall(',{leagueEligible:state=>state.badges===8});
 const member=vm.runInContext('PARAGON_MEMBERS[3]',ctx),by=new Map(moves.map(m=>[m.id,m]));
 assert.equal(member.active,true);assert.equal(member.team.length,6);
 for(const t of member.team){
  const sp=species.find(s=>s.speciesId===t.speciesId);assert.ok(sp,t.speciesId);
  assert.equal(t.moves.length,4);assert.equal(new Set(t.moves).size,4);
  for(const id of t.moves){assert.ok(by.has(id),id);assert.ok(sp.levelUp.some(q=>q.moveId===id&&q.level<=t.level)||(['restore-spark','second-breath'].includes(id)&&by.get(id).requiredLevelGuide<=t.level),id);}
  assert.ok(t.moves.some(id=>by.get(id).power>0));
 }
 const state={badges:8};assert.equal(ctx.registerParagon(state),true);
 for(let i=1;i<=4;i++){const id='paragon-'+i;assert.equal(ctx.paragonBattleReady(id,state),true);assert.equal(ctx.paragonStatus(state).championEligible,false);assert.equal(ctx.recordParagonWin(id,state),true);assert.equal(ctx.recordParagonWin(id,state),false);}
 assert.equal(ctx.paragonStatus(state).championEligible,true);
 assert.equal(ctx.paragonStatus(JSON.parse(JSON.stringify(state))).championEligible,true);
});
test('Phase 13.6 adaptive AI chooses defense, recovery or finishing pressure by context',()=>{
 const foe={hp:100,maxHp:100,type:'Ice',moves:['strike'],movePP:{strike:10,heal:10,defense:10,status:10}},target={hp:100,maxHp:100,moves:['strike'],movePP:{strike:10}},stages={defense:0};
 const attack={id:'strike',target:'enemy',category:'physical',power:50,type:'Ice'};
 const heal={id:'heal',target:'self',category:'status',effect:{id:'heal',fraction:.5}};
 const defense={id:'defense',target:'self',category:'status',effect:{id:'raise_stat',stat:'defense'}};
 const status={id:'status',target:'enemy',category:'status',effect:{id:'ailment',name:'chill'}};
 const ctx=extract('function trainerTactics(','function chooseTrainerAction(',{battle:{id:'paragon-4',turn:1,enemies:[foe],allySlots:[0]},s:{party:[target]},STAGE_LIMIT:6,battleStages:()=>stages,validMove:id=>id==='strike'?attack:null,predictedMoveDamage:()=>30});
 const score=m=>ctx.trainerMoveScore(foe,m,0,0);
 assert.ok(score(heal)<0);assert.ok(score(defense)>0);
 foe.hp=40;assert.ok(score(heal)>score(attack));
 target.hp=20;assert.ok(score(attack)>score(heal));assert.ok(score(status)<0);
});

test('Phase 13.7 Champion rival keeps original evolved partner and legal adaptive roster',()=>{
 const ctx=extract('const CHAMPIONSHIP_ROOMS=','function buildChampionshipHall(',{leagueEligible:state=>state.badges===8});
 const by=new Map(moves.map(m=>[m.id,m]));
 for(const [starter,rival,ace] of [['Rock','Water','cr-003-starter-water-3'],['Water','Electric','cr-009-starter-electric-3'],['Electric','Rock','cr-006-starter-rock-3']]){
  const state={badges:8,starter,rival},roster=ctx.championRoster(state);
  assert.equal(roster.length,6);assert.equal(roster[5].speciesId,ace);assert.equal(new Set(roster.map(t=>t.speciesId)).size,6);
  for(const t of roster){const sp=species.find(s=>s.speciesId===t.speciesId);assert.ok(sp);assert.equal(t.moves.length,4);assert.equal(new Set(t.moves).size,4);
   for(const id of t.moves){assert.ok(by.has(id));assert.ok(sp.levelUp.some(q=>q.moveId===id&&q.level<=t.level)||(id==='restore-spark'&&by.get(id).requiredLevelGuide<=t.level));}
   assert.ok(t.moves.some(id=>by.get(id).power>0));
  }
  assert.equal(ctx.championBattleReady(state),false);ctx.registerParagon(state);
  for(let i=1;i<=4;i++){assert.equal(ctx.championBattleReady(state),false);assert.equal(ctx.recordParagonWin('paragon-'+i,state),true);}
  assert.equal(ctx.championBattleReady(state),true);assert.equal(ctx.recordChampionWin(state),true);assert.equal(ctx.recordChampionWin(state),false);
  assert.equal(ctx.championBattleReady(JSON.parse(JSON.stringify(state))),false);assert.equal(ctx.championRoster({starter})[5].speciesId,ace);
 }
});

test('Phase 13.8 Hall of Fame preserves winning party and one-time ceremony reward',()=>{
 const ctx=extract('const CHAMPIONSHIP_ROOMS=','function buildChampionshipHall(',{leagueEligible:state=>state.badges===8});
 for(const starter of ['Water','Rock','Electric']){
  const state={badges:8,starter,name:'Test',worldDay:23,party:[{speciesId:'test',name:'Original',types:['Water'],level:70},{isEgg:true,egg:{}},{name:'Second',type:'Rock',level:80}],trainerProgress:{outfits:['original']}};
  assert.equal(ctx.ensureHallOfFame(state),null);assert.equal(ctx.completeChampionCeremony(state),false);
  ctx.registerParagon(state);
  for(let i=1;i<=4;i++){assert.equal(ctx.championRecognized(state),false);assert.equal(ctx.recordParagonWin('paragon-'+i,state),true);}
  assert.equal(ctx.recordChampionWin(state),true);assert.equal(ctx.championRecognized(state),true);
  const h=ctx.ensureHallOfFame(state);assert.equal(h.party.length,2);assert.equal(h.day,23);
  state.party[0].name='Changed';state.party[0].types[0]='Fire';state.party=[];
  assert.equal(h.party[0].name,'Original');assert.equal(h.party[0].types[0],'Water');
  assert.equal(ctx.completeChampionCeremony(state),true);assert.equal(ctx.completeChampionCeremony(state),false);
  assert.equal(state.trainerProgress.outfits.filter(x=>x==='champion').length,1);
  assert.equal(ctx.recordChampionWin(state),false);
  const reload=JSON.parse(JSON.stringify(state));assert.equal(ctx.ensureHallOfFame(reload).party.length,2);assert.equal(ctx.completeChampionCeremony(reload),false);
  delete reload.paragonProgress.hallOfFame;delete reload.paragonProgress.ceremonyComplete;
  const legacy=ctx.ensureHallOfFame(reload);assert.equal(legacy.legacy,true);assert.equal(legacy.day,null);assert.equal(legacy.party.length,0);
  assert.equal(ctx.completeChampionCeremony(reload),true);assert.equal(reload.trainerProgress.outfits.filter(x=>x==='champion').length,1);
 }
});

test('Phase 13.9 malformed championship flags cannot bypass the Paragon',()=>{
 const ctx=extract('const CHAMPIONSHIP_ROOMS=','function buildChampionshipHall(',{leagueEligible:state=>state.badges===8});
 const state={badges:8,paragonProgress:{registered:true,cleared:['paragon-2'],championDefeated:true,ceremonyComplete:true,hallOfFame:{party:[]}}};
 assert.equal(ctx.championRecognized(state),false);
 assert.equal(state.paragonProgress.championDefeated,false);
 assert.equal(state.paragonProgress.ceremonyComplete,false);
 assert.equal(state.paragonProgress.hallOfFame,undefined);
});
test('Phase 13.9 malformed Hall of Fame rows and missing ceremony outfit recover safely',()=>{
 const ctx=extract('const CHAMPIONSHIP_ROOMS=','function buildChampionshipHall(',{leagueEligible:state=>state.badges===8});
 const state={badges:8,starter:'Water',trainerProgress:{outfits:['original']},paragonProgress:{registered:true,cleared:['paragon-1','paragon-2','paragon-3','paragon-4'],championDefeated:true,ceremonyComplete:true,hallOfFame:{party:[null]}}};
 const h=ctx.ensureHallOfFame(state);assert.equal(h.legacy,true);assert.equal(h.party.length,0);
 assert.ok(state.trainerProgress.outfits.includes('champion'));
 assert.equal(ctx.completeChampionCeremony(state),false);
});
test('Phase 13.9 final arena has room to approach the rival from either side without bypassing gates',()=>{
 const T={wall:1,stone:2,mat:3,path:4,door:5};
 const ctx=extract('const CHAMPIONSHIP_ROOMS=','function buildChampionshipHall(',{T,W:38,H:34,tiles:[],leagueEligible:state=>state.badges===8});
 vm.runInContext(`function put(x,y,t){tiles[y][x]=t}function rect(x,y,w,h,t){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,t)}function borders(t){rect(0,0,W,H,t)}`,ctx);
 for(let stage=-1;stage<=4;stage++){
  ctx.state={badges:8,paragonProgress:{registered:stage>=0,cleared:Array.from({length:Math.max(0,stage)},(_,i)=>'paragon-'+(i+1))}};
  const tiles=vm.runInContext(`(()=>{tiles=Array.from({length:H},()=>Array(W).fill(T.wall));championshipHallGeometry(state);return tiles})()`,ctx);
  const blocked=new Set(['12,28','13,28','14,28','25,28','4,28','5,28','6,28','30,28','31,28','32,28','4,31','30,31','13,27','24,26','19,6','9,7','28,7','9,18','28,18']);
  const seen=new Set(['19,31']),q=[[19,31]];
  for(let k=0;k<q.length;k++){const [x,y]=q[k];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,key=a+','+b;if(![T.stone,T.mat,T.path,T.door].includes(tiles[b]?.[a])||seen.has(key)||blocked.has(key))continue;seen.add(key);q.push([a,b]);}}
  assert.ok(seen.has('19,33'));
  for(const [i,p] of ['5,7','24,7','5,18','24,18'].entries())assert.equal(seen.has(p),stage>=i,p);
  assert.equal(seen.has('19,7'),stage===4);
  if(stage===4){assert.ok(seen.has('18,6'));assert.ok(seen.has('20,6'));}
 }
});
test('Phase 13.9 championship mutual knockout is not a victory',()=>{
 const turn=game.slice(game.indexOf('async function resolveTeamTurn('),game.indexOf('function capture(){'));
 assert.equal((turn.match(/!s\.party\.some\(p=>!isEgg\(p\)&&p\.hp>0\)&&battle\.paragon\)return blackout\(\)/g)||[]).length,2);
});

test('Phase 14.1 story migration preserves completed milestones and reserved chapters',()=>{
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{});
 for(let badges=0;badges<=8;badges++){
  const state={badges,introComplete:true,story:{flags:{custom:true,invalid:'true'}}};
  ctx.normalizeStoryState(state);
  assert.equal(state.story.version,2);assert.equal(state.story.flags.custom,true);assert.equal(state.story.flags.invalid,undefined);
  assert.equal(ctx.storyChapterStatus('opening',state),'complete');
  assert.equal(ctx.storyChapterStatus('firstBadge',state),badges?'complete':'available');
  for(let i=1;i<=8;i++)assert.equal(ctx.storyFlag('regionalBadge'+i,state),i<=badges);
  for(const chapter of vm.runInContext('STORY_CHAPTERS.filter(q=>!q.active)',ctx)){
   assert.equal(ctx.storyChapterStatus(chapter.id,state),'reserved');
   assert.equal(ctx.setStoryFlag(chapter.milestone,state),false);
  }
 }
 const state={badges:8,paragonProgress:{registered:true,cleared:['paragon-1','paragon-2','paragon-3','paragon-4'],championDefeated:true,ceremonyComplete:true}};
 ctx.normalizeStoryState(state);assert.equal(ctx.storyFlag('hallOfFame',state),true);
 assert.equal(ctx.storyFlag('hallOfFame',JSON.parse(JSON.stringify(state))),true);
});
test('Phase 14.1 story scenes commit only after completion and reject stale callbacks',()=>{
 let callbacks=[],saves=0;
 const state={introComplete:true,badges:1};
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{s:state,say:(lines,cb)=>callbacks.push(cb),save:()=>saves++});
 assert.equal(ctx.storyScene('researchDebrief',['test']),true);
 assert.equal(ctx.storyScene('researchDebrief',['test']),false);
 assert.equal(ctx.storyFlag('researchDebrief',state),false);callbacks.shift()();
 assert.equal(ctx.storyFlag('researchDebrief',state),true);assert.equal(saves,1);
 assert.equal(ctx.storyScene('researchDebrief',['test']),false);
 assert.equal(ctx.storyScene('grassCeremony',['test']),true);ctx.s={};callbacks.shift()();
 assert.equal(ctx.storyFlag('grassCeremony',ctx.s),false);
});

test('Phase 14.2 rival encounters unlock at two, four and six badges without gating the championship',()=>{
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{});
 for(const q of vm.runInContext('RIVAL_JOURNEY',ctx)){
  for(let badges=0;badges<=8;badges++){
   assert.equal(ctx.rivalEncounterAvailable(q.id,{introComplete:true,badges,starter:'Rock'}),badges>=q.badges);
   assert.equal(ctx.rivalEncounterAvailable(q.id,{introComplete:false,badges,starter:'Rock'}),false);
  }
  assert.equal(ctx.rivalEncounterAvailable(q.id,{introComplete:true,badges:8,starter:'Rock',paragonProgress:{championDefeated:true}}),false);
  for(const [id,level] of q.team){assert.ok(species.some(p=>p.speciesId===id));assert.ok(level<q.level);}
  const state={introComplete:true,badges:q.badges,defeated:{[q.id]:true}};
  ctx.normalizeStoryState(state);assert.equal(state.story.flags[q.id+'Won'],true);
  assert.equal(ctx.normalizeStoryState(JSON.parse(JSON.stringify(state))).flags[q.id+'Won'],true);
 }
});
test('Phase 14.2 rival retains the same starter family through evolution',()=>{
 const registry=new Map(species.map(p=>[p.speciesId,p]));
 for(const [rival,id] of [['Water','cr-001-starter-water-1'],['Rock','cr-004-starter-rock-1'],['Electric','cr-007-starter-electric-1']]){
  const ctx=extract('function rivalPartnerAtLevel(','function startTrainer(',{s:{rival},starterSpeciesId:()=>id,speciesRegistry:registry,critter:(speciesId,level)=>({speciesId,level})});
  const second=registry.get(id).evolvesTo.speciesId,third=registry.get(second).evolvesTo.speciesId;
  assert.equal(ctx.rivalPartnerAtLevel(24).speciesId,second);
  assert.equal(ctx.rivalPartnerAtLevel(42).speciesId,third);
  assert.equal(ctx.rivalPartnerAtLevel(56).speciesId,third);
 }
});

test('Phase 14.3 Eclipse first contact is badge gated, persistent and recoverable',()=>{
 let callbacks=[],saves=0;
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{s:{},say:(lines,cb)=>{if(cb)callbacks.push(cb)},save:()=>saves++});
 for(let badges=0;badges<=8;badges++){
  assert.equal(ctx.eclipseIntroAvailable({introComplete:true,badges}),badges>=1);
  assert.equal(ctx.eclipseIntroAvailable({introComplete:false,badges}),false);
 }
 for(const q of vm.runInContext('ECLIPSE_INTRO_SITES',ctx)){
  const state={introComplete:true,badges:1,area:q.area};ctx.s=state;
  assert.equal(ctx.storyChapterStatus('eclipseIntro',state),'available');
  ctx.eclipseContactDialogue(q.id);assert.equal(ctx.storyFlag('eclipseIntroduced',state),false);
  callbacks.shift()();assert.equal(ctx.storyFlag('eclipseIntroduced',state),true);
  assert.equal(ctx.storyFlag('eclipseContact:'+q.id,state),true);
  assert.equal(ctx.storyChapterStatus('eclipseOperations',state),'available');
  assert.equal(ctx.storyFlag('eclipseIntroduced',JSON.parse(JSON.stringify(state))),true);
  const before=saves;ctx.eclipseContactDialogue(q.id);assert.equal(saves,before);
  delete state.story.flags.eclipseIntroduced;ctx.eclipseContactDialogue(q.id);
  assert.equal(ctx.storyFlag('eclipseIntroduced',state),true);
 }
});

test('Phase 14.4 Eclipse operations require introduction and badge thresholds, persist independently, and unlock no reserved chapters',()=>{
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{});
 const ops=vm.runInContext('ECLIPSE_OPERATIONS',ctx);
 assert.equal(ops.length,3);
 const state={introComplete:true,badges:8,defeated:{}};
 ctx.normalizeStoryState(state);
 for(const q of ops){
  assert.equal(ctx.eclipseOperationAvailable(q.id,state),false);
  assert.ok(q.team.every(([id,level])=>species.some(p=>p.speciesId===id)&&level>=1&&level<=100));
 }
 assert.equal(ctx.setStoryFlag('eclipseIntroduced',state),true);
 for(const q of ops){
  for(let badges=0;badges<=8;badges++)assert.equal(ctx.eclipseOperationAvailable(q.id,{...state,badges}),badges>=q.badges);
  assert.equal(ctx.eclipseOperationAvailable(q.id,{...state,introComplete:false}),false);
 }
 for(const q of [...ops].reverse()){
  assert.equal(ctx.storyChapterStatus('eclipseOperations',state),'available');
  state.defeated[q.id]=true;ctx.normalizeStoryState(state);
  assert.equal(ctx.storyFlag(q.id+'Won',state),true);
 }
 assert.equal(ctx.storyChapterStatus('eclipseOperations',state),'complete');
 assert.equal(ctx.storyChapterStatus('eclipseOperations',JSON.parse(JSON.stringify(state))),'complete');
 assert.equal(ctx.storyChapterStatus('eclipseFinale',state),'reserved');
 assert.equal(ctx.storyChapterStatus('regionalHistory',state),'available');
});
test('Phase 14.4 completed operations cannot start another battle and loss leaves progress unchanged',()=>{
 let starts=0,callbacks=[];
 const state={introComplete:true,badges:8,area:'harborTown',defeated:{},story:{flags:{eclipseIntroduced:true}}};
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{s:state,battle:null,speciesDataReady:true,moveDataReady:true,speciesRegistry:new Map(species.map(p=>[p.speciesId,p])),firstAlive:()=>0,critter:(id,level)=>({id,level}),startBattle:()=>starts++,say:(lines,cb)=>{if(cb)callbacks.push(cb)}});
 ctx.eclipseOperationDialogue('eclipse-op-harbor');callbacks.shift()();assert.equal(starts,1);
 assert.equal(ctx.storyFlag('eclipse-op-harborWon',state),false);
 ctx.startEclipseOperation('eclipse-op-harbor');assert.equal(starts,2);
 state.defeated['eclipse-op-harbor']=true;
 ctx.startEclipseOperation('eclipse-op-harbor');assert.equal(starts,2);
 ctx.eclipseOperationDialogue('eclipse-op-harbor');assert.equal(callbacks.length,0);
});

test('Phase 14.5 history requires the first badge, both solved puzzles and both translations',()=>{
 const state={introComplete:true,badges:1,area:'ruins',puzzles:{},story:{flags:{}}};
 let callbacks=[],saves=0;
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{s:state,say:(lines,cb)=>{if(cb)callbacks.push(cb)},save:()=>{ctx.normalizeStoryState(state);saves++}});
 assert.equal(ctx.regionalHistoryAvailable({...state,badges:0}),false);
 assert.equal(ctx.regionalHistoryAvailable({...state,introComplete:false}),false);
 assert.equal(ctx.storyChapterStatus('regionalHistory',state),'available');
 assert.equal(ctx.setStoryFlag('regionalHistoryRevealed',state),false);
 ctx.regionalHistoryDialogue('history-ruins-tablet');assert.equal(callbacks.length,0);
 state.puzzles.ruinsOpened=true;
 ctx.regionalHistoryDialogue('history-archive-tablet');assert.equal(callbacks.length,0);
 ctx.regionalHistoryDialogue('history-ruins-tablet');assert.equal(callbacks.length,1);
 assert.equal(ctx.storyFlag('history-ruins-tablet',state),false);callbacks.shift()();
 assert.equal(ctx.storyFlag('history-ruins-tablet',state),true);
 assert.equal(ctx.storyFlag('regionalHistoryRevealed',state),false);
 state.area='oldArchive';state.puzzles.archiveOpened=true;
 ctx.regionalHistoryDialogue('history-archive-tablet');callbacks.shift()();
 assert.equal(ctx.storyChapterStatus('regionalHistory',state),'complete');
 const reload=JSON.parse(JSON.stringify(state));
 assert.equal(ctx.storyChapterStatus('regionalHistory',reload),'complete');
 delete reload.story.flags.regionalHistoryRevealed;
 assert.equal(ctx.storyChapterStatus('regionalHistory',reload),'complete');
 const before=saves;ctx.regionalHistoryDialogue('history-archive-tablet');assert.equal(saves,before);
 assert.equal(ctx.storyChapterStatus('legendaryDragon',state),'available');
 assert.equal(ctx.storyChapterStatus('legendaryPrimordial',state),'available');
 assert.equal(ctx.storyChapterStatus('legendaryBeast',state),'available');
 assert.equal(ctx.storyChapterStatus('eclipseFinale',state),'reserved');
});
test('Phase 14.5 previously solved puzzles do not auto-grant lore or duplicate caches',()=>{
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{});
 const state={introComplete:true,badges:8,puzzles:{ruinsOpened:true,archiveOpened:true},discoveries:{'ruins-cache':true,'oldArchive-cache':true}};
 assert.equal(ctx.storyChapterStatus('regionalHistory',state),'available');
 assert.equal(ctx.storyFlag('history-ruins-tablet',state),false);
 assert.equal(ctx.storyFlag('history-archive-tablet',state),false);
 assert.equal(state.discoveries['ruins-cache'],true);
 assert.equal(state.discoveries['oldArchive-cache'],true);
});

test('Phase 14.6 Drakoryn is a unique story encounter and older captures remain valid',()=>{
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{});
 const state={introComplete:true,badges:1,story:{flags:{regionalHistoryRevealed:true}},party:[],storage:[]};
 assert.equal(ctx.dragonEncounterAvailable(state),true);
 assert.equal(ctx.dragonEncounterAvailable({...state,badges:0}),false);
 assert.equal(ctx.dragonEncounterAvailable({...state,story:{flags:{}}}),false);
 assert.equal(ctx.setStoryFlag('dragonStoryComplete',state),false);
 assert.equal(ctx.storyChapterStatus('legendaryDragon',state),'available');
 for(const id of ['cr-209-drakoryn','cr-198-drakoryn']){
  const old={...state,story:{flags:{regionalHistoryRevealed:true}},storage:[{speciesId:id}]};
  assert.equal(ctx.dragonAlreadyCaptured(old),true);
  assert.equal(ctx.dragonEncounterAvailable(old),false);
  assert.equal(ctx.storyChapterStatus('legendaryDragon',old),'complete');
  assert.equal(ctx.storyChapterStatus('legendaryDragon',JSON.parse(JSON.stringify(old))),'complete');
 }
 const sp=species.find(p=>p.speciesId==='cr-209-drakoryn');
 assert.deepEqual(sp.types,['Dragon','Fire']);
 assert.equal(sp.habitats[0].areaId,'legendaryReserveC');
 assert.equal(sp.habitats[0].maxLevel,29);
});
test('Phase 14.6 encounter retries until captured and uses the wild battle path',()=>{
 let starts=[];
 const state={introComplete:true,badges:8,area:'legendaryReserveC',story:{flags:{regionalHistoryRevealed:true}},party:[],storage:[]};
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{s:state,battle:null,speciesDataReady:true,moveDataReady:true,speciesRegistry:new Map(species.map(p=>[p.speciesId,p])),firstAlive:()=>0,critter:(id,level)=>({speciesId:id,level}),startBattle:b=>starts.push(b)});
 ctx.startDragonEncounter();ctx.startDragonEncounter();
 assert.equal(starts.length,2);assert.equal(starts[0].kind,'wild');assert.equal(starts[0].enemies[0].speciesId,'cr-209-drakoryn');
 state.storage.push({speciesId:'cr-209-drakoryn'});
 ctx.startDragonEncounter();assert.equal(starts.length,2);
});

test('Phase 14.7 Eonolith unlocks independently and recognizes older captures',()=>{
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{});
 const state={introComplete:true,badges:1,story:{flags:{regionalHistoryRevealed:true}},party:[],storage:[]};
 assert.equal(ctx.primordialEncounterAvailable(state),true);
 assert.equal(ctx.primordialEncounterAvailable({...state,badges:0}),false);
 assert.equal(ctx.primordialEncounterAvailable({...state,story:{flags:{}}}),false);
 assert.equal(ctx.setStoryFlag('primordialStoryComplete',state),false);
 assert.equal(ctx.storyChapterStatus('legendaryPrimordial',state),'available');
 for(const id of ['cr-101-eonolith','cr-199-eonolith']){
  const old={...state,story:{flags:{regionalHistoryRevealed:true}},storage:[{speciesId:id}]};
  assert.equal(ctx.primordialAlreadyCaptured(old),true);
  assert.equal(ctx.primordialEncounterAvailable(old),false);
  assert.equal(ctx.storyChapterStatus('legendaryPrimordial',old),'complete');
  assert.equal(ctx.storyChapterStatus('legendaryPrimordial',JSON.parse(JSON.stringify(old))),'complete');
  assert.equal(ctx.storyChapterStatus('legendaryDragon',old),'available');
 }
 const sp=species.find(p=>p.speciesId==='cr-101-eonolith');
 assert.deepEqual(sp.types,['Primordial','Rock']);
 assert.equal(sp.habitats[0].areaId,'legendaryReserveA');
 assert.equal(sp.habitats[0].maxLevel,36);
});
test('Phase 14.7 Eonolith is retryable until capture and cannot spawn again afterward',()=>{
 let starts=[];
 const state={introComplete:true,badges:8,area:'legendaryReserveA',story:{flags:{regionalHistoryRevealed:true}},party:[],storage:[]};
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{s:state,battle:null,speciesDataReady:true,moveDataReady:true,speciesRegistry:new Map(species.map(p=>[p.speciesId,p])),firstAlive:()=>0,critter:(id,level)=>({speciesId:id,level}),startBattle:b=>starts.push(b)});
 ctx.startPrimordialEncounter();ctx.startPrimordialEncounter();
 assert.equal(starts.length,2);assert.equal(starts[0].kind,'wild');assert.equal(starts[0].enemies[0].speciesId,'cr-101-eonolith');
 state.storage.push({speciesId:'cr-101-eonolith'});
 ctx.startPrimordialEncounter();assert.equal(starts.length,2);
});

test('Phase 14.8 Feralune unlocks independently and recognizes legacy captures',()=>{
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{});
 const state={introComplete:true,badges:1,story:{flags:{regionalHistoryRevealed:true}},party:[],storage:[]};
 assert.equal(ctx.beastEncounterAvailable(state),true);
 assert.equal(ctx.beastEncounterAvailable({...state,badges:0}),false);
 assert.equal(ctx.beastEncounterAvailable({...state,story:{flags:{}}}),false);
 assert.equal(ctx.setStoryFlag('beastStoryComplete',state),false);
 assert.equal(ctx.storyChapterStatus('legendaryBeast',state),'available');
 for(const id of ['cr-153-feralune','cr-200-feralune']){
  const old={...state,story:{flags:{regionalHistoryRevealed:true}},storage:[{speciesId:id}]};
  assert.equal(ctx.beastAlreadyCaptured(old),true);
  assert.equal(ctx.beastEncounterAvailable(old),false);
  assert.equal(ctx.storyChapterStatus('legendaryBeast',old),'complete');
  assert.equal(ctx.storyChapterStatus('legendaryBeast',JSON.parse(JSON.stringify(old))),'complete');
  assert.equal(ctx.storyChapterStatus('legendaryDragon',old),'available');
  assert.equal(ctx.storyChapterStatus('legendaryPrimordial',old),'available');
 }
 const sp=species.find(p=>p.speciesId==='cr-153-feralune');
 assert.deepEqual(sp.types,['Beast','Shadow']);
 assert.equal(sp.habitats[0].areaId,'legendaryReserveB');
 assert.equal(sp.habitats[0].maxLevel,42);
});
test('Phase 14.8 Feralune retries until captured and uses standard wild battle',()=>{
 let starts=[];
 const state={introComplete:true,badges:8,area:'legendaryReserveB',story:{flags:{regionalHistoryRevealed:true}},party:[],storage:[]};
 const ctx=extract('const STORY_STRUCTURE=','function researcherStoryDialogue(',{s:state,battle:null,speciesDataReady:true,moveDataReady:true,speciesRegistry:new Map(species.map(p=>[p.speciesId,p])),firstAlive:()=>0,critter:(id,level)=>({speciesId:id,level}),startBattle:b=>starts.push(b)});
 ctx.startBeastEncounter();ctx.startBeastEncounter();
 assert.equal(starts.length,2);assert.equal(starts[0].kind,'wild');assert.equal(starts[0].enemies[0].speciesId,'cr-153-feralune');
 state.storage.push({speciesId:'cr-153-feralune'});
 ctx.startBeastEncounter();assert.equal(starts.length,2);
});
