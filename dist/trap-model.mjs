import * as THREE from './vendor/three.module.js';
import {TRAP_WARNING,trapType} from './traps.mjs';

export function createTrapMeshes(){
  const meshes={};
  for(const [name,geometry,opacity]of[
    ['base',new THREE.CircleGeometry(1.07,48),.84],
    ['fill',new THREE.CircleGeometry(1,48),.42],
    ['rim',new THREE.RingGeometry(.88,1,48),1],
    ['charge',new THREE.RingGeometry(.72,.79,48),1],
    ['plume',new THREE.CylinderGeometry(.6,1,1,32,1,true),.32]
  ]){
    const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}),4);
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
      const plume=name==='plume',active=zone.detonated;
      const scale=name==='charge'?progress:1;
      const height=active?(zone.kind==='poison'?.9:zone.kind==='shockwave'?.35:1.8):0;
      dummy.position.set((zone.x-384)/(art?18:20),plume?.22+height/2:name==='base'?.16:name==='fill'?.18:.20,(zone.y-252)/(art?12:20));
      dummy.rotation.set(plume?0:-Math.PI/2,0,0);
      if(plume)dummy.scale.set(zone.r/(art?18:20),height,zone.r/(art?12:20));
      else dummy.scale.set(zone.r/(art?18:20)*scale,zone.r/(art?12:20)*scale,1);dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color.set(name==='base'?'#192731':zone.detonated||name==='charge'?type.activeColor:type.color));
    }
  }
  meshes.fill.material.opacity=zones.some(z=>z.detonated) ? .66 : effects ? .43+Math.sin(battle.elapsed*5)*.06 : .43;
  for(const mesh of Object.values(meshes)){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true}
}

export function createTrapPads(){
 const meshes={};for(const [name,geometry]of[['base',new THREE.CircleGeometry(1,32)],['rim',new THREE.RingGeometry(.9,1,32)]]){
  const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:name==='base'?'#26323d':'#f7c675',side:THREE.DoubleSide,toneMapped:false}),8);mesh.count=0;mesh.frustumCulled=false;meshes[name]=mesh;
 }return meshes;
}
export function updateTrapPads(meshes,battle){
 const sites=battle.trapField?.sites??[];for(const [name,mesh]of Object.entries(meshes)){mesh.count=sites.length;sites.forEach((p,i)=>{dummy.position.set((p.x-384)/20,name==='base'?.14:.15,(p.y-252)/20);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(p.r/20,p.r/20,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.instanceMatrix.needsUpdate=true}
}
