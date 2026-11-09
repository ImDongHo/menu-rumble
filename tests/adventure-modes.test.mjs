import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {Battle,MAPS,ARENA_MAPS,mapsForMode,seededRandom} from '../dist/engine.mjs';
import {mapBounds} from '../dist/adventure-maps.mjs';
import {collectRoyaleItems,coursePoint} from '../dist/adventure-modes.mjs';
import {terrainContains,terrainWaypoint,constrainTerrain} from '../dist/terrain.mjs';
import {Renderer} from '../dist/renderer-3d.mjs';
import {createCamera} from '../dist/scene-model.mjs';
import {disposeScene} from '../dist/resource-cleanup.mjs';
import {estimateBattles,simulateOutcome} from '../dist/odds.mjs';

const modes=['royale','race','infection'];
test('six modes filter dedicated maps while all eleven original arenas stay available',()=>{
 assert.equal(MAPS.length,14);assert.equal(ARENA_MAPS.length,11);
 for(const mode of['classic','captain','traps'])assert.deepEqual(mapsForMode(mode),ARENA_MAPS);
 for(const mode of modes){
  const allowed=mapsForMode(mode);assert.equal(allowed.length,1);assert.ok(allowed[0].modes.includes(mode));
  const b=new Battle(['A','B'],'forest',13,mode);assert.equal(b.map,allowed[0]);assert.equal(new Battle(['A','B'],allowed[0].id,13).map.id,'forest');
 }
 const island=mapBounds(mapsForMode('royale')[0]),lab=mapBounds(mapsForMode('infection')[0]);assert.ok(island.w*island.h>616*324*3);assert.ok(lab.w*lab.h>616*324*2);
});

test('all new modes are reproducible and never receive a winner before play',()=>{
 for(const mode of modes){const a=new Battle(['A','B','C'],undefined,13,mode),b=new Battle(['A','B','C'],undefined,13,mode);assert.deepEqual(a.fighters,b.fighters);assert.deepEqual(a.pickups,b.pickups);assert.equal(a.winner,null);assert.equal(a.state,'ready')}
});

test('race uses one unarmed representative per menu and the same base speed',()=>{
 const entries=Object.freeze(Array.from({length:16},(_,i)=>Object.freeze({name:'메뉴'+i,count:40,weapon:'sword'}))),b=new Battle(entries,undefined,13,'race');
 assert.equal(b.fighters.length,16);assert.ok(b.teams.every(t=>t.count===1&&t.weapon==='none'));assert.ok(entries.every(e=>e.count===40&&e.weapon==='sword'));
 b.pickups=[];for(const f of b.fighters){f.bumpUntil=Infinity;f.nextLane=Infinity}b.start();
 for(let i=0;i<120;i++)b.step(1/60);
 for(const f of b.fighters){assert.ok(Math.abs(f.raceDistance-160)<1e-8);assert.equal(f.hp,100);assert.ok(!f.dead)}
 for(let d=0;d<b.courseLength;d+=13)for(const lane of[-55,0,55]){const p=coursePoint(b,d,lane);assert.ok(terrainContains(b.map,p.x,p.y,9.99))}
});

test('race finishes by crossing time and random ties never force the first menu to win',()=>{
 const winners=new Set();
 for(let seed=1;seed<=8;seed++){
  const b=new Battle(['A','B','C','D'],undefined,seed,'race');b.pickups=[];for(const f of b.fighters){f.bumpUntil=Infinity;f.nextLane=Infinity}b.start();
  for(let i=0;i<4000&&b.state==='running';i++)b.step(1/60);
  assert.equal(b.state,'finished');assert.ok(Math.abs(b.winner.finishTime-b.courseLength/80)<1e-7);assert.equal(b.standings[0],b.winner);winners.add(b.winner.teamId);
 }
 assert.ok(winners.size>1);
});

test('race lanes stay continuous through bends rather than jumping at route corners',()=>{
 const b=new Battle(['A','B'],undefined,13,'race');
 for(const lane of[-55,0,55]){let previous=coursePoint(b,0,lane);for(let d=1;d<b.courseLength;d++){
  const point=coursePoint(b,d,lane);assert.ok(Math.hypot(point.x-previous.x,point.y-previous.y)<5);assert.ok(terrainContains(b.map,point.x,point.y,9.99));previous=point;
 }}
});

test('royale pickups heal, boost and shield once before their cooldown expires',()=>{
 const b=new Battle(['A','B'],undefined,13,'royale'),f=b.fighters[0];Object.assign(f,{x:384,y:252,hp:40});
 for(const kind of['heal','boost','shield']){b.pickups=[{kind,x:384,y:252,respawnAt:0}];collectRoyaleItems(b,f);assert.equal(b.pickups[0].respawnAt,9)}
 assert.equal(f.hp,70);assert.equal(f.boost,3);assert.equal(f.invulnerable,2);collectRoyaleItems(b,f);assert.equal(f.hp,70);
 b.elapsed=10;assert.equal(b.ring,null);b.elapsed=20;assert.ok(b.ring<600);b.elapsed=100;assert.equal(b.ring,28);
});

test('infection converts the same fighter, preserves the population and grants brief protection',()=>{
 const b=new Battle([{name:'A',count:2},{name:'B',count:2}],undefined,13,'infection'),a=b.fighters[0],target=b.fighters.find(f=>f.teamId===1),id=target.id;
 Object.assign(a,{x:384,y:252});Object.assign(target,{x:400,y:252,hp:10});b.random=()=>.9;b.hit(a,target,40);
 assert.equal(target.id,id);assert.equal(target.teamId,0);assert.equal(target.name,'A');assert.equal(target.color,b.teams[0].color);assert.equal(target.hp,100);assert.ok(target.invulnerable>0);assert.equal(b.alive.length,4);assert.equal(b.eliminations.length,0);assert.equal(b.conversions,1);
 const other=b.fighters.find(f=>f.teamId===1);b.hit(other,target,40);assert.equal(b.conversions,1);assert.equal(target.teamId,0);
});

test('late infection pressure rewards nearby support by the same rule for either menu',()=>{
 for(const attackerId of[0,1]){
  const b=new Battle([{name:'A',count:attackerId===0?6:1},{name:'B',count:attackerId===1?6:1}],undefined,13,'infection');
  b.fighters.forEach((f,i)=>Object.assign(f,{x:384+i,y:252}));const a=b.fighters.find(f=>f.teamId===attackerId),t=b.fighters.find(f=>f.teamId!==attackerId);b.random=()=>.9;b.elapsed=36;b.hit(a,t,20);assert.equal(t.hp,60);
 }
});

test('fighters resting against lab walls can still navigate around a building',()=>{
 const map=mapsForMode('infection')[0];
 for(const [from,target]of[[{x:72,y:148},{x:268,y:148}],[{x:268,y:148},{x:72,y:148}]]){
  const f={...from};assert.ok(terrainContains(map,f.x,f.y,8));let steps=0;
  while(Math.hypot(f.x-target.x,f.y-target.y)>10&&steps++<1500){
   const waypoint=terrainWaypoint(map,f,target),dx=waypoint.x-f.x,dy=waypoint.y-f.y,d=Math.hypot(dx,dy)||1,previous={x:f.x,y:f.y};f.x+=dx/d*2;f.y+=dy/d*2;constrainTerrain(map,f,previous);assert.ok(terrainContains(map,f.x,f.y,7.99));
  }
  assert.ok(steps<1500,'the path must leave the wall rather than repeatedly walking into it');
 }
});

test('new modes finish with valid winners for small, default and maximum menu sets',()=>{
 for(const mode of modes)for(const [teams,count,seed]of[[2,3,1],[8,5,13],[16,10,97]]){
  const b=new Battle(Array.from({length:teams},(_,i)=>({name:'메뉴'+i,count})),undefined,seed,mode);b.start();let pickups=0;
  for(let i=0;i<6000&&b.state==='running';i++){
   b.step(1/60);for(const e of b.drainEvents())if(e.type==='pickup')pickups++;
   if(i%15===0)for(const f of b.fighters)assert.ok(terrainContains(b.map,f.x,f.y,7.99),mode);
  }
  assert.equal(b.state,'finished',`${mode}/${teams}`);assert.ok(b.winner.hp>0);assert.ok(b.elapsed<100);
  if(mode==='race'){assert.equal(b.standings[0],b.winner);assert.equal(b.alive.length,teams)}
  else{assert.equal(b.aliveTeams.length,1);if(mode==='infection'){assert.equal(b.alive.length,teams*count);assert.ok(b.alive.every(f=>f.teamId===b.winner.teamId));assert.ok(b.conversions>0)}}
  if(mode==='royale'&&teams>=8)assert.ok(pickups>0);
 }
});

test('large overview cameras include each map and return to the original camera',()=>{
 const original=createCamera(),target={scene:new THREE.Scene(),camera:original,standardCamera:original,mapGroups:new Map(),activeMap:null};target.scene.background=new THREE.Color();
 for(const mode of modes){const b=new Battle(['A','B'],undefined,13,mode);Renderer.prototype.setMap.call(target,b.map.id);Renderer.prototype.updateCamera.call(target,b,0);
  for(const [x,y]of b.map.terrain){const p=new THREE.Vector3((x-384)/20,0,(y-252)/20).project(target.camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,mode)}
  assert.ok(target.cameraMeta.w>600);assert.ok(target.mapGroups.size<=3);
 }
 Renderer.prototype.setMap.call(target,'forest');assert.equal(target.camera,original);disposeScene(target.scene);
});

test('a paused race can switch from tracking back to the whole map without advancing play',()=>{
 const b=new Battle(['A','B'],undefined,13,'race'),target={scene:new THREE.Scene(),camera:createCamera(),mapGroups:new Map(),activeMap:null};target.scene.background=new THREE.Color();
 Renderer.prototype.setMap.call(target,b.map.id);b.start();Renderer.prototype.updateCamera.call(target,b,1);
 assert.ok(target.viewState.h<b.map.overview);target.overview=true;target.cameraNeedsSnap=true;Renderer.prototype.updateCamera.call(target,b,0);
 assert.equal(target.viewState.h,b.map.overview);assert.equal(target.viewState.x,0);assert.equal(target.viewState.z,0);assert.equal(b.elapsed,0);disposeScene(target.scene);
});

test('all three new modes use their own rules for independent win estimates',()=>{
 const entries=[{name:'A',count:1},{name:'B',count:1}];
 for(const mode of modes){const live=new Battle(entries,undefined,13,mode),result=[...estimateBattles(entries,live.map.id,8,79,mode)].at(-1),random=seededRandom(79),wins=[0,0];
  for(let i=0;i<8;i++)wins[simulateOutcome(entries,live.map.id,Math.floor(random()*4294967296),mode)]++;
  assert.deepEqual(result.wins,wins);assert.equal(result.rounds,8);assert.equal(live.winner,null);assert.equal(live.elapsed,0);
 }
});
