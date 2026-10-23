import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {Battle,MAX_FIGHTERS} from '../dist/engine.mjs';
import {estimateBattles,estimatedPercentages,simulateOutcome} from '../dist/odds.mjs';
import {createCamera,createFighterBatches,worldPosition,roomBoxes} from '../dist/scene-model.mjs';

test('a short sword changes damage by exactly ten percent without changing health',()=>{
  function damage(weapon){const battle=new Battle([{name:'A',count:1,weapon},{name:'B',count:1}],'forest',11);battle.random=()=>.9;const [a,b]=battle.fighters;battle.hit(a,b,20);assert.equal(a.hp,100);return 100-b.hp}
  assert.equal(damage('none'),20);assert.equal(damage('sword'),22);
});
test('unknown equipment is normalized and every team member carries the selected weapon',()=>{
  const b=new Battle([{name:'A',count:5,weapon:'sword'},{name:'B',count:3,weapon:'invalid'}]);
  assert.ok(b.fighters.filter(f=>f.teamId===0).every(f=>f.weapon==='sword'));
  assert.ok(b.fighters.filter(f=>f.teamId===1).every(f=>f.weapon==='none'));
});
test('win estimates are finite, sum to 100, and do not make an unobserved win impossible',()=>{
  assert.equal(estimatedPercentages([0,0],0),null);
  const values=estimatedPercentages([16,0],16);
  assert.ok(values.every(v=>Number.isFinite(v)&&v>0&&v<100));
  assert.ok(Math.abs(values.reduce((a,b)=>a+b,0)-100)<1e-8);
});
test('estimates run independent complete battles without selecting a live winner or changing menus',()=>{
  const entries=Object.freeze([Object.freeze({name:'A',count:2,weapon:'sword'}),Object.freeze({name:'B',count:3,weapon:'none'})]);
  const live=new Battle(entries,'forest',27);
  const updates=[...estimateBattles(entries,'forest',16,123)];
  assert.equal(updates.at(-1).rounds,16);assert.equal(updates.at(-1).done,true);
  assert.equal(updates.at(-1).wins.reduce((a,b)=>a+b,0),16);
  assert.equal(live.winner,null);assert.equal(live.state,'ready');assert.equal(live.elapsed,0);
  assert.ok([0,1].includes(simulateOutcome(entries,'moon',37)));
});
test('3D camera keeps playable corners and spherical heads within the mobile crop',()=>{
  const camera=createCamera();
  for(const x of[91,677])for(const y of[106,410])for(const height of[0,1.64]){
    const point=worldPosition(x,y),v=new THREE.Vector3(point.x,height,point.z).project(camera);
    assert.ok(Math.abs(v.x)<.84,`horizontal crop ${v.x}`);assert.ok(Math.abs(v.y)<.9,`vertical crop ${v.y}`);
  }
});
test('arena horizontal lines stay level across the screen',()=>{
  const camera=createCamera();
  for(const z of[-10,0,10])for(const height of[0,2.4]){
    const left=new THREE.Vector3(-16,height,z).project(camera),right=new THREE.Vector3(16,height,z).project(camera);
    assert.ok(Math.abs(left.y-right.y)<1e-12);
    assert.ok(right.x>left.x);
  }
});
test('instanced character parts cover 160 members and heads are sphere geometry',()=>{
  const batches=createFighterBatches();assert.equal(batches.head.geometry.type,'SphereGeometry');
  assert.equal(batches.body.instanceMatrix.count,MAX_FIGHTERS);assert.equal(batches.legs.instanceMatrix.count,MAX_FIGHTERS*2);
  assert.ok(batches.blade.isInstancedMesh);
  for(const mesh of Object.values(batches)){mesh.dispose();mesh.geometry.dispose();mesh.material.dispose()}
});
test('room scenery and real collision obstacles share the same coordinates',()=>{
  const boxes=roomBoxes('forest',[{x:240,y:170,r:17}]),p=worldPosition(240,170);
  assert.ok(boxes.some(b=>b.x===p.x&&b.z===p.z&&b.h>1));
  assert.ok(boxes.every(b=>[b.x,b.y,b.z,b.w,b.h,b.d].every(Number.isFinite)));
});
