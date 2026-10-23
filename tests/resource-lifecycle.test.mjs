import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {disposeScene} from '../dist/resource-cleanup.mjs';
import {createFighterBatches} from '../dist/scene-model.mjs';
import {Renderer} from '../dist/renderer-3d.mjs';
import {estimateBattles} from '../dist/odds.mjs';

test('shared geometry, materials, textures and instancing are released once per scene',()=>{
  for(let round=0;round<50;round++){
    const scene=new THREE.Scene(),batches=createFighterBatches(),texture=new THREE.Texture();
    batches.body.material.map=texture;
    for(const mesh of Object.values(batches))scene.add(mesh);
    const resources=new Set([texture]);
    for(const mesh of Object.values(batches)){resources.add(mesh);resources.add(mesh.geometry);resources.add(mesh.material)}
    const released=new Map();
    for(const resource of resources)resource.addEventListener('dispose',()=>released.set(resource,(released.get(resource)||0)+1));
    disposeScene(scene);
    assert.equal(scene.children.length,0);assert.equal(released.size,resources.size);
    assert.ok([...released.values()].every(count=>count===1));
    disposeScene(scene);assert.ok([...released.values()].every(count=>count===1));
  }
});

test('renderer teardown is idempotent and drops retained battles and map caches',()=>{
  const calls=[],target={scene:new THREE.Scene(),canvas:{removeEventListener:name=>calls.push(name)},
    gl:{dispose:()=>calls.push('dispose'),forceContextLoss:()=>calls.push('release')},
    mapGroups:new Map([['forest',{}]]),backgrounds:new Map([['forest',{}]]),lastBattle:{},particles:[{}],numbers:[{}],rings:[{}],overlay:{remove:()=>calls.push('overlay')}};
  Renderer.prototype.dispose.call(target);Renderer.prototype.dispose.call(target);
  assert.deepEqual(calls,['webglcontextlost','webglcontextrestored','dispose','release','overlay']);
  assert.equal(target.mapGroups.size,0);assert.equal(target.backgrounds.size,0);assert.equal(target.lastBattle,null);
  assert.equal(target.particles.length+target.numbers.length+target.rings.length,0);
});

test('effects remain bounded even if a frame is paused during a burst of events',()=>{
  for(const lowPower of[false,true]){
    const target={lowPower,particles:[],numbers:[],rings:[],project:()=>({x:0,y:0})};
    for(let i=0;i<2000;i++){
      Renderer.prototype.event.call(target,{type:'hit',damage:20,x:0,y:0});
      Renderer.prototype.event.call(target,{type:'skill',fighter:{x:0,y:0}});
    }
    assert.equal(target.particles.length,lowPower?90:200);assert.equal(target.numbers.length,35);assert.equal(target.rings.length,lowPower?32:64);
  }
});

test('unbounded and invalid simulation requests fail before work starts',()=>{
  const entries=[{name:'A',count:1},{name:'B',count:1}];
  for(const rounds of[Infinity,NaN,0,-1,1.5,129])assert.throws(()=>[...estimateBattles(entries,'forest',rounds,1)],RangeError);
});
