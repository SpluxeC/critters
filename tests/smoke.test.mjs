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
 const sandbox=vm.createContext({s,speciesRegistry:registry,starterSpeciesId:()=>starterId});
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
 const expected=[["Bubblit","assets/critters/starters/water.png"],["Rillisk","assets/critters/gallery/water-starter-stage-2.png"],["Tiderax","assets/critters/gallery/water-starter-stage-3.png"],["Grumlet","assets/critters/starters/rock.png"],["Craghorn","assets/critters/gallery/rock-starter-stage-2.png"],["Titanstag","assets/critters/gallery/rock-starter-stage-3.png"],["Zappit","assets/critters/starters/electric.png"],["Voltimp","assets/critters/gallery/electric-starter-stage-2.png"],["Stormbrute","assets/critters/gallery/electric-starter-stage-3.png"]];
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
 const sandbox=vm.createContext({s,screen:'game',modal:false,$:()=>stick,save:()=>saves++});
 vm.runInContext(game.slice(start,end),sandbox);
 assert.equal(sandbox.movementStepInterval(),135);
 assert.equal(sandbox.movementStepDuration(),120);
 sandbox.toggleMovementMode();
 assert.equal(s.movementMode,'walk');
 assert.equal(sandbox.movementStepInterval(),235);
 assert.equal(sandbox.movementStepDuration(),210);
 assert.ok(state.labels.some(([k,v])=>k==='aria-label'&&v.includes('Walk mode')));
 sandbox.toggleMovementMode();
 assert.equal(s.movementMode,'run');
 assert.ok(state.labels.some(([k,v])=>k==='aria-label'&&v.includes('Run mode')));
 assert.equal(saves,2);
});
test('portrait UI has joystick double-tap speed and contextual Interact',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/id="movementToggle"/);
 assert.match(html,/id="talk"[^>]*>Interact<\/button>/);
 assert.ok(!html.includes('Talk / Use</button>'));
 assert.match(game,/checkJoystickDoubleTap\(e\)/);
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
 assert.match(game,/menuTo\(mode==='battle'\?'root':'battle'\)/);
 assert.match(game,/id="menuBattle" aria-pressed=/);
 assert.doesNotMatch(game,/id="battleGuard"|id="battleFocus"|Choose a move/);
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
 assert.match(game,/function checkJoystickDoubleTap\(e\)/);
 assert.match(game,/JOYSTICK_DOUBLE_TAP_MS=330/);
 assert.match(game,/function canInteractAhead\(\)/);
 assert.match(game,/function updateInteractVisibility\(\)/);
 assert.match(html,/\.actions #talk\.interactable/);
 assert.match(game,/Money: /);
 assert.doesNotMatch(game,/ credits!/);
});

test('v76 inactive Interact is more visible and joystick hint does not move input',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/class="joystickHelp" aria-hidden="true">Double Tap-Run\/Walk<\/span>/);
 assert.match(html,/#game \.joystickHelp\{\s*position:fixed/);
 assert.match(html,/background:rgba\(164,93,72,0\.30\)!important/);
 assert.match(html,/opacity:\.58!important/);
});

test('v77 player and encyclopedia tabs consolidate former root tabs',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(game,/const INDEX_TABS=\[\['clock','Index'\],\['player','Player'\],\['encyclopedia','Encyclopedia'\],\['tools','Tools'\]\]/);
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
 assert.match(game,/indexTab='clock';playerIndexSection='bag'/);
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
