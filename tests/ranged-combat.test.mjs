import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle} from '../dist/engine.mjs';
import {collectRoyaleItems} from '../dist/adventure-modes.mjs';
import {fireAcorn,stepAcorns,wallContact,ACORN} from '../dist/ranged-combat.mjs';
const setup=(entries=[{name:'A',count:1,weapon:'sword'},{name:'B',count:1}])=>{const b=new Battle(entries,undefined,13,'royale');b.pickups=[];b.trapField.nextWaveAt=Infinity;b.random=()=>.5;Object.assign(b.fighters[0],{x:384,y:252});Object.assign(b.fighters.at(-1),{x:540,y:252});return b};
function equip(b,f=b.fighters[0]){b.pickups=[{kind:'acorn',x:f.x,y:f.y,respawnAt:0}];collectRoyaleItems(b,f);f.acornCooldown=0;return f}

test('acorn launchers are loot exclusive to royale, retain the melee loadout and cool down',()=>{
 for(const mode of ['classic','captain','traps','race','infection']){const b=new Battle(['A','B'],undefined,13,mode);assert.ok(!b.pickups.some(p=>p.kind==='acorn'));assert.equal(b.projectiles,undefined);assert.equal(fireAcorn(b,b.fighters[0],b.fighters.at(-1)),false)}
 const b=setup(),f=equip(b);assert.equal(f.acornAmmo,6);assert.equal(f.weapon,'sword');assert.equal(b.pickups[0].respawnAt,12);assert.equal(fireAcorn(b,f,b.fighters[1]),true);assert.equal(f.acornAmmo,5);assert.equal(b.projectiles.length,1);assert.equal(fireAcorn(b,f,b.fighters[1]),false);collectRoyaleItems(b,f);assert.equal(f.acornAmmo,5);
});

test('a launched acorn flies through space and hits after travel, without a sword damage bonus',()=>{
 const b=setup(),f=equip(b),target=b.fighters[1];fireAcorn(b,f,target);assert.equal(target.hp,100);stepAcorns(b,1/60);assert.equal(target.hp,100);f.x=100;f.y=170;
 for(let i=0;i<60;i++)stepAcorns(b,1/60);assert.equal(target.hp,82);assert.equal(b.projectiles.length,0);assert.equal(b.drainEvents().filter(e=>e.type==='hit').length,1);
});

test('acorns ignore teammates and shields use existing combat protection',()=>{
 const b=setup([{name:'A',count:2},{name:'B',count:1}]),f=equip(b),friend=b.fighters[1],target=b.fighters[2];Object.assign(friend,{x:450,y:252});fireAcorn(b,f,target);for(let i=0;i<60;i++)stepAcorns(b,1/60);assert.equal(friend.hp,100);assert.equal(target.hp,82);
 f.acornCooldown=0;target.invulnerable=2;fireAcorn(b,f,target);for(let i=0;i<60;i++)stepAcorns(b,1/60);assert.equal(target.hp,82);
});

test('water cutouts and stone obstacles block firing and stop a projectile already in flight',()=>{
 const b=setup(),f=equip(b),target=b.fighters[1];Object.assign(f,{x:100,y:170});Object.assign(target,{x:280,y:170});assert.ok(Number.isFinite(wallContact(b.map,f,target)));assert.equal(fireAcorn(b,f,target),false);assert.equal(f.acornAmmo,6);
 assert.ok(Number.isFinite(wallContact(b.map,{x:260,y:70},{x:400,y:70})));
 b.projectiles=[{id:1,owner:f,teamId:0,x:122,y:170,vx:235,vy:0,angle:0,remaining:200}];stepAcorns(b,.05);assert.equal(b.projectiles.length,0);assert.equal(target.hp,100);assert.ok(b.drainEvents().some(e=>e.type==='acorn-impact'&&e.blocked));
});

test('limited ammunition is consumed on misses and empty launchers cannot fire',()=>{
 const b=setup(),f=equip(b),target=b.fighters[1];target.x=624;b.random=()=>.999;
 for(let i=0;i<6;i++){f.acornCooldown=0;assert.equal(fireAcorn(b,f,target),true);for(let t=0;t<90;t++)stepAcorns(b,1/60)}
 assert.equal(f.acornAmmo,0);assert.equal(target.hp,100);assert.equal(f.weapon,'sword');assert.equal(fireAcorn(b,f,target),false);assert.equal(b.projectiles.length,0);assert.equal(b.drainEvents().filter(e=>e.type==='acorn-empty').length,1);
});

test('natural royale matches collect launchers, fire bounded projectiles and finish with live winners',()=>{
 let collected=0,shots=0;for(const seed of[13,97,9457,18914]){const b=new Battle(Array.from({length:8},(_,i)=>({name:'T'+i,count:5})),undefined,seed,'royale');b.start();
  for(let i=0;i<6000&&b.state==='running';i++){b.step(1/60);assert.ok(b.projectiles.length<=ACORN.maxProjectiles);for(const e of b.drainEvents()){if(e.type==='pickup'&&e.kind==='acorn')collected++;if(e.type==='acorn-shot')shots++}}
  assert.equal(b.state,'finished');assert.ok(b.winner.hp>0);assert.equal(b.aliveTeams.length,1);assert.equal(b.projectiles.length,0);
 }assert.ok(collected>0);assert.ok(shots>0);
});
