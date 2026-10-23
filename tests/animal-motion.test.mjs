import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {Battle,MAX_FIGHTERS} from '../dist/engine.mjs';
import {animalKind,animalPose,fighterArm,heldSword,ANIMALS} from '../dist/animal-motion.mjs';
import {createFighterBatches,createCamera,worldPosition} from '../dist/scene-model.mjs';
import {fighterScale} from '../dist/display-model.mjs';
import {disposeScene} from '../dist/resource-cleanup.mjs';

const fighter=()=>({id:0,x:0,y:0,angle:0,step:0,stun:0,swing:0,swingTotal:.48,spin:0,cooldown:1,attackSide:1,hurt:0,dead:false,target:{x:20,y:0}});

test('four animal silhouettes and paired face parts fit the full crowd',()=>{
  assert.equal(ANIMALS.length,4);assert.deepEqual([0,1,2,3,4].map(animalKind),[0,1,2,3,0]);
  const batches=createFighterBatches(),scene=new THREE.Scene();
  for(const mesh of Object.values(batches)){assert.equal(mesh.instanceMatrix.count,MAX_FIGHTERS*mesh.userData.parts);scene.add(mesh)}
  const triangles=Object.values(batches).reduce((sum,mesh)=>sum+(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*mesh.instanceMatrix.count,0);
  assert.ok(triangles<500000,'full-crowd geometry budget');
  assert.equal(batches.body.geometry.type,'LatheGeometry');assert.equal(batches.catEars.geometry.type,'LatheGeometry');
  assert.equal(batches.eyes.instanceMatrix.count,MAX_FIGHTERS*2);assert.ok(batches.smile);assert.equal(batches.muzzle,undefined);assert.equal(batches.headOutline,undefined);disposeScene(scene);
});

test('punches have a clear wind-up, extension and recovery without mutating fighters',()=>{
  const f=fighter();f.cooldown=.04;const before=JSON.stringify(f),windup=animalPose(f,0,'running');
  assert.ok(windup.rightBack>.7);assert.equal(JSON.stringify(f),before);
  f.cooldown=.6;f.swing=.48;const impact=animalPose(f,0,'running');
  assert.ok(impact.rightPunch>.95);assert.ok(impact.lunge>.1);assert.ok(Math.abs(impact.yaw-windup.yaw)>.4);
  f.swing=.02;const recovery=animalPose(f,0,'running');assert.ok(recovery.rightPunch<.02);
});

test('hurt reactions, full spins and death tumbles are distinct from walking',()=>{
  const f=fighter();f.hurt=.18;f.hurtStrength=.9;const hit=animalPose(f,0,'running');assert.ok(hit.leanX<-.5);assert.ok(hit.squash<.95);
  f.hurt=0;f.spin=.34;const spin=animalPose(f,0,'running');assert.equal(spin.skill,true);assert.ok(spin.bob>.15);assert.ok(spin.yaw>Math.PI);
  f.dead=true;f.deadTime=5;const fall=animalPose(f,999,'finished',{},5.18);assert.ok(Math.abs(fall.fall-.5)<1e-8);assert.ok(Math.abs(fall.leanZ)>.7);
  f.dead=false;assert.equal(animalPose(f,0,'finished').attack,0);
});

test('animal ears and oversized paws stay inside the playable mobile crop',()=>{
  const camera=createCamera(),scale=fighterScale(true,40);
  for(const x of[91,677])for(const y of[106,410]){
    const p=worldPosition(x,y),head=new THREE.Vector3(p.x,2.16*scale,p.z).project(camera);
    assert.ok(Math.abs(head.x)<.84);assert.ok(Math.abs(head.y)<.98);
  }
});

test('every sword strike uses the holding hand and sweeps across the body',()=>{
  for(const attackSide of[0,1]){
    const f={...fighter(),weapon:'sword',attackSide,cooldown:.02};
    const back=fighterArm(animalPose(f,0,'running'),1);
    f.cooldown=.6;f.swing=.48;const p=animalPose(f,0,'running'),cut=fighterArm(p,1);
    assert.equal(p.leftPunch,0);assert.equal(p.rightPunch,1);
    assert.ok(back.x-cut.x>.7);assert.ok(cut.z-back.z>.9);assert.ok(cut.pitch-back.pitch>1.5);
    assert.ok(fighterArm(p,0).z<cut.z-.5,'off hand does not perform the sword attack');
  }
});

test('sword handle and blade stay attached throughout idle, wind-up, slash and spin',()=>{
  for(const swing of[0,.48,.4,.2,.01])for(const spin of[0,.68,.34])for(const cooldown of[.02,.5]){
    const f={...fighter(),weapon:'sword',swing,spin,cooldown},p=animalPose(f,2,'running'),arm=fighterArm(p,1),s=heldSword(arm);
    assert.deepEqual([s.x,s.y,s.z],[arm.x,arm.y,arm.z]);
    const rotation=new THREE.Euler(s.pitch,0,s.roll),axis=new THREE.Vector3(0,1,0).applyEuler(rotation);
    for(const [prefix,distance]of[['guard',.16],['blade',.66]]){
      const position=new THREE.Vector3(s[`${prefix}X`]-s.x,s[`${prefix}Y`]-s.y,s[`${prefix}Z`]-s.z);
      assert.ok(position.distanceTo(axis.clone().multiplyScalar(distance))<1e-12);
    }
    const length=Math.hypot(arm.x-arm.shoulderX,arm.y-arm.shoulderY,arm.z-arm.shoulderZ);assert.ok(length>0&&length<1.5);
  }
});

test('hits expose recoil and longer motion clocks while retaining combat damage',()=>{
  const battle=new Battle([{name:'A',count:1},{name:'B',count:1}],'forest',1);battle.random=()=>.9;
  const [a,b]=battle.fighters;battle.hit(a,b,20);assert.equal(b.hp,80);assert.equal(b.hurt,.36);assert.equal(b.hurtStrength,.45);
  battle.start();battle.step(1/60);assert.ok(b.hurt<.36);
});
