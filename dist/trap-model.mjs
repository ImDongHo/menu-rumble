import * as THREE from './vendor/three.module.js';
import {TRAP_WARNING,trapType} from './traps.mjs';

export function createTrapMeshes(){
  const meshes={};
  for(const [name,geometry,opacity]of[
    ['fill',new THREE.CircleGeometry(1,48),.19],
    ['rim',new THREE.RingGeometry(.92,1,48),.95],
    ['charge',new THREE.RingGeometry(.84,.88,48),.85]
  ]){
    const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}),4);
    mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);meshes[name]=mesh;
  }
  return meshes;
}
const dummy=new THREE.Object3D(),color=new THREE.Color();
export function updateTrapMeshes(meshes,battle,effects=true){
  const zones=battle.traps??[],art=Boolean(battle.map.art);
  for(const mesh of Object.values(meshes))mesh.count=zones.length;
  for(let i=0;i<zones.length;i++){
    const zone=zones[i],type=trapType(zone),progress=zone.detonated?(zone.kind==='shockwave'?Math.min(1,Math.max(.05,(battle.elapsed-zone.blastAt)/type.duration)):1):Math.min(1,Math.max(.05,(battle.elapsed-zone.createdAt)/TRAP_WARNING));
    for(const [name,mesh]of Object.entries(meshes)){
      const scale=name==='charge'?progress:1;
      dummy.position.set((zone.x-384)/(art?18:20),name==='fill'?.12:.14,(zone.y-252)/(art?12:20));
      dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(zone.r/(art?18:20)*scale,zone.r/(art?12:20)*scale,1);dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color.set(zone.detonated||name==='charge'?type.activeColor:type.color));
    }
  }
  meshes.fill.material.opacity=zones.some(z=>z.detonated) ? .32 : effects ? .18+Math.sin(battle.elapsed*5)*.035 : .2;
  for(const mesh of Object.values(meshes)){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true}
}
