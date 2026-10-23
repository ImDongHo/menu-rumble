import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {Battle,COLORS} from '../dist/engine.mjs';
import {Renderer} from '../dist/renderer-3d.mjs';
import {createCamera,createFighterBatches,worldPosition} from '../dist/scene-model.mjs';
import {fighterScale} from '../dist/display-model.mjs';
import {disposeScene} from '../dist/resource-cleanup.mjs';

test('larger characters remain inside the mobile crop at playable corners',()=>{
  const camera=createCamera(),scale=fighterScale(true,40);
  assert.ok(scale>1.4);assert.ok(fighterScale(true,160)<scale);
  for(const x of[91,677])for(const y of[106,410]){
    const p=worldPosition(x,y),v=new THREE.Vector3(p.x,1.64*scale,p.z).project(camera);
    assert.ok(Math.abs(v.x)<.84);assert.ok(Math.abs(v.y)<.95);
  }
});

test('ground rings retain team colors and world positions as larger models animate',()=>{
  const battle=new Battle([{name:'A',count:2},{name:'B',count:2}],'ice',17),scene=new THREE.Scene();
  const rings=()=>new THREE.InstancedMesh(new THREE.RingGeometry(.34,.51,24),new THREE.MeshBasicMaterial(),160);
  const target={mobile:true,time:0,batches:createFighterBatches(),shadows:rings(),teamRings:rings(),root:new THREE.Object3D(),part:new THREE.Object3D(),matrix:new THREE.Matrix4(),color:new THREE.Color()};
  target.place=Renderer.prototype.place;
  Renderer.prototype.actors.call(target,battle);
  const matrix=new THREE.Matrix4(),color=new THREE.Color();
  for(const f of battle.fighters){
    target.teamRings.getMatrixAt(f.id,matrix);const p=worldPosition(f.x,f.y);
    assert.ok(Math.abs(matrix.elements[12]-p.x)<1e-5);assert.ok(Math.abs(matrix.elements[14]-p.z)<1e-5);
    target.teamRings.getColorAt(f.id,color);assert.equal('#'+color.getHexString(),COLORS[f.teamId]);
  }
  for(const mesh of Object.values(target.batches))scene.add(mesh);scene.add(target.shadows,target.teamRings);disposeScene(scene);
});
