import * as THREE from './vendor/three.module.js';
import {terrainContains} from './terrain.mjs';

export function createTerrainFloor(map){
  const shape=new THREE.Shape();
  map.terrain.forEach(([x,y],i)=>{const px=(x-384)/20,py=-(y-252)/20;i?shape.lineTo(px,py):shape.moveTo(px,py)});shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.65,bevelEnabled:false});
  const mesh=new THREE.Mesh(geometry,[new THREE.MeshLambertMaterial({color:map.floor}),new THREE.MeshLambertMaterial({color:map.edge})]);
  mesh.rotation.x=-Math.PI/2;mesh.position.y=-.6;return mesh;
}

export function outdoorBoxes(map){
  const boxes=[],ice=map.id==='ice',lava=map.id==='lava',ship=map.id==='ship';
  const add=(x,y,z,w,h,d,color)=>boxes.push({x,y,z,w,h,d,color});
  // Water and lava sit below the playable platforms.
  add(0,-1.05,0,48,.15,32,map.ground);
  for(let z=-15;z<16;z+=1.7)for(let x=-23;x<24;x+=3.1){
    if(terrainContains(map,x*20+384,z*20+252))continue;
    if((Math.round(x*10)+Math.round(z*10))%3===0)add(x,-.94,z,1.4,.025,.07,lava?'#ffb65b':map.light);
  }
  // Only tiles completely on the terrain are placed; the shaped base fills edges.
  for(let y=96,row=0;y<414;y+=18,row++)for(let x=82;x<692;x+=24){
    if(![[x,y],[x+23,y],[x,y+17],[x+23,y+17]].every(([px,py])=>terrainContains(map,px,py)))continue;
    add((x+11.5-384)/20,.075,(y+8.5-252)/20,1.15,.05,.85,(row+Math.floor(x/24))%3?map.tile:map.floor);
    if(ice&&(row+Math.floor(x/24))%7===0)add((x-374)/20,.107,(y-244)/20,.6,.012,.025,'#f2ffff');
    if(lava&&(row+Math.floor(x/24))%11===0)add((x-374)/20,.107,(y-244)/20,.55,.012,.025,'#e6a472');
  }
  // Banks and railings follow the same polygon used by collision.
  for(let i=0;i<map.terrain.length;i++){
    const a=map.terrain[i],b=map.terrain[(i+1)%map.terrain.length],distance=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(distance/18);
    for(let j=0;j<steps;j++){const t=(j+.5)/steps,x=(a[0]+(b[0]-a[0])*t-384)/20,z=(a[1]+(b[1]-a[1])*t-252)/20;
      if(ship){add(x,.26,z,.16,.65,.16,'#79523a');if(j%2===0)add(x,.52,z,.34,.08,.34,'#e9c98b')}
      else if(lava)add(x,.12,z,.54,.24,.54,j%3?'#4b414d':'#ffb65b');
      else if(j%3===0)add(x,-.08,z,.58,.18,.58,'#eaffff');
    }
  }
  for(const o of map.obstacles){const x=(o.x-384)/20,z=(o.y-252)/20,r=o.r/20;
    if(ice){
      add(x,.5,z,r*1.4,1,r*1.4,'#8bbfdb');add(x-.18,1.1,z,r,1.2,r,'#c5edf4');add(x-.28,1.77,z,.38,.2,.38,'#f3ffff');
    }else if(lava){
      add(x,.35,z,r*1.5,.7,r*1.5,'#493d4b');add(x,.95,z,r*1.13,.75,r*1.13,'#6d535e');add(x-.13,1.42,z,r*.7,.22,r*.7,'#b17264');
      add(x,.72,z+r*.58,r*.7,.07,.07,'#ffbf70');
    }else{
      add(x,.48,z,r*1.4,.96,r*1.4,'#986b44');add(x,.98,z,r*1.43,.1,r*1.43,'#d1a36d');
      for(const offset of[-r*.5,r*.5]){add(x+offset,.48,z+r*.71,.09,1,.04,'#654938');add(x+offset,1.045,z,.09,.025,r*1.4,'#654938')}
    }
  }
  if(ice){
    for(const x of[-18.2,18.2])for(const z of[-7,1,8]){
      add(x,-.35,z,1.8,.45,1.6,'#d9f3ef');add(x,.4,z,.32,1.2,.32,'#748f8f');
      for(let layer=0;layer<3;layer++)add(x,1+layer*.5,z,1.5-layer*.4,.55,1.4-layer*.36,layer%2?'#d9f2ee':'#6e9997');
    }
  }
  if(ship){
    // Masts are outside the playable deck so no invisible collision is needed.
    for(const x of[-7,7]){add(x,1.9,-10.5,.3,4,.3,'#765239');add(x,3.3,-10.5,3.1,.14,.14,'#b99769');add(x,2.53,-10.45,2.5,1.4,.07,'#f3e3bd');add(x+.25,3.9,-10.5,.8,.38,.07,'#e18a6d')}
    add(0,.75,-10.8,7,1.7,.8,'#87603e');add(0,1.68,-10.8,7.5,.16,1,'#674932');
  }
  return boxes;
}
