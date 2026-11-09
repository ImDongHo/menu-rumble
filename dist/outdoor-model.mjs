import * as THREE from './vendor/three.module.js';
import {terrainContains} from './terrain.mjs';
import {mapBounds,surfaceColor,courseGeometry} from './adventure-maps.mjs';
import {flatSceneryBoxes,drawFlatGround,sceneryStyle} from './flat-scenery.mjs';

export function createFlatBackdrop(map){
  const canvas=document.createElement('canvas');canvas.width=1152;canvas.height=1024;
  const c=canvas.getContext('2d'),wide=map.large?2000:1440,deep=map.large?1600:1280,left=384-wide/2,top=252-deep/2;c.scale(canvas.width/wide,canvas.height/deep);c.translate(-left,-top);drawFlatGround(c,map,left,top,wide,deep);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(wide/20,deep/20),new THREE.MeshLambertMaterial({map:texture}));
  mesh.rotation.x=-Math.PI/2;mesh.position.y=-.92;return mesh;
}

export function createTerrainFloor(map){
  const shape=new THREE.Shape();
  map.terrain.forEach(([x,y],i)=>{const px=(x-384)/20,py=-(y-252)/20;i?shape.lineTo(px,py):shape.moveTo(px,py)});shape.closePath();
  for(const polygon of map.holes??[]){const hole=new THREE.Path();polygon.forEach(([x,y],i)=>i?hole.lineTo((x-384)/20,-(y-252)/20):hole.moveTo((x-384)/20,-(y-252)/20));hole.closePath();shape.holes.push(hole)}
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.65,bevelEnabled:false});
  const mesh=new THREE.Mesh(geometry,[new THREE.MeshLambertMaterial({color:map.floor}),new THREE.MeshLambertMaterial({color:map.edge})]);
  mesh.rotation.x=-Math.PI/2;mesh.position.y=-.6;return mesh;
}

export function outdoorBoxes(map){
  const quietTile=new THREE.Color(map.floor).lerp(new THREE.Color(map.tile),.18).getStyle();
  const boxes=[],ice=map.id==='ice'||map.theme==='ice',lava=map.id==='lava'||map.theme==='lava',ship=map.id==='ship',style=map.layout?sceneryStyle(map):null;
  const add=(x,y,z,w,h,d,color)=>boxes.push({x,y,z,w,h,d,color});
  // Water and lava sit below the playable platforms.
  if(!map.layout)add(0,-1.05,0,48,.15,32,map.ground);
  for(let z=-15;z<16;z+=1.7)for(let x=-23;x<24;x+=3.1){
    if(map.layout||terrainContains(map,x*20+384,z*20+252))continue;
    if((Math.round(x*10)+Math.round(z*10))%3===0)add(x,-.94,z,1.4,.025,.07,lava?'#ffb65b':map.light);
  }
  // Only tiles completely on the terrain are placed; the shaped base fills edges.
  const bounds=mapBounds(map),step=map.large?30:24,rows=map.large?30:18;
  for(let y=map.large?bounds.y+2:96,row=0;y<bounds.y+bounds.h;y+=rows,row++)for(let x=map.large?bounds.x+2:82;x<bounds.x+bounds.w;x+=step){
    if(![[x,y],[x+step-1,y],[x,y+rows-1],[x+step-1,y+rows-1]].every(([px,py])=>terrainContains(map,px,py)))continue;
    if([...(map.bridges??[]),...map.bridge?[map.bridge]:[]].some(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h))continue;
    add((x+(step-1)/2-384)/20,.075,(y+(rows-1)/2-252)/20,(step-1)/20,.05,(rows-1)/20,map.large?surfaceColor(map,x,y):(row+Math.floor(x/24))%3?quietTile:map.floor);
    if(ice&&(row+Math.floor(x/24))%7===0)add((x-374)/20,.107,(y-244)/20,.6,.012,.025,'#f2ffff');
    if(lava&&(row+Math.floor(x/24))%11===0)add((x-374)/20,.107,(y-244)/20,.55,.012,.025,'#e6a472');
    if(map.theme==='moon'&&(row+Math.floor(x/24))%9===0){add((x-374)/20,.107,(y-244)/20,.25,.012,.25,'#d7d3eb');add((x-374)/20,.115,(y-244)/20,.16,.012,.16,map.floor)}
  }
  // Banks and railings follow the same polygon used by collision.
  for(const b of[...(map.bridges??[]),...map.bridge?[map.bridge]:[]]){for(let y=b.y+4;y<b.y+b.h;y+=8)add((b.x+b.w/2-384)/20,.075,(y-252)/20,b.w/20,.05,.37,'#ba945f')}
  for(const polygon of[map.terrain,...map.holes??[]])for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],distance=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(distance/18);
    for(let j=0;j<steps;j++){const t=(j+.5)/steps,x=(a[0]+(b[0]-a[0])*t-384)/20,z=(a[1]+(b[1]-a[1])*t-252)/20;
      if(map.layout){add(x,.2,z,Math.abs(b[0]-a[0])>.1?distance/steps/20:.32,.4,Math.abs(b[1]-a[1])>.1?distance/steps/20:.32,map.edge);if(j%4===0)add(x,.43,z,.38,.08,.38,map.accent)}
      else if(ship){add(x,.26,z,.16,.65,.16,'#79523a');if(j%2===0)add(x,.52,z,.34,.08,.34,'#e9c98b')}
      else if(lava)add(x,.12,z,.54,.24,.54,j%3?'#4b414d':'#ffb65b');
      else if(j%3===0)add(x,-.08,z,.58,.18,.58,'#eaffff');
    }
  }
  for(const o of map.obstacles){const x=(o.x-384)/20,z=(o.y-252)/20,r=o.r/20;
    if(map.layout){add(x,.46,z,r*1.4,.92,r*1.4,map.edge);add(x,.98,z,r*1.6,.13,r*1.6,map.tile);add(x-.18,1.06,z-.12,r*.8,.06,r*.5,map.accent)}
    else if(ice){
      add(x,.5,z,r*1.4,1,r*1.4,'#8bbfdb');add(x-.18,1.1,z,r,1.2,r,'#c5edf4');add(x-.28,1.77,z,.38,.2,.38,'#f3ffff');
    }else if(lava){
      add(x,.35,z,r*1.5,.7,r*1.5,'#493d4b');add(x,.95,z,r*1.13,.75,r*1.13,'#6d535e');add(x-.13,1.42,z,r*.7,.22,r*.7,'#b17264');
      add(x,.72,z+r*.58,r*.7,.07,.07,'#ffbf70');
    }else{
      add(x,.48,z,r*1.4,.96,r*1.4,'#986b44');add(x,.98,z,r*1.43,.1,r*1.43,'#d1a36d');
      for(const offset of[-r*.5,r*.5]){add(x+offset,.48,z+r*.71,.09,1,.04,'#654938');add(x+offset,1.045,z,.09,.025,r*1.4,'#654938')}
    }
  }
  if(map.kind==='lab')for(const hole of map.holes){const [x,y]=hole[0],w=hole[1][0]-x,d=hole[2][1]-y;add((x+w/2-384)/20,.4,(y+d/2-252)/20,w/20,.8,d/20,'#485168');add((x+w/2-384)/20,.84,(y+d/2-252)/20,w/20-.3,.08,d/20-.3,'#758198');add((x+w/2-384)/20,.91,(y+d/2-252)/20,1.4,.08,.35,'#a0dbb3')}
  if(map.holes&&!map.large)for(const hole of map.holes){const xs=hole.map(p=>p[0]),ys=hole.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;add((cx-384)/20,-.1,(cy-252)/20,(Math.max(...xs)-Math.min(...xs))/20,.15,(Math.max(...ys)-Math.min(...ys))/20,style?.garden??'#75945c');for(const dx of[-50,0,50]){add((cx+dx-384)/20,.35,(cy-252)/20,1.8,.7,1.5,style?.gardenPlant??'#91ad72');add((cx+dx-384)/20,.8,(cy-252)/20,1.2,.45,1,style?.gardenLight??'#b3c590')}}
  if(map.layout)boxes.push(...flatSceneryBoxes(map));
  if(map.kind==='circuit'){for(let i=0;i<8;i++)for(let j=0;j<2;j++)add((38+j*8-384)/20,.13,(34+i*16-252)/20,.39,.02,.79,(i+j)%2?'#f7f4de':'#45514d');const route=courseGeometry(map).preview;for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/35);for(let j=0;j<n;j++)add((a[0]+(b[0]-a[0])*(j+.5)/n-384)/20,.13,(a[1]+(b[1]-a[1])*(j+.5)/n-252)/20,.18,.02,.18,'#f1d9a3')}}
  if(ice&&!map.layout){
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
