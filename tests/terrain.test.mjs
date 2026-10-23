import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {Battle,MAPS} from '../dist/engine.mjs';
import {terrainContains,constrainTerrain,terrainWaypoint} from '../dist/terrain.mjs';
import {roomBoxes} from '../dist/scene-model.mjs';
import {createTerrainFloor} from '../dist/outdoor-model.mjs';
import {Renderer} from '../dist/renderer-3d.mjs';
import {disposeScene} from '../dist/resource-cleanup.mjs';

test('the ice bridge, tapered deck and central caldera have distinct playable shapes',()=>{
  const ice=MAPS.find(map=>map.id==='ice'),ship=MAPS.find(map=>map.id==='ship'),lava=MAPS.find(map=>map.id==='lava');
  assert.equal(MAPS.length,7);
  assert.ok(terrainContains(ice,384,252,8));assert.ok(!terrainContains(ice,384,150,8));
  assert.ok(terrainContains(ship,384,120,8));assert.ok(!terrainContains(ship,100,110,8));
  assert.ok(lava.obstacles.some(o=>o.x===384&&o.y===252&&o.r>40));
  assert.notDeepEqual(ship.terrain,lava.terrain);
});

test('knockback stops at banks and fighters approach the real bridge before crossing',()=>{
  const map=MAPS.find(map=>map.id==='ice'),previous={x:300,y:150},f={x:350,y:150};
  constrainTerrain(map,f,previous);assert.deepEqual(f,previous);
  assert.deepEqual(terrainWaypoint(map,previous,{x:550,y:150}),{x:304,y:252});
  assert.deepEqual(terrainWaypoint(map,{x:304,y:252},{x:550,y:150}),{x:464,y:252});
});

test('every new terrain fits 160 fighters and a complete battle stays on the platform',()=>{
  for(const map of MAPS.filter(map=>map.terrain))for(const seed of[13,97]){
    const battle=new Battle(Array.from({length:16},(_,i)=>({name:'메뉴'+i,count:10})),map.id,seed);
    assert.equal(battle.fighters.length,160);
    for(const f of battle.fighters)assert.ok(terrainContains(map,f.x,f.y,8));
    battle.start();
    for(let step=0;step<6000&&battle.state==='running';step++){
      battle.step(1/60);battle.drainEvents();
      for(const f of battle.fighters)assert.ok(terrainContains(map,f.x,f.y,7.99),map.id+' bank collision');
    }
    assert.equal(battle.state,'finished',map.id);assert.equal(battle.aliveTeams.length,1);
  }
});

test('3D terrain uses the same outlines and obstacle centers as combat',()=>{
  for(const map of MAPS.filter(map=>map.terrain)){
    const floor=createTerrainFloor(map),scene=new THREE.Scene();scene.add(floor);
    assert.equal(floor.geometry.type,'ExtrudeGeometry');
    const boxes=roomBoxes(map.id,map.obstacles);
    assert.ok(boxes.length<1800);
    assert.ok(boxes.every(box=>[box.x,box.y,box.z,box.w,box.h,box.d].every(Number.isFinite)));
    for(const o of map.obstacles)assert.ok(boxes.some(b=>Math.abs(b.x-(o.x-384)/20)<1e-8&&Math.abs(b.z-(o.y-252)/20)<1e-8&&b.y>0));
    disposeScene(scene);
  }
});

test('switching among seven maps keeps only three GPU map groups and disposes evicted maps',()=>{
  const target={scene:new THREE.Scene(),mapGroups:new Map(),activeMap:null};target.scene.background=new THREE.Color();
  let removed=0;
  for(let i=0;i<24;i++){
    Renderer.prototype.setMap.call(target,MAPS[i%MAPS.length].id);
    const group=target.mapGroups.get(target.activeMap);group.traverse(object=>{if(object.geometry)object.geometry.addEventListener('dispose',()=>removed++)});
    assert.ok(target.mapGroups.size<=3);assert.ok(target.scene.children.length<=3);
  }
  assert.ok(removed>=21);disposeScene(target.scene);
});
