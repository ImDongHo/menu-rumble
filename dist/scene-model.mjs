import * as THREE from './vendor/three.module.js';
import {outdoorBoxes} from './outdoor-model.mjs';
import {MAPS,seededRandom,MAX_FIGHTERS} from './engine.mjs';

export const WORLD_SCALE=20;
export const worldPosition=(x,y)=>({x:(x-384)/WORLD_SCALE,z:(y-252)/WORLD_SCALE});
export function createCamera(){
  const camera=new THREE.OrthographicCamera(-20,20,12.5,-12.5,.1,100);
  camera.position.set(0,28,25);camera.up.set(0,1,0);camera.lookAt(0,.35,0);camera.updateMatrixWorld();return camera;
}
export function roomBoxes(mapId,obstacles){
  const terrainMap=MAPS.find(map=>map.id===mapId);if(terrainMap?.terrain)return outdoorBoxes({...terrainMap,obstacles});
  const boxes=[],random=seededRandom(451),wood=mapId==='forest',moon=mapId==='moon';
  const add=(x,y,z,w,h,d,color)=>boxes.push({x,y,z,w,h,d,color});
  const stone=moon?'#516378':wood?'#7a7c74':'#bb9870';
  add(0,-.4,0,33,.75,19.8,moon?'#394858':wood?'#585d51':'#a88358');
  for(let z=-9.15,row=0;z<9.3;z+=wood?.64:1.1,row++)for(let x=-15.9;x<16;x+=wood?2.05:1.1){
    const color=new THREE.Color(wood?'#bc985d':moon?'#8b9eac':'#dfc192');color.offsetHSL(0,0,(random()-.5)*.025);
    add(x+(wood?1:.52),.025,z,wood?2.015:1.075,.1,wood?.61:1.075,'#'+color.getHexString());
    if(wood&&random()>.95)add(x+.25+random()*1.1,.081,z+(random()-.5)*.32,.18+random()*.75,.008,.018,random()>.5?'#9d7c49':'#d3af70');
  }
  // The near wall is deliberately low so it cannot hide the fighters.
  for(let x=-16.6;x<=16.6;x+=1.2)for(let layer=0;layer<4;layer++){
    if(layer>1&&((Math.abs(x+9)<1.1)||(Math.abs(x-9)<1.1)))continue;
    const color=new THREE.Color(stone);color.offsetHSL(0,0,(random()-.5)*.12);
    add(x,layer*.62+.3,-10,1.17,.6,.65,'#'+color.getHexString());
  }
  for(const x of[-17,17])for(let z=-9.3;z<10;z+=1.2)for(let layer=0;layer<2;layer++)add(x,layer*.62+.3,z,.55,.6,1.17,stone);
  add(0,.18,10,34,.35,.48,stone);
  if(wood){
    for(const x of[-15.8,-12,-4,4,12,15.8])add(x,1.62,-9.55,.42,3.25,.45,'#684f30');
    add(0,3.3,-9.6,33,.32,.4,'#725636');
    // An oak door and two windows give the little arena a miniature-room scale.
    add(0,1.25,-9.5,2,2.5,.18,'#a47b43');add(.65,1.25,-9.34,.12,.12,.12,'#e3bd64');
    for(const x of[-9,9]){add(x,2.6,-10,2.3,1.65,.2,'#9fc9c4');add(x,2.6,-9.8,.12,1.7,.3,'#5a513a');add(x,2.6,-9.8,2.3,.12,.3,'#5a513a')}
  }
  for(const o of obstacles){const{x,z}=worldPosition(o.x,o.y);
    add(x,.14,z,1.55,.28,1.55,stone);add(x,.92,z,1.05,1.55,1.05,stone);add(x,1.78,z,1.45,.25,1.45,moon?'#a4a4c1':wood?'#b2b29c':'#e1c491');
    add(x-.27,.96,z+.54,.12,1.1,.05,moon?'#8390ad':wood?'#646b60':'#9f815b');
    add(x+.27,.96,z+.54,.12,1.1,.05,moon?'#8390ad':wood?'#646b60':'#9f815b');
  }
  for(const x of[-12,-4,4,12]){add(x,2.25,-9.2,.13,.6,.13,'#66482c');add(x,2.62,-9.17,.22,.3,.2,moon?'#c0b4ff':'#ffcd68');add(x,2.83,-9.17,.12,.18,.12,moon?'#ece7ff':'#fff2bb')}
  return boxes;
}
export function createFighterBatches(){
  const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(.5,12,8),round=new THREE.SphereGeometry(.5,8,6),eye=new THREE.CircleGeometry(.5,12),cone=new THREE.ConeGeometry(.5,1,3);
  const fur=new THREE.MeshLambertMaterial({color:0xffffff,toneMapped:false});
  const outline=new THREE.MeshBasicMaterial({color:'#253238',side:THREE.BackSide});
  const cream=new THREE.MeshLambertMaterial({color:'#fff0d7'}),pink=new THREE.MeshLambertMaterial({color:'#edb6aa'}),dark=new THREE.MeshBasicMaterial({color:'#292e35'}),white=new THREE.MeshBasicMaterial({color:'#fffdf4'});
  const silver=new THREE.MeshLambertMaterial({color:'#d9e1df'}),gold=new THREE.MeshLambertMaterial({color:'#d6ae58'}),grip=new THREE.MeshLambertMaterial({color:'#745333'});
  const definitions={headOutline:[sphere,outline,1],bodyOutline:[sphere,outline,1],body:[sphere,fur,1],head:[sphere,fur,1],belly:[round,cream,1],muzzle:[round,cream,1],nose:[round,dark,1],ears:[round,fur,2],catEars:[cone,fur,2],earInner:[round,pink,2],tail:[round,fur,1],arms:[round,fur,2],hands:[round,cream,2],legs:[round,fur,2],eyes:[eye,dark,2],eyeShine:[eye,white,2],blade:[cube,silver,1],guard:[cube,gold,1],grip:[cube,grip,1]};
  const batches={};
  for(const[name,[geometry,material,parts]]of Object.entries(definitions)){const mesh=new THREE.InstancedMesh(geometry,material,MAX_FIGHTERS*parts);mesh.name=name;mesh.userData.parts=parts;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;batches[name]=mesh}
  return batches;
}
