import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {Battle,MAPS,seededRandom} from '../dist/engine.mjs';
import {TrapField,trapFits,trapWaypoint,TRAP_DAMAGE,TRAP_TYPES} from '../dist/traps.mjs';
import {terrainContains,terrainSegmentClear} from '../dist/terrain.mjs';
import {createTrapMeshes,updateTrapMeshes} from '../dist/trap-model.mjs';
import {disposeScene} from '../dist/resource-cleanup.mjs';
import {estimateBattles,simulateOutcome} from '../dist/odds.mjs';

test('classic mode remains the default and explicit classic produces the same battle',()=>{
  const a=new Battle(['A','B'],'forest',13),b=new Battle(['A','B'],'forest',13,'classic');
  a.start();b.start();for(let i=0;i<600;i++){a.step(1/60);b.step(1/60);a.drainEvents();b.drainEvents()}
  assert.deepEqual(a.fighters,b.fighters);assert.deepEqual(a.traps,[]);assert.equal(a.trapField,null);
});

test('traps give two seconds warning, detonate once, expire and stay bounded',()=>{
  const field=new TrapField(MAPS[0],seededRandom(13));assert.equal(field.advance(1).warned,false);
  assert.equal(field.advance(1.2).warned,true);assert.equal(field.zones.length,2);
  assert.equal(field.advance(3.19).blasts.length,0);assert.equal(field.advance(3.21).blasts.length,2);
  assert.equal(field.advance(3.22).blasts.length,0);const firstIds=field.zones.map(z=>z.id);field.advance(6.21);assert.ok(field.zones.every(z=>!firstIds.includes(z.id)));
  const kinds=new Set();for(let t=6.21;t<80;t+=.05){field.advance(t);assert.ok(field.zones.length<=4);field.zones.forEach(z=>kinds.add(z.kind))}
  assert.deepEqual([...kinds].sort(),Object.keys(TRAP_TYPES).sort());
});

test('seeded trap placement and safe escape points work on every map',()=>{
  for(const map of MAPS){
    const field=new TrapField(map,seededRandom(13)),copy=new TrapField(map,seededRandom(13));
    assert.ok(field.candidates.length>0,map.id);field.advance(1.2);copy.advance(1.2);assert.deepEqual(field.zones,copy.zones);
    for(const zone of field.zones){
      assert.ok(trapFits(map,zone.x,zone.y,zone.r));
      for(let a=0;a<Math.PI*2;a+=.2)assert.ok(terrainContains(map,zone.x+Math.cos(a)*zone.r,zone.y+Math.sin(a)*zone.r));
      const f={x:zone.x,y:zone.y},target={x:zone.x+1,y:zone.y},escape=trapWaypoint(map,f,target,field.zones);
      assert.notEqual(escape,target,map.id);assert.ok(terrainSegmentClear(map,f,escape,8));
      assert.ok(field.zones.every(z=>Math.hypot(escape.x-z.x,escape.y-z.y)>z.r+16));
    }
  }
});

test('every team takes identical trap damage regardless of weapon and combat invulnerability',()=>{
  const battle=new Battle([{name:'A',count:2,weapon:'sword'},{name:'B',count:2}],'forest',13,'traps');
  battle.fighters.forEach((f,i)=>Object.assign(f,{x:384+i,y:252,invulnerable:i}));
  battle.blast({x:384,y:252,r:30});
  for(const f of battle.fighters){assert.equal(f.hp,100-TRAP_DAMAGE);assert.ok(Number.isFinite(f.vx)&&Number.isFinite(f.vy))}
  assert.equal(battle.drainEvents().filter(e=>e.type==='trap-hit').length,4);
});

test('placement ignores roster size and damage rolls, while each fighter has a random reaction delay',()=>{
  const small=new Battle([{name:'A',count:1},{name:'B',count:1}],'forest',13,'traps');
  const large=new Battle([{name:'X',count:40},{name:'Y',count:40}],'forest',13,'traps');
  small.fighters.forEach(f=>Object.assign(f,{x:384,y:252}));small.blast({x:384,y:252,r:30});
  for(const time of[1.2,6.3,12,18]){small.trapField.advance(time);large.trapField.advance(time);assert.deepEqual(small.trapField.zones,large.trapField.zones)}
  const zone={id:1,x:384,y:252,r:30,createdAt:1,detonated:false},f={x:384,y:252,trapReaction:1.5},target={x:385,y:252};
  assert.equal(trapWaypoint(small.map,f,target,[zone],2),target);
  assert.notEqual(trapWaypoint(small.map,f,target,[zone],2.6),target);
});

test('a simultaneous lethal blast preserves one random survivor instead of preferring roster order',()=>{
  const winners=new Set();
  for(let seed=1;seed<=24;seed++){
    const battle=new Battle([{name:'A',count:1},{name:'B',count:1}],'forest',seed,'traps');
    battle.fighters.forEach(f=>Object.assign(f,{x:384,y:252,hp:1}));battle.start();battle.blast({x:384,y:252,r:30});battle.step(0);
    assert.equal(battle.alive.length,1);assert.equal(battle.state,'finished');assert.ok(battle.winner.hp>0);winners.add(battle.winner.teamId);
  }
  assert.equal(winners.size,2);
});

test('160 fighters finish trap battles on all maps without leaving playable terrain',()=>{
  for(const map of MAPS)for(const seed of[13,97]){
    const battle=new Battle(Array.from({length:16},(_,i)=>({name:'메뉴'+i,count:10})),map.id,seed,'traps');battle.start();
    for(let step=0;step<6000&&battle.state==='running';step++){
      battle.step(1/60);battle.drainEvents();
      for(const f of battle.fighters)assert.ok(terrainContains(map,f.x,f.y,7.99),map.id);
    }
    assert.equal(battle.state,'finished',map.id);assert.equal(battle.aliveTeams.length,1);assert.ok(battle.winner.hp>0);
  }
});

test('trap indicators fit both map projections and disappear when returning to classic mode',()=>{
  const meshes=createTrapMeshes(),scene=new THREE.Scene();Object.values(meshes).forEach(mesh=>scene.add(mesh));
  for(const id of['forest','moss-ruins']){
    const battle=new Battle(['A','B'],id,13,'traps');battle.trapField.advance(1.2);battle.elapsed=1.2;updateTrapMeshes(meshes,battle);
    for(const mesh of Object.values(meshes))assert.equal(mesh.count,2);
    const matrix=new THREE.Matrix4();meshes.rim.getMatrixAt(0,matrix);const zone=battle.traps[0];
    assert.ok(Math.abs(matrix.elements[12]-(zone.x-384)/(battle.map.art?18:20))<1e-5);
    assert.ok(Math.abs(matrix.elements[14]-(zone.y-252)/(battle.map.art?12:20))<1e-5);
  }
  updateTrapMeshes(meshes,new Battle(['A','B']));assert.ok(Object.values(meshes).every(m=>m.count===0));disposeScene(scene);
});

test('natural trap matches include actual damage as fighters react at different times',()=>{
  let hits=0;
  for(let seed=1;seed<=8;seed++){
    const battle=new Battle(['A','B','C','D','E','F','G','H'],'ruins-junction',seed,'traps');battle.start();
    for(let i=0;i<6000&&battle.state==='running';i++){battle.step(1/60);hits+=battle.drainEvents().filter(e=>e.type==='trap-hit').length}
    assert.equal(battle.state,'finished');
  }
  assert.ok(hits>0,'traps must affect combat as well as display warnings');
});

test('trap win estimates simulate the selected mode independently of a live outcome',()=>{
  const entries=[{name:'A',count:3},{name:'B',count:3}],live=new Battle(entries,'forest',13,'traps');
  const results=[...estimateBattles(entries,'forest',8,79,'traps')].at(-1),random=seededRandom(79),wins=[0,0];
  for(let i=0;i<8;i++)wins[simulateOutcome(entries,'forest',Math.floor(random()*4294967296),'traps')]++;
  assert.deepEqual(results.wins,wins);assert.equal(results.rounds,8);assert.equal(live.winner,null);assert.equal(live.elapsed,0);
});

test('poison applies six half-second ticks over three seconds at different step sizes',()=>{
  for(const dt of[1/60,.05]){
    const field=new TrapField(MAPS[0],seededRandom(13));field.nextWaveAt=Infinity;
    field.zones=[{id:1,kind:'poison',x:384,y:252,r:30,createdAt:0,blastAt:2,expiresAt:5,nextTickAt:2.5,detonated:false}];
    let activations=0,ticks=0;
    for(let t=0;t<5.1;t+=dt){const result=field.advance(t);if(t<2)assert.equal(result.blasts.length,0);if(t<2.5-1e-9)assert.equal(result.pulses.length,0);activations+=result.blasts.length;ticks+=result.pulses.length}
    assert.equal(activations,1);assert.equal(ticks,6);assert.equal(field.zones.length,0);
  }
  const b=new Battle([{name:'A',count:1},{name:'B',count:1}],'forest',13,'traps'),[inside,outside]=b.fighters;
  Object.assign(inside,{x:384,y:252,invulnerable:99});Object.assign(outside,{x:484,y:252});
  const zone={kind:'poison',x:384,y:252,r:30};b.blast(zone);assert.equal(inside.hp,100);
  for(let i=0;i<6;i++)b.trapDamage(zone);
  assert.equal(inside.hp,64);assert.equal(outside.hp,100);assert.equal(inside.stun,0);assert.equal(inside.vx,0);assert.equal(inside.vy,0);
});

test('shockwaves do less damage and push harder, and activated poison remains avoidable',()=>{
  const b=new Battle([{name:'A',count:1},{name:'B',count:1}],'forest',13,'traps'),f=b.fighters[0];Object.assign(f,{x:390,y:252});
  b.blast({kind:'shockwave',x:384,y:252,r:30});assert.equal(f.hp,92);assert.equal(f.vx,300);assert.equal(f.vy,0);assert.ok(f.vx>TRAP_TYPES.blast.push);
  const target={x:390,y:253},zone={kind:'poison',id:1,x:384,y:252,r:30,createdAt:0,detonated:true};f.trapReaction=99;
  assert.notEqual(trapWaypoint(b.map,f,target,[zone],2.1),target);
});

test('three trap types have distinct matching colors in the 3D indicator batches',()=>{
  const meshes=createTrapMeshes(),scene=new THREE.Scene();Object.values(meshes).forEach(m=>scene.add(m));
  const b=new Battle(['A','B'],'forest',13,'traps');b.trapField.advance(1.2);b.elapsed=2;
  const colors=[];for(const kind of Object.keys(TRAP_TYPES)){
    b.trapField.zones[0].kind=kind;updateTrapMeshes(meshes,b);const color=new THREE.Color();meshes.rim.getColorAt(0,color);const expected=new THREE.Color(TRAP_TYPES[kind].color);
    assert.ok(Math.abs(color.r-expected.r)+Math.abs(color.g-expected.g)+Math.abs(color.b-expected.b)<1e-6);colors.push(color.getHexString());
  }
  assert.equal(new Set(colors).size,3);disposeScene(scene);
});
