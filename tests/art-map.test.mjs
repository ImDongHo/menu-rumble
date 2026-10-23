import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {ART_MAP_ID,ART_VIEW,artWorldPosition,projectArtPoint,artPillarRect} from '../dist/art-map.mjs';
import {Battle,MAPS} from '../dist/engine.mjs';
import {Renderer} from '../dist/renderer-3d.mjs';
import {createCamera,createFighterBatches,worldPosition} from '../dist/scene-model.mjs';
import {disposeScene} from '../dist/resource-cleanup.mjs';

test('painted pillar collision centers align with the four image landmarks',()=>{
 const map=MAPS.find(m=>m.id===ART_MAP_ID);assert.ok(map.art);
 const landmarks=[[527,445],[1005,445],[522,704],[1007,704]];
 const camera=new THREE.OrthographicCamera(-ART_VIEW.halfHeight*1.6,ART_VIEW.halfHeight*1.6,ART_VIEW.halfHeight,-ART_VIEW.halfHeight,.1,100);
 camera.position.set(0,ART_VIEW.cameraY,ART_VIEW.cameraZ);camera.lookAt(0,ART_VIEW.targetY,0);camera.updateMatrixWorld();
 map.obstacles.forEach((o,i)=>{
  const screen=projectArtPoint(o.x,o.y),p=artWorldPosition(o.x,o.y),v=new THREE.Vector3(p.x,0,p.z).project(camera);
  assert.ok(Math.abs(screen.x-(landmarks[i][0]*480/1024+24))<3);
  assert.ok(Math.abs(screen.y-landmarks[i][1]*480/1024)<3);
  assert.ok(Math.abs(screen.x-(v.x+1)*384)<1e-8);assert.ok(Math.abs(screen.y-(1-v.y)*240)<1e-8);
  const rect=artPillarRect(o);assert.ok(rect.w>37&&rect.w<40&&rect.h>0);assert.ok(rect.x<screen.x&&rect.x+rect.w>screen.x);
 });
});

test('painted map fits 160 fighters, avoids pillars at spawn, and reaches a real winner',()=>{
 const map=MAPS.find(m=>m.id===ART_MAP_ID);
 for(const seed of[13,97]){
  const battle=new Battle(Array.from({length:16},(_,i)=>({name:'메뉴'+i,count:10})),ART_MAP_ID,seed);
  assert.equal(battle.fighters.length,160);
  for(const f of battle.fighters){assert.ok(map.obstacles.every(o=>Math.hypot(f.x-o.x,f.y-o.y)>o.r+14));const p=projectArtPoint(f.x,f.y);assert.ok(p.x>24&&p.x<744&&p.y>80&&p.y<420)}
  battle.start();for(let step=0;step<6000&&battle.state==='running';step++){battle.step(1/60);battle.drainEvents()}
  assert.equal(battle.state,'finished');assert.equal(battle.aliveTeams.length,1);
 }
});

test('new map uses its projection and returning to an original map restores the original camera',()=>{
 const target={scene:new THREE.Scene(),camera:createCamera(),mapGroups:new Map(),activeMap:null};const original=target.camera;
 Renderer.prototype.setMap.call(target,'forest');assert.equal(target.camera,original);
 Renderer.prototype.setMap.call(target,ART_MAP_ID);assert.notEqual(target.camera,original);
 const map=MAPS.find(m=>m.id===ART_MAP_ID),group=target.mapGroups.get(ART_MAP_ID);assert.equal(group.children.length,4);
 group.children.forEach((mesh,i)=>{const p=artWorldPosition(map.obstacles[i].x,map.obstacles[i].y);assert.equal(mesh.position.x,p.x);assert.equal(mesh.position.z,p.z);assert.equal(mesh.material.colorWrite,false)});
 Renderer.prototype.setMap.call(target,'sand');assert.equal(target.camera,original);disposeScene(target.scene);
});

test('existing animal batches stay at the correct positions on both map projections',()=>{
 const battle=new Battle([{name:'A',count:20},{name:'B',count:20}],ART_MAP_ID,17),scene=new THREE.Scene();
 const rings=()=>new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial(),160);
 const target={activeMap:ART_MAP_ID,mobile:false,time:0,batches:createFighterBatches(),shadows:rings(),teamRings:rings(),root:new THREE.Object3D(),part:new THREE.Object3D(),matrix:new THREE.Matrix4(),color:new THREE.Color()};target.place=Renderer.prototype.place;
 for(const id of[ART_MAP_ID,'forest']){target.activeMap=id;Renderer.prototype.actors.call(target,battle);const matrix=new THREE.Matrix4();for(const f of battle.fighters){target.teamRings.getMatrixAt(f.id,matrix);const p=id===ART_MAP_ID?artWorldPosition(f.x,f.y):worldPosition(f.x,f.y);assert.ok(Math.abs(matrix.elements[12]-p.x)<1e-5);assert.ok(Math.abs(matrix.elements[14]-p.z)<1e-5)}}
 for(const mesh of Object.values(target.batches))scene.add(mesh);scene.add(target.shadows,target.teamRings);disposeScene(scene);
});
