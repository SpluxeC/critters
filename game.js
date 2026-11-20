(()=>{
'use strict';
const $=id=>document.getElementById(id),C=$('world'),ctx=C.getContext('2d');ctx.imageSmoothingEnabled=false;
const S=32,W=34,H=26;
const T={grass:0,path:1,tree:2,roof:3,wall:4,door:5,rice:6,flower:7,wood:8,desk:9,mat:10,tall:11,rock:12,water:13,hedge:14,gate:15,stone:16};
const palette=['#75a65e','#c6ae82','#38683d','#88684f','#baa78a','#403127','#b7bd6a','#88a961','#b38c6d','#856348','#d9c595','#507e41','#867c6b','#5a9aa5','#397b3e','#7b5c39','#b6b1a0'];
const strengths={Fire:['Grass','Ice'],Water:['Fire','Rock'],Grass:['Water','Shadow'],Rock:['Electric','Venom'],Electric:['Water','Flying'],Ice:['Dragon','Ghost'],Flying:['Beast','Fighting'],Shadow:['Ghost','Psychic'],Ghost:['Psychic','Primordial'],Dragon:['Electric','Primordial'],Venom:['Grass','Flying'],Beast:['Dragon','Shadow'],Primordial:['Beast','Fire'],Psychic:['Fighting','Venom'],Fighting:['Rock','Ice']};
const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]},symbols={Rock:'⛰',Water:'💧',Electric:'⚡',Grass:'🌿',Beast:'🐾',Flying:'🪽',Venom:'☣',Fire:'🔥',Ice:'❄',Ghost:'◈',Shadow:'◉',Psychic:'✦',Fighting:'⚔',Dragon:'◇',Primordial:'✧'};
const sprites={male:new Image(),female:new Image()};sprites.male.src='assets/male.png';sprites.female.src='assets/female.png';
let s=null,screen='title',tiles=[],npcs=[],dialog=[],dialogDone=null,modal=false,battle=null,frame=0,held={},last=0,editing=false;
const read=()=>{try{return JSON.parse(localStorage.getItem('critters-v1'))}catch{return null}};
function save(){if(s){s.version=4;localStorage.setItem('critters-v1',JSON.stringify(s));$('continue').hidden=false}}
function show(page){document.querySelectorAll('.screen').forEach(p=>p.classList.toggle('show',p.id===page));screen=page}
function critter(type,level=5){const hp=20+level*4;return {type,level,hp,maxHp:hp,xp:0,status:'',moves:['Strike',type+' Pulse','Guard','Focus']}}
function migrate(){
 if(!s)return;
 s.area=s.area||'village';if(!['village','lab','route1','town','route2','forest','route3','cave','garden','gym'].includes(s.area))s.area='village';
 s.x=Number.isFinite(s.x)?s.x:17;s.y=Number.isFinite(s.y)?s.y:16;s.face=s.face||'down';
 if(!Array.isArray(s.party))s.party=s.starter?[critter(s.starter,5)]:[];
 s.party=s.party.map(p=>({...critter(p.type||'Rock',p.level||5),...p,maxHp:p.maxHp||36,hp:typeof p.hp==='number'?p.hp:36})).slice(0,8);
 if(!Array.isArray(s.storage))s.storage=[];s.storage=s.storage.map(p=>({...critter(p.type||'Grass',p.level||3),...p}));
 s.captureCount=s.captureCount||0;s.money=Number.isFinite(s.money)?s.money:250;
 s.inventory=s.inventory||{Potion:4,Revive:1};s.modules=Array.isArray(s.modules)?s.modules:[];s.installed=Array.isArray(s.installed)?s.installed:[];
 s.defeated=s.defeated||{};s.puzzles=s.puzzles||{};s.badges=s.badges||0;s.cut=s.badges>=1;
 s.rivalPassed=!!s.rivalPassed;s.introComplete=!!s.introComplete;
 if(s.starter&&!s.rival)s.rival={Rock:'Water',Water:'Electric',Electric:'Rock'}[s.starter];
 s.x=Math.max(1,Math.min(W-2,s.x));s.y=Math.max(1,Math.min(H-2,s.y));
}
function put(x,y,t){if(x>=0&&x<W&&y>=0&&y<H)tiles[y][x]=t}
function rect(x,y,w,h,t){for(let a=x;a<x+w;a++)for(let b=y;b<y+h;b++)put(a,b,t)}
function npc(x,y,text,kind='',id=''){npcs.push({x,y,text,kind,id})}
function borders(type=T.tree){for(let x=0;x<W;x++){put(x,0,type);put(x,H-1,type)}for(let y=0;y<H;y++){put(0,y,type);put(W-1,y,type)}}
function houses(list){list.forEach(([x,y,w=7,h=5])=>{rect(x,y,w,h,T.roof);rect(x,y+h,w,2,T.wall);put(x+Math.floor(w/2),y+h+1,T.door)})}
function roads(){rect(1,12,32,3,T.path)}
function nature(seed,area){for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(tiles[y][x]===T.grass){const n=(x*43+y*59+x*y*7+seed)%113;if(n<area)put(x,y,T.tall);else if(n===44||n===79)put(x,y,T.flower)}}
function build(){
 migrate();tiles=Array.from({length:H},()=>Array(W).fill(s.area==='lab'||s.area==='gym'?T.wood:T.grass));npcs=[];
 switch(s.area){
 case 'village':
 borders();roads();rect(16,12,3,13,T.path);rect(7,8,2,5,T.path);rect(24,9,2,4,T.path);houses([[3,3,9,5],[20,3,10,6]]);
 for(let y=17;y<23;y++)for(let x=2;x<12;x++)if((x+y)%5!==0)put(x,y,T.rice);
 for(let y=2;y<11;y++)for(let x=12;x<20;x++)if((x+3*y)%5===0)put(x,y,T.tree);
 nature(8,0);npc(12,14,['Welcome to the valley! The scientist works in the northeast laboratory.']);npc(22,15,['Follow the eastern road toward Route 1!']);
 break;
 case 'lab':
 borders(T.wall);rect(4,7,7,3,T.desk);rect(23,7,7,3,T.desk);rect(13,8,8,4,T.mat);put(17,25,T.door);
 npc(17,7,['Welcome to the research laboratory!','Your Critter Index is a capture device, inventory and party manager.','Choose a Rock, Water or Electric starter.'],'researcher');
 break;
 case 'route1':
 borders();roads();rect(11,7,2,6,T.path);rect(22,14,2,7,T.path);
 for(let y=2;y<12;y++)for(let x=3;x<31;x++)if(x!==11&&x!==12&&(x*7+y*11)%5!==0)put(x,y,(x+y)%4===0?T.rice:T.tall);
 for(let y=16;y<24;y++)for(let x=3;x<31;x++)if(x!==22&&x!==23&&(x*9+y*5)%6!==0)put(x,y,(x+y)%3===0?T.rice:T.tall);
 npc(9,11,['Route 1 has wild Critters hiding in the rice fields.','Use the Index beam when their HP is low.']);
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
 npc(18,13,['The bamboo forest twists around the walking paths.','A hidden woodland clearing lies to the north.']);
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
 npc(25,13,['Mountain foothills rise above the trail.','A cave to the north is blocked by thick vines until you earn the first badge.']);
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
 $('location').textContent={village:'Starting Village',lab:'Research Laboratory',route1:'Route 1 · Rice Fields',town:'Small Town',route2:'Route 2 · Bamboo Forest',forest:'Hidden Forest',route3:'Route 3 · Foothills',cave:'Mountain Cave',garden:'Garden Town',gym:'Grass Gym'}[s.area];
}
function say(lines,callback){dialog=lines.slice();dialogDone=callback||null;advance()}
function advance(){if(dialog.length){$('dialogText').textContent=dialog.shift();$('dialog').classList.add('show')}else{$('dialog').classList.remove('show');const fn=dialogDone;dialogDone=null;if(fn)fn()}}
function sprite(gender,x,y,d,f,scale=1){
 const im=sprites[gender];if(!im.complete||!im.naturalWidth){ctx.fillStyle='#c9685e';ctx.fillRect(x-10,y-28,20,28);return}
 const girl=gender==='female';let row={down:0,up:1,left:2,right:3}[d],col=f;
 if(girl&&d==='left'){row=2;col=f%2}if(girl&&d==='right'){row=2;col=2+f%2}
 const sw=im.width/4,sh=im.height/(girl?3:4),w=32*scale,h=42*scale;
 ctx.drawImage(im,col*sw,row*sh,sw,sh,x-w/2,y-h,w,h)
}
function drawTile(t,x,y,a,b){
 ctx.fillStyle=palette[t]||palette[0];ctx.fillRect(x,y,S,S);
 if([T.grass,T.tall,T.rice,T.flower].includes(t)){ctx.fillStyle=t===T.flower?'#ecc5c8':t===T.rice?'#e6d896':t===T.tall?'#add86d':'#5c914d';for(let k=0;k<3;k++)ctx.fillRect(x+(a*13+b*5+k*9)%25+2,y+(a*7+b*11+k*7)%25+3,3,5)}
 if(t===T.tree){ctx.fillStyle='#234b36';ctx.fillRect(x+3,y+4,26,26);ctx.fillStyle='#5a9759';ctx.fillRect(x+7,y+2,19,17)}
 if(t===T.rock){ctx.fillStyle='#625d59';ctx.fillRect(x+5,y+8,23,19);ctx.fillStyle='#a7a097';ctx.fillRect(x+8,y+6,15,8)}
 if(t===T.roof){ctx.fillStyle='#b38b68';for(let k=0;k<4;k++)ctx.fillRect(x,y+k*8,32,2)}
 if(t===T.wall){ctx.fillStyle='#5c473d';ctx.fillRect(x+3,y,3,30);ctx.fillRect(x+25,y,3,30)}
 if(t===T.door){ctx.fillStyle='#322825';ctx.fillRect(x+5,y+2,22,29);ctx.fillStyle='#f5d37a';ctx.fillRect(x+23,y+17,3,3)}
 if(t===T.desk){ctx.fillStyle='#5b4436';ctx.fillRect(x+3,y+4,26,24)}
 if(t===T.hedge){ctx.fillStyle='#225832';ctx.fillRect(x+1,y+1,30,30);ctx.fillStyle='#76ad55';ctx.fillRect(x+4,y+5,24,9)}
 if(t===T.gate){ctx.fillStyle='#674a31';ctx.fillRect(x+6,y,5,32);ctx.fillRect(x+22,y,5,32)}
 if(t===T.water){ctx.fillStyle='#bee7e5';ctx.fillRect(x+4,y+7,12,3);ctx.fillRect(x+15,y+20,12,3)}
 if(t===T.stone){ctx.fillStyle='#cac0ab';ctx.fillRect(x+3,y+11,16,2)}
}
function draw(){
 if(screen!=='game'||!s)return;
 const ox=Math.max(0,Math.min(W*S-640,s.x*S-320)),oy=Math.max(0,Math.min(H*S-480,s.y*S-240));
 for(let y=Math.floor(oy/S);y<Math.min(H,Math.ceil((oy+480)/S));y++)for(let x=Math.floor(ox/S);x<Math.min(W,Math.ceil((ox+640)/S));x++)drawTile(tiles[y][x],x*S-ox,y*S-oy,x,y);
 for(const p of npcs){let x=p.x*S+16-ox,y=p.y*S+32-oy;ctx.fillStyle='#e2ad80';ctx.fillRect(x-9,y-25,18,24);ctx.fillStyle=p.kind==='researcher'?'#f2e7cd':p.kind==='center'?'#9ad4dc':p.kind==='leader'?'#5b944b':'#965b78';ctx.fillRect(x-8,y-11,16,11);ctx.fillStyle='#4a302c';ctx.fillRect(x-10,y-30,20,10);if(p.kind==='gymtrainer'&&s.defeated[p.id])continue;ctx.fillStyle='#fff1a0';ctx.font='bold 14px monospace';ctx.fillText('!',x-4,y-36)}
 sprite(s.gender,s.x*S+16-ox,s.y*S+32-oy,s.face,frame,1.25);
 ctx.fillStyle='#1c3835dc';ctx.fillRect(5,5,330,28);ctx.fillStyle='#fff1ca';ctx.font='bold 13px system-ui';ctx.fillText(s.name+' · '+(s.starter||'Visit lab')+' · '+s.money+' ◇ · '+s.badges+' Badge',11,23)
}
function region(area,x,y,textLine){s.area=area;s.x=x;s.y=y;build();save();if(textLine)say([textLine])}
function move(d){
 if(screen!=='game'||modal||$('dialog').classList.contains('show'))return;
 s.face=d;const v=dirs[d],x=s.x+v[0],y=s.y+v[1];
 if(s.area==='village'&&d==='right'&&x>=32&&[13,14].includes(y)){if(!s.introComplete)return say(['Complete the laboratory tutorial before exploring Route 1.']);return region('route1',2,y,'Route 1 — Rice Fields. Wild Critters hide in tall grass.')}
 if(s.area==='route1'&&d==='left'&&x<=1&&[13,14].includes(y))return region('village',31,y);
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
 if(npcs.some(p=>p.x===x&&p.y===y))return;
 const t=tiles[y][x];if([T.tree,T.roof,T.wall,T.desk,T.rock,T.water,T.hedge,T.gate].includes(t))return;
 s.x=x;s.y=y;frame=(frame+1)%4;
 if(s.area==='village'&&x===24&&y===10)return region('lab',17,23);
 if(s.area==='lab'&&x===17&&y===25)return region('village',24,12);
 if(s.area==='garden'&&!s.rivalPassed&&Math.abs(s.x-24)+Math.abs(s.y-11)<=3){s.rivalPassed=true;save();return say(['Your childhood rival greets you outside the Grass Gym.','Let us see how much we have improved!'],()=>startTrainer('rival'))}
 if((s.steps=(s.steps||0)+1)%10===0)save();
 if(['route1','route2','route3','forest','cave'].includes(s.area)&&[T.tall,T.rice,T.stone].includes(t)&&s.introComplete&&Math.random()<0.11)startWild()
}
function interact(){
 if(modal)return;if($('dialog').classList.contains('show'))return advance();
 const v=dirs[s.face],x=s.x+v[0],y=s.y+v[1],p=npcs.find(q=>q.x===x&&q.y===y);
 if(p){if(p.kind==='researcher'){if(!s.starter)return say(p.text,starterMenu);return say(['Researcher: Your Critter Index is functioning well. Good luck!'])}
 if(p.kind==='center')return center();
 if(p.kind==='shop')return shop();
 if(p.kind==='gymtrainer')return s.defeated[p.id]?say(['Trainer: Good match! I will keep practicing.']):say(p.text,()=>startTrainer(p.id));
 if(p.kind==='leader')return s.badges?say(['Gym Leader: Your first badge is well earned.']):!s.defeated.g1||!s.defeated.g2||!s.defeated.g3||!s.puzzles.gate?say(['Gym Leader: Defeat all three trainers and open the garden mechanism first.']):startTrainer('leader');
 if(p.kind==='switch'){if(s.defeated.g1&&s.defeated.g2&&s.defeated.g3){s.puzzles.gate=true;build();save();return say(['You activate the garden mechanism. The roots withdraw!'])}return say(['The mechanism is tangled in roots. Defeat all three Gym trainers first.'])}
 return say(p.text)}
 if(s.area==='village'&&x===7&&y===9)return say(['Home sweet home. Captured Critters beyond the eight-party limit are stored here.']);
 if(s.area==='lab'&&x===17&&y===25)return region('village',24,12);
 if(s.area==='garden'&&x===24&&y===10)return enterGym();
 if(s.area==='gym'&&x===17&&y===25)return region('garden',24,12);
}
function enterGym(){if(!s.rivalPassed){s.rivalPassed=true;save();return say(['Your childhood rival is waiting at the Grass Gym entrance!'],()=>startTrainer('rival'))}return region('gym',17,23,'Grass Gym — Find all three trainers in the hedge maze.')}
function open(title,body){modal=true;$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('shade').classList.add('show')}
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
 else {const n=Number(id.slice(1));enemies=[make('Grass',8+n),make(n===2?'Venom':'Grass',9+n)];name='Garden Trainer '+n;award=35+n*10}
 startBattle({kind,enemies,name,award,id},name+' challenges you!')
}
function startBattle(data,msg){battle={...data,enemyIndex:0,allyIndex:firstAlive(),participants:[firstAlive()],defending:false};renderBattle(msg)}
function itemQty(name){return s.inventory[name]||0}
function selectPoke(){const options=s.party.map((p,i)=>'<button class="btn" data-poke="'+i+'" '+(p.hp<=0?'disabled':'')+'>'+symbols[p.type]+' '+p.type+' Lv'+p.level+' HP '+p.hp+'/'+p.maxHp+'</button>').join('');renderBattle('Switch your active Critter:<div class="options">'+options+'</div>');document.querySelectorAll('[data-poke]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.poke);if(!s.party[i]||s.party[i].hp<=0)return;battle.allyIndex=i;if(!battle.participants.includes(i))battle.participants.push(i);enemyTurn('You switched Critters!')})}
function renderBattle(message){
 if(!battle)return;const foe=battle.enemies[battle.enemyIndex],p=s.party[battle.allyIndex];if(!p)return blackout();
 const actions='<div class="options" style="grid-template-columns:1fr 1fr"><button class="btn" id="strike">Strike</button><button class="btn" id="pulse">'+p.type+' Pulse</button><button class="btn" id="guard">Guard</button><button class="btn" id="focus">Focus</button><button class="btn" id="switch">Switch</button><button class="btn" id="potion" '+(!itemQty('Potion')?'disabled':'')+'>Potion ('+itemQty('Potion')+')</button>'+ (battle.kind==='wild'?'<button class="btn" id="capture">Capture Beam</button><button class="btn" id="run">Run</button>':'')+'</div>';
 open(battle.kind==='wild'?'Wild Encounter':battle.name,
 '<div class="battleNames"><div><b>'+escapeHtml(foe.type)+' · Lv '+foe.level+'</b><div class="health"><div style="width:'+Math.max(0,100*foe.hp/foe.maxHp)+'%"></div></div>HP '+foe.hp+'/'+foe.maxHp+'</div><div><b>'+escapeHtml(p.type)+' · Lv '+p.level+'</b><div class="health"><div style="width:'+Math.max(0,100*p.hp/p.maxHp)+'%"></div></div>HP '+p.hp+'/'+p.maxHp+'</div></div><div class="battleScene"><span>'+(symbols[foe.type]||'◇')+'</span><span>'+(symbols[p.type]||'✦')+'</span></div><p>'+message+'</p>'+actions+'<p class="muted" style="font-size:12px">Type advantages and participant-only experience are active. Species art, abilities and final balancing await the original roster.</p>');
 $('close').hidden=true;
 $('strike').onclick=()=>playerMove('Strike');$('pulse').onclick=()=>playerMove('Pulse');$('guard').onclick=()=>{battle.defending=true;enemyTurn('Your Critter braced for the next attack.')};$('focus').onclick=()=>{battle.focus=(battle.focus||0)+0.2;enemyTurn('Your Critter focused its strength.')};
 $('switch').onclick=selectPoke;$('potion').onclick=()=>{if(!itemQty('Potion'))return;s.inventory.Potion--;p.hp=Math.min(p.maxHp,p.hp+20);enemyTurn('You used a Potion and restored 20 HP.')};
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
 battle=null;$('close').hidden=false;
 s.money=Math.max(0,s.money-Math.floor(s.money*0.1));s.party.forEach(p=>p.hp=p.maxHp);
 s.area=s.lastCenter||'village';s.x=17;s.y=16;build();save();
 open('Blackout','<p>Your whole party fainted. You lost a little money and recovered at your last Critter Center.</p><button class="btn primary" id="blackoutDone">Continue</button>');$('blackoutDone').onclick=close
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
function preview(id,g){const im=sprites[g],c=$(id),p=c.getContext('2d');p.imageSmoothingEnabled=false;function draw(){if(im.naturalWidth){p.clearRect(0,0,c.width,c.height);p.drawImage(im,0,0,im.width/4,im.height/(g==='male'?4:3),0,0,c.width,c.height)}}im.addEventListener('load',draw);draw()}
preview('malePreview','male');preview('femalePreview','female');
$('new').onclick=()=>show('selection');
$('continue').onclick=()=>{s=read();if(!s)return;migrate();build();show('game')};
$('begin').onclick=()=>{const name=$('playerName').value.trim().replace(/\s+/g,' ');if(!name){$('error').textContent='Please enter a name.';return}
 s={name,gender:document.querySelector('.character.selected').dataset.gender,area:'village',x:17,y:16,face:'down',steps:0,starter:null,party:[],storage:[],inventory:{Potion:4,Revive:1},modules:[],installed:[],badges:0,defeated:{},puzzles:{},money:250,version:4};
 save();build();show('game');say(['Welcome, '+name+'!','Visit the research laboratory in the northeast of the village to receive your Critter Index and starter.'])};
document.querySelectorAll('.character').forEach(b=>b.onclick=()=>{document.querySelectorAll('.character').forEach(c=>c.classList.remove('selected'));b.classList.add('selected')});
$('index').onclick=index;$('index2').onclick=index;$('save').onclick=()=>{save();say(['Your adventure has been saved.'])};$('talk').onclick=interact;$('dialog').onclick=advance;$('close').onclick=close;
window.addEventListener('keydown',e=>{if(document.activeElement.tagName==='INPUT')return;const d={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'}[e.code];if(d){e.preventDefault();held[d]=true;if(Date.now()-last>120){move(d);last=Date.now()}}else if(['KeyE','Enter','Space'].includes(e.code)&&!modal){e.preventDefault();interact()}else if(e.code==='KeyI'&&!modal)index();else if(e.code==='Escape'&&modal&&!battle)close()});
window.addEventListener('keyup',e=>{const d={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'}[e.code];if(d)held[d]=false});window.addEventListener('blur',()=>held={});
document.querySelectorAll('[data-dir]').forEach(b=>{const d=b.dataset.dir;b.addEventListener('pointerdown',e=>{e.preventDefault();held[d]=true;move(d)});for(const ev of ['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,e=>{e.preventDefault();held[d]=false})});
if(read()?.name)$('continue').hidden=false;
function loop(){if(screen==='game'){for(const d of ['up','down','left','right'])if(held[d]&&Date.now()-last>145){move(d);last=Date.now();break}draw()}requestAnimationFrame(loop)}
requestAnimationFrame(loop);
})();
