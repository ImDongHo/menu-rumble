import * as THREE from './vendor/three.module.js';
export function drawAcorn(c,x,y,size=14,angle=0){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(size/20,size/20);c.strokeStyle='#543824';c.lineWidth=2;
 c.fillStyle='#e9b46b';c.beginPath();c.ellipse(0,2,6,8,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#8c5735';c.beginPath();c.ellipse(0,-4,8,4,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#c58e53';c.fillRect(-5,-6,3,2);c.fillRect(1,-4,3,2);c.strokeStyle='#543824';c.beginPath();c.moveTo(0,-7);c.lineTo(2,-11);c.stroke();c.restore();
}
export function drawLauncher(c,x,y,size=30,angle=0){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(size/30,size/30);c.lineWidth=2;c.strokeStyle='#4e3425';c.fillStyle='#ae7648';c.beginPath();c.roundRect(-12,-5,22,12,3);c.fill();c.stroke();c.fillStyle='#6f4b35';c.fillRect(-8,6,5,7);c.fillStyle='#e8cf8d';c.fillRect(7,-5,7,12);c.fillStyle='#354535';c.fillRect(11,-2,4,6);drawAcorn(c,-4,-9,15);c.fillStyle='#80b569';c.beginPath();c.ellipse(4,-14,6,2.5,-.5,0,Math.PI*2);c.fill();c.restore();
}
export function drawAcornLabels(c,battle,project,mobile=false){
 if(battle.mode!=='royale')return;c.save();c.textAlign='center';c.textBaseline='middle';const size=mobile?17:12;c.font=`800 ${size}px sans-serif`;
 const badge=(p,text,gun)=>{if(p.x<-100||p.x>868||p.y<-30||p.y>510)return;const w=c.measureText(text).width+(gun?36:20),h=size+12;c.fillStyle='#413421f0';c.strokeStyle='#efd195';c.lineWidth=1.5;c.beginPath();c.roundRect(p.x-w/2,p.y-h/2,w,h,5);c.fill();c.stroke();c.fillStyle='#fff2cb';c.fillText(text,p.x+(gun?9:0),p.y);if(gun)drawLauncher(c,p.x-w/2+14,p.y,20)};
 for(const p of battle.pickups??[])if(p.kind==='acorn'&&p.respawnAt<=battle.elapsed)badge(project(p.x,p.y,1.8),'도토리 발사기',true);
 for(const f of battle.alive)if(f.acornAmmo>0)badge(project(f.x,f.y,3.4),`도토리 ${f.acornAmmo}발`,false);c.restore();
}
const object=new THREE.Object3D();
function batch(geometry,color,count){const m=new THREE.InstancedMesh(geometry,new THREE.MeshLambertMaterial({color}),count);m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.count=0;return m}
export function createLauncherMeshes(count=160){
 const round=new THREE.SphereGeometry(.5,8,6),box=new THREE.BoxGeometry(1,1,1);
 return {wood:batch(box,'#ad7548',count),barrel:batch(new THREE.CylinderGeometry(.22,.25,1,10),'#70492f',count),muzzle:batch(new THREE.TorusGeometry(.22,.055,5,10),'#f2d793',count),grip:batch(box,'#63432e',count),nut:batch(round,'#e9b46b',count),cap:batch(round,'#885433',count),stem:batch(box,'#563c29',count),leaf:batch(round,'#86b86a',count)};
}
export function placeLauncher(meshes,index,place,visible=true,kick=0){
 const scale=visible?1:0,z=-kick*.12;
 const part=(name,x,y,depth,w,h,d,rx=0,rz=0)=>place(meshes[name],index,x+.22,y,depth+z,w*scale,h*scale,d*scale,rx,rz);
 part('wood',.36,.90,.65,.44,.39,.78);part('barrel',.36,1.01,1.22,1,.72,1,Math.PI/2);part('muzzle',.36,1.01,1.59,1,1,1);part('grip',.36,.59,.48,.18,.44,.25);
 part('nut',.36,1.30,.51,.49,.61,.49);part('cap',.36,1.57,.51,.61,.24,.61);part('stem',.36,1.75,.51,.07,.22,.07,0,-.25);part('leaf',.57,1.77,.51,.47,.08,.23,0,-.45);
}
export function updateLauncherPickups(meshes,battle,time){
 const items=(battle.pickups??[]).filter(p=>p.kind==='acorn'&&p.respawnAt<=battle.elapsed);for(const m of Object.values(meshes))m.count=items.length;
 const root=new THREE.Matrix4(),matrix=new THREE.Matrix4();
 items.forEach((p,i)=>{object.position.set((p.x-384)/20,.55+Math.sin(time*2+p.id)*.12,(p.y-252)/20);object.rotation.set(0,-Math.PI/3,0);object.scale.setScalar(1);object.updateMatrix();root.copy(object.matrix);
  placeLauncher(meshes,i,(mesh,index,x,y,z,w,h,d,rx,rz)=>{object.position.set(x,y,z);object.rotation.set(rx,0,rz);object.scale.set(w,h,d);object.updateMatrix();matrix.multiplyMatrices(root,object.matrix);mesh.setMatrixAt(index,matrix)});
 });for(const m of Object.values(meshes))m.instanceMatrix.needsUpdate=true;
}
export function createAcornMeshes(){
 return {nut:batch(new THREE.SphereGeometry(.5,8,6),'#efbd7a',160),cap:batch(new THREE.SphereGeometry(.5,10,6),'#905a36',160),stem:batch(new THREE.CylinderGeometry(.045,.045,.2,6),'#573c28',160),trail:batch(new THREE.BoxGeometry(1,1,1),'#f5dfa2',160)};
}
export function updateAcornMeshes(meshes,battle,time){
 const shots=battle.projectiles??[];for(const m of Object.values(meshes))m.count=shots.length;
 for(let i=0;i<shots.length;i++){const p=shots[i],x=(p.x-384)/20,z=(p.y-252)/20,height=1.1+Math.sin((244-p.remaining)/244*Math.PI)*.18;
  for(const [name,mesh]of Object.entries(meshes)){object.position.set(name==='trail'?x-Math.cos(p.angle)*.5:x,height+(name==='cap'?.28:name==='stem'?.48:0),name==='trail'?z-Math.sin(p.angle)*.5:z);object.rotation.set(0,name==='trail'?Math.PI/2-p.angle:time*3+p.id,0);object.scale.set(...(name==='nut'?[.64,.8,.64]:name==='cap'?[.83,.34,.83]:name==='stem'?[1,1,1]:[.11,.11,.75]));object.updateMatrix();mesh.setMatrixAt(i,object.matrix)}
 }for(const m of Object.values(meshes))m.instanceMatrix.needsUpdate=true;
}
export function drawFlatAcorns(c,battle){
 for(const p of battle.projectiles??[]){c.save();c.strokeStyle='#f6dda8';c.lineWidth=3;c.beginPath();c.moveTo(p.x-Math.cos(p.angle)*14,p.y-14-Math.sin(p.angle)*14);c.lineTo(p.x,p.y-14);c.stroke();drawAcorn(c,p.x,p.y-14,18,p.angle+.6);c.restore()}
}
