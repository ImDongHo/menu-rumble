import * as THREE from './vendor/three.module.js';
import {mapBounds,overviewTransform,surfaceColor,courseGeometry} from './adventure-maps.mjs';
import {drawFlatGround,drawFlatProps} from './flat-scenery.mjs';
export const PICKUP_COLORS={heal:'#8cde9b',boost:'#f0c568',shield:'#8dcbe8',slip:'#d098bd'};
export function drawAdventureMap(c,map){
 c.save();const t=overviewTransform(map);c.translate(t.x,t.y);c.scale(t.scale,t.scale);const b=mapBounds(map);
 drawFlatGround(c,map,b.x-100,b.y-100,b.w+200,b.h+200);drawFlatProps(c,map);
 const path=()=>{c.beginPath();for(const polygon of[map.terrain,...map.holes??[]]){polygon.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath()}};
 path();c.fillStyle=map.floor;c.fill('evenodd');c.save();path();c.clip('evenodd');
 const tile=map.kind==='island'?30:24;
 for(let y=b.y;y<b.y+b.h;y+=tile)for(let x=b.x;x<b.x+b.w;x+=tile){c.fillStyle=(Math.floor(x/tile)+Math.floor(y/tile))%3?surfaceColor(map,x,y):map.tile;c.fillRect(x+1,y+1,tile-2,tile-2)}
 for(const bridge of map.bridges??[])for(let y=bridge.y;y<bridge.y+bridge.h;y+=8){c.fillStyle='#bd975e';c.fillRect(bridge.x,y,bridge.w,7)}
 c.restore();path();c.strokeStyle=map.edge;c.lineWidth=6;c.stroke();
 if(map.kind==='lab')for(const hole of map.holes){const x=hole[0][0],y=hole[0][1],w=hole[1][0]-x,h=hole[2][1]-y;c.fillStyle='#4a5267';c.fillRect(x+4,y+4,w-8,h-8);c.fillStyle='#8797ad';c.fillRect(x+12,y+12,w-24,5);c.fillStyle='#a8d5af';c.fillRect(x+w/2-15,y+h/2-5,30,10)}
 if(map.kind==='circuit'){
  c.strokeStyle='#f7dfaa';c.lineWidth=2;c.setLineDash([12,12]);c.beginPath();courseGeometry(map).preview.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.setLineDash([]);
  for(let i=0;i<8;i++)for(let j=0;j<2;j++){c.fillStyle=(i+j)%2?'#f7f4de':'#45514d';c.fillRect(34+j*8,26+i*16,8,16)}
 }
 for(const o of map.obstacles){c.fillStyle=map.edge;c.fillRect(o.x-o.r*.65,o.y-o.r,o.r*1.3,o.r*1.3);c.fillStyle=map.accent;c.fillRect(o.x-o.r*.7,o.y-o.r-4,o.r*1.4,7)}
 c.restore();
}
export function createPickupMesh(){const mesh=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.42),new THREE.MeshBasicMaterial({color:0xffffff}),16);mesh.count=0;mesh.frustumCulled=false;return mesh}
const dummy=new THREE.Object3D(),color=new THREE.Color();
export function updatePickupMesh(mesh,battle,time){
 const active=(battle.pickups??[]).filter(p=>p.respawnAt<=battle.elapsed);mesh.count=active.length;
 active.forEach((p,i)=>{dummy.position.set((p.x-384)/20,.6+Math.sin(time*2+p.id)*.08,(p.y-252)/20);dummy.rotation.set(0,time*.7,0);dummy.scale.setScalar(1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color.set(PICKUP_COLORS[p.kind]))});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
}
export function drawAdventurePickups(c,battle){
 c.save();for(const p of battle.pickups??[]){if(p.respawnAt>battle.elapsed)continue;c.fillStyle=PICKUP_COLORS[p.kind];c.beginPath();c.moveTo(p.x,p.y-7);c.lineTo(p.x+7,p.y);c.lineTo(p.x,p.y+7);c.lineTo(p.x-7,p.y);c.closePath();c.fill()}c.restore();
}
export function drawMinimap(c,battle,mobile=false,camera=null){
 if(!battle.map.large)return;const b=mapBounds(battle.map),w=mobile?200:164,h=mobile?126:104,x=768-w-14,y=480-h-16,scale=Math.min((w-14)/b.w,(h-20)/b.h),ox=x+w/2-(b.x+b.w/2)*scale,oy=y+(h+8)/2-(b.y+b.h/2)*scale;
 c.save();c.fillStyle='#1c2d39e8';c.fillRect(x,y,w,h);c.strokeStyle='#c1d0bb88';c.lineWidth=1;c.strokeRect(x,y,w,h);c.font='10px sans-serif';c.fillStyle='#dae5d1';c.textAlign='left';c.fillText(battle.mode==='race'?'코스 전체':'전체 지도',x+7,y+12);
 c.save();c.beginPath();c.rect(x+2,y+16,w-4,h-18);c.clip();
 for(const polygon of[battle.map.terrain,...battle.map.holes??[]]){c.beginPath();polygon.forEach(([px,py],i)=>i?c.lineTo(ox+px*scale,oy+py*scale):c.moveTo(ox+px*scale,oy+py*scale));c.closePath();c.fillStyle=polygon===battle.map.terrain?'#829181':'#334752';c.fill()}
 if(battle.map.course){c.strokeStyle='#f0dcaa';c.lineWidth=1;c.beginPath();courseGeometry(battle.map).preview.forEach(([px,py],i)=>i?c.lineTo(ox+px*scale,oy+py*scale):c.moveTo(ox+px*scale,oy+py*scale));c.stroke()}
 if(battle.ring!==null){c.strokeStyle='#ffe2a0';c.beginPath();c.ellipse(ox+384*scale,oy+252*scale,battle.ring*scale,battle.ring/1.65*scale,0,0,Math.PI*2);c.stroke()}
 for(const f of battle.alive){c.fillStyle=f.color;c.beginPath();c.arc(ox+f.x*scale,oy+f.y*scale,battle.mode==='race'?2.6:1.9,0,Math.PI*2);c.fill()}
 if(camera){c.strokeStyle='#fff7c299';c.strokeRect(ox+(camera.x-camera.w/2)*scale,oy+(camera.y-camera.h/2)*scale,camera.w*scale,camera.h*scale)}
 c.restore();c.restore();
}
