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
 assert.equal(species.length,200);
 assert.equal(moves.length,312);
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
 battle.uiMenu='index';sandbox.renderBattle();
 assert.match(screen,/id="indexSwitch"/);assert.match(screen,/id="indexItem"/);assert.match(screen,/id="indexCapture"/);
 battle.uiMenu='items';sandbox.renderBattle();
 assert.match(screen,/id="potion"/);assert.match(screen,/id="revive"/);
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
