import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const url=process.env.CRITTERS_URL||'https://spluxec.github.io/critters/';
const output='qa-screenshots';
const expected=process.env.CRITTERS_BUILD||'1.44';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];
const areas=[['home',17,14],['neighbor',17,13],['lab',17,10],['townCenter',12,9],['gardenCenter',12,9],['townShop',10,9],['gardenShop',10,9],['gym',17,19],['village-home-exterior',7,10],['village-lab-exterior',24,11],['village',17,16],['town-center-exterior',25,12],['town-shop-exterior',8,23],['garden-gym-exterior',24,11],['route1',17,12],['route2',17,12],['forest',17,12],['garden',14,13]];
try{
 for(const [label,profile] of [['portrait',devices['iPhone 13']],['landscape',{...devices['iPhone 13'],viewport:{width:844,height:390},screen:{width:844,height:390}}]]){
  const context=await browser.newContext(profile);
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(label+': '+e.message));
  page.on('response',r=>{if(r.status()>=400&&/\.(png|svg|js|json)(\?|$)/.test(r.url()))errors.push(label+': HTTP '+r.status()+' '+r.url())});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(expected=>document.querySelector('script[src*="game.js"]')?.src.includes(expected),expected,{timeout:90000});
  await page.locator('#new').tap();
  await page.locator('#playerName').fill('Mobile QA');
  await page.locator('#begin').tap();
  await page.locator('#game.show').waitFor();
  const seed=await page.evaluate(()=>JSON.parse(localStorage.getItem('critters-v1')));
  assert.equal(seed.name,'Mobile QA');
  for(const [scene,x,y] of areas){
   const area=scene.includes('-exterior')?scene.split('-')[0]:scene;
   await page.evaluate(({seed,area,x,y})=>localStorage.setItem('critters-v1',JSON.stringify({...seed,area,x,y,face:'up',introComplete:true,starter:'Water',rivalPassed:true,party:[{speciesId:'cr-001-starter-water-1',type:'Water',name:'Drizzlet',level:5,hp:30,maxHp:30}],puzzles:{gate:false}})),{seed,area,x,y});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#continue').tap();
   await page.locator('#game.show').waitFor();
   await page.waitForTimeout(1100);
   const canvas=await page.locator('#world').evaluate(c=>{
    const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const colors=new Set();for(let i=0;i<pixels.length;i+=400)colors.add(pixels.slice(i,i+3).join(','));
    const r=c.getBoundingClientRect();return {w:r.width,h:r.height,colors:colors.size};
   });
   assert.ok(canvas.w>300&&canvas.h>250&&canvas.colors>15,label+' '+area+' blank canvas '+JSON.stringify(canvas));
   for(const id of ['talk','index2']){
    const b=await page.locator('#'+id).boundingBox();const v=page.viewportSize();
    assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=v.width+1&&b.y+b.height<=v.height+1,label+' '+id+' offscreen');
   }
   await page.screenshot({path:output+'/'+label+'-'+scene+'.png'});
   console.log(label,area,canvas);
  }
  await page.locator('#index2').tap();
  await page.locator('#shade.show').waitFor();
  await page.screenshot({path:output+'/'+label+'-index.png'});
  await context.close();
 }
 assert.deepEqual(errors,[],'Browser errors or failed assets');
}finally{await browser.close()}
