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
