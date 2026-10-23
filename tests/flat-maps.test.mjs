import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {Battle,MAPS} from '../dist/engine.mjs';
import {terrainContains,terrainSegmentClear,terrainWaypoint,constrainTerrain} from '../dist/terrain.mjs';
import {createTerrainFloor} from '../dist/outdoor-model.mjs';
import {disposeScene} from '../dist/resource-cleanup.mjs';

test('flat layouts have distinct connected floors and a genuinely blocked garden',()=>{
  const crossing=MAPS.find(m=>m.id==='forest-crossing'),loop=MAPS.find(m=>m.id==='garden-loop'),bends=MAPS.find(m=>m.id==='river-bends'),cross=MAPS.find(m=>m.id==='ruins-junction');
  for(const map of[crossing,loop,bends,cross])assert.equal(map.art,undefined);
  assert.ok(terrainContains(crossing,384,252,8));assert.ok(!terrainContains(crossing,384,150));
  assert.ok(!terrainContains(loop,384,252));assert.ok(terrainContains(loop,384,150,28));
  assert.ok(!terrainSegmentClear(loop,{x:244,y:252},{x:524,y:252}));
  assert.ok(terrainContains(bends,384,135));assert.ok(!terrainContains(bends,384,193));
  assert.ok(terrainContains(cross,384,252));assert.ok(!terrainContains(cross,160,130));
  const floor=createTerrainFloor(loop),ray=new THREE.Raycaster(new THREE.Vector3(0,10,0),new THREE.Vector3(0,-1,0));
  floor.updateMatrixWorld(true);assert.equal(ray.intersectObject(floor).length,0,'garden is also a hole in the rendered floor');
  const scene=new THREE.Scene();scene.add(floor);disposeScene(scene);
});

test('fighters can follow every flat corridor in both directions without crossing banks',()=>{
  for(const map of MAPS.filter(m=>m.layout)){
    const spots=[];for(let y=130;y<390;y+=60)for(let x=130;x<670;x+=90)if(terrainContains(map,x,y,12))spots.push({x,y});
    for(const from of spots)for(const to of spots){
      const f={...from},target={...to};let steps=0;
      while(Math.hypot(f.x-to.x,f.y-to.y)>10&&steps++<1200){
        const next=terrainWaypoint(map,f,target),dx=next.x-f.x,dy=next.y-f.y,d=Math.hypot(dx,dy)||1,previous={...f};
        f.x+=dx/d*3;f.y+=dy/d*3;constrainTerrain(map,f,previous);
        assert.ok(terrainContains(map,f.x,f.y,7.99),map.id);
      }
      assert.ok(steps<1200,`${map.id}: ${JSON.stringify(from)} to ${JSON.stringify(to)}`);
    }
  }
});

test('attacks cannot pass through the cutouts between S-shaped corridors',()=>{
  const battle=new Battle([{name:'A',count:1},{name:'B',count:1}],'river-bends',13),[a,b]=battle.fighters;
  Object.assign(a,{x:384,y:171});Object.assign(b,{x:384,y:216,invulnerable:0});
  battle.random=()=>.9;battle.hit(a,b,50,true,true);assert.equal(b.hp,100);assert.equal(battle.drainEvents().length,0);
});
