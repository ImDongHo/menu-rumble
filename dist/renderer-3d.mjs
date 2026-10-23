import {ART_MAP_ID,ART_VIEW,artWorldPosition} from './art-map.mjs';
import * as THREE from './vendor/three.module.js';
import {Renderer as FlatRenderer,makeMap} from './renderer.mjs';
import {MAPS,MAX_FIGHTERS} from './engine.mjs';
import {createCamera,createFighterBatches,roomBoxes,worldPosition} from './scene-model.mjs?v=soft-beans-2';
import {createTerrainFloor,createFlatBackdrop} from './outdoor-model.mjs';
import {fighterScale} from './display-model.mjs';
import {animalKind,animalPose,fighterArm,heldSword} from './animal-motion.mjs?v=soft-beans-2';
import {disposeScene} from './resource-cleanup.mjs';
const SOFT_TINT=new THREE.Color('#fff4e9');

// The menu icon uses the same simple face and bean silhouette as the 3D model.
export function drawAvatar(canvas,color,team=0){
  canvas.width=64;canvas.height=64;const c=canvas.getContext('2d'),kind=animalKind(team);
  const oval=(x,y,rx,ry,fill)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()};
  const shade=new THREE.Color(color).lerp(SOFT_TINT,.14);color='#'+shade.getHexString();
  oval(32,59,20,3,'#1e35331a');oval(32,43,17,18,color);
  for(const side of[-1,1]){
    const x=32+side*14;oval(x,kind===1?13:kind===3?27:17,kind===1?5:kind===3?6:7,kind===1?12:kind===3?13:7,color);
    if(kind===2){c.fillStyle=color;c.beginPath();c.moveTo(x-8,23);c.quadraticCurveTo(x-3,5,x,8);c.quadraticCurveTo(x+4,6,x+8,23);c.fill()}
  }
  oval(32,28,20,19,color);
  for(const side of[-1,1]){oval(32+side*8,28,2,2.7,'#493b40');oval(32+side*19,44,6,10,color);oval(32+side*9,58,7,4,color)}
  c.strokeStyle='#493b40';c.lineWidth=1.5;c.lineCap='round';c.beginPath();c.arc(32,33,3,.15,Math.PI-.15);c.stroke();
}

export class Renderer {
  constructor(canvas){
    const surface=document.createElement('canvas');
    try{
      this.gl=new THREE.WebGLRenderer({canvas:surface,antialias:true,powerPreference:'high-performance',alpha:false});
    }catch{
      return new FlatRenderer(canvas);
    }
    surface.id=canvas.id;surface.setAttribute('aria-label','말랑한 동물 캐릭터들이 자동으로 싸우는 입체 경기장');surface.width=768;surface.height=480;canvas.replaceWith(surface);this.canvas=surface;surface.classList.add('arena-3d');
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));this.gl.setSize(768,480,false);this.gl.outputColorSpace=THREE.SRGBColorSpace;this.gl.toneMapping=THREE.ACESFilmicToneMapping;this.gl.toneMappingExposure=1;
    this.scene=new THREE.Scene();this.camera=createCamera();this.standardCamera=this.camera;this.mapArtTextures=new Map();this.scene.background=new THREE.Color('#465f4e');
    this.scene.add(new THREE.HemisphereLight('#fff7de','#687563',1.2));
    const sun=new THREE.DirectionalLight('#fff1d5',2);sun.position.set(-9,18,10);this.scene.add(sun);
    this.batches=createFighterBatches();for(const mesh of Object.values(this.batches))this.scene.add(mesh);
    this.mapGroups=new Map();this.activeMap=null;this.lastBattle=null;this.time=0;this.effects=true;this.particles=[];this.numbers=[];this.rings=[];this.mobile=false;this.lowPower=false;
    this.backgrounds=new Map(MAPS.map(map=>[map.id,makeMap(map.id)]));
    for(const [id,canvas]of this.backgrounds)canvas.addEventListener('mapartready',()=>{const texture=this.mapArtTextures.get(id);if(texture)texture.needsUpdate=true});
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=32;const c=shadowCanvas.getContext('2d');const radial=c.createRadialGradient(16,16,2,16,16,15);radial.addColorStop(0,'rgba(22,28,18,.4)');radial.addColorStop(1,'rgba(22,28,18,0)');c.fillStyle=radial;c.fillRect(0,0,32,32);
    this.shadows=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),MAX_FIGHTERS);this.shadows.frustumCulled=false;this.shadows.renderOrder=1;this.scene.add(this.shadows);
    this.overlay=document.createElement('canvas');this.overlay.width=1536;this.overlay.height=960;this.overlay.className='arena-overlay';this.overlay.setAttribute('aria-hidden','true');surface.after(this.overlay);this.c=this.overlay.getContext('2d');this.c.scale(2,2);
    this.teamRings=new THREE.InstancedMesh(new THREE.RingGeometry(.34,.51,24),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,depthWrite:false}),MAX_FIGHTERS);this.teamRings.frustumCulled=false;this.scene.add(this.teamRings);
    this.deathAges=new Float32Array(MAX_FIGHTERS);this.pose={};this.arm={};this.sword={};this.root=new THREE.Object3D();this.part=new THREE.Object3D();this.matrix=new THREE.Matrix4();this.vector=new THREE.Vector3();this.color=new THREE.Color();
    const points=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a),.09,Math.sin(a)))}
    this.safeRing=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#ffdb94',transparent:true,opacity:.8}));this.safeRing.visible=false;this.scene.add(this.safeRing);
    this.onContextLost=event=>{event.preventDefault();this.contextLost=true};
    this.onContextRestored=()=>{this.contextLost=false};
    surface.addEventListener('webglcontextlost',this.onContextLost);
    surface.addEventListener('webglcontextrestored',this.onContextRestored);
  }
  setMap(mapId){
    if(this.activeMap===mapId)return;
    if(this.activeMap)this.mapGroups.get(this.activeMap).visible=false;
    if(!this.mapGroups.has(mapId)){
      if(this.mapGroups.size>=3){const oldest=this.mapGroups.keys().next().value,group=this.mapGroups.get(oldest);disposeScene(group);this.scene.remove(group);this.mapGroups.delete(oldest)}
      const group=new THREE.Group(),map=MAPS.find(m=>m.id===mapId);
      if(map.art){
        const geometry=new THREE.BoxGeometry(2.2,3.35,3.0),material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true});
        for(const obstacle of map.obstacles){const p=artWorldPosition(obstacle.x,obstacle.y),mesh=new THREE.Mesh(geometry,material);mesh.position.set(p.x,1.675,p.z);mesh.renderOrder=-10;group.add(mesh)}
      }else{
        const boxes=roomBoxes(mapId,map.obstacles);if(map.terrain)group.add(createTerrainFloor(map));if(map.layout&&this.backgrounds)group.add(createFlatBackdrop(map));
        const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({color:0xffffff}),boxes.length),dummy=new THREE.Object3D(),color=new THREE.Color();
        boxes.forEach((box,i)=>{dummy.position.set(box.x,box.y,box.z);dummy.scale.set(box.w,box.h,box.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color.set(box.color))});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;group.add(mesh);
      }
      this.scene.add(group);this.mapGroups.set(mapId,group);
    }
    this.mapGroups.get(mapId).visible=true;this.activeMap=mapId;
    this.standardCamera??=this.camera??createCamera();
    const background=this.backgrounds?.get(mapId);
    if(mapId===ART_MAP_ID){
      if(!this.artCamera){const h=ART_VIEW.halfHeight;this.artCamera=new THREE.OrthographicCamera(-h*768/480,h*768/480,h,-h,.1,100);this.artCamera.position.set(0,ART_VIEW.cameraY,ART_VIEW.cameraZ);this.artCamera.lookAt(0,ART_VIEW.targetY,0);this.artCamera.updateMatrixWorld()}
      this.camera=this.artCamera;
      if(background){if(!this.mapArtTextures.has(mapId)){const texture=new THREE.CanvasTexture(background);texture.colorSpace=THREE.SRGBColorSpace;this.mapArtTextures.set(mapId,texture)}this.scene.background=this.mapArtTextures.get(mapId)}else this.scene.background=new THREE.Color('#94a080');
    }else{this.camera=this.standardCamera;this.scene.background=new THREE.Color(MAPS.find(map=>map.id===mapId).backdrop??(mapId==='moon'?'#34495f':mapId==='sand'?'#cfb890':'#465f4e'))}

  }
  project(x,y,height=1.9){const point=this.activeMap===ART_MAP_ID?artWorldPosition(x,y):worldPosition(x,y);this.vector.set(point.x,height,point.z).project(this.camera);return{x:(this.vector.x+1)*384,y:(1-this.vector.y)*240}}
  place(batch,index,x,y,z,w,h,d,rx=0,rz=0,ry=0){
    this.part.position.set(x,y,z);this.part.rotation.set(rx,ry,rz);this.part.scale.set(w,h,d);this.part.updateMatrix();this.matrix.multiplyMatrices(this.root.matrix,this.part.matrix);batch.setMatrixAt(index,this.matrix);
  }
  actors(battle){
    const b=this.batches,n=battle.fighters.length,scale=fighterScale(this.mobile,n);
    for(const mesh of Object.values(b))mesh.count=n*mesh.userData.parts;
    this.shadows.count=n;this.teamRings.count=n;
    for(const f of battle.fighters){
      const id=f.id,point=this.activeMap===ART_MAP_ID?artWorldPosition(f.x,f.y):worldPosition(f.x,f.y),kind=animalKind(f.teamId),dead=f.dead;
      const deathAge=this.deathAges?.[id]??Math.max(0,battle.elapsed-f.deadTime);
      const vanished=dead&&deathAge>1.1,p=animalPose(f,this.time,battle.state,this.pose||(this.pose={}),dead?f.deadTime+deathAge:battle.elapsed);
      const hx=0,hy=1.24;
      this.root.position.set(point.x+Math.sin(p.yaw)*p.lunge,dead?.1:p.bob,point.z+Math.cos(p.yaw)*p.lunge);
      this.root.rotation.set(p.leanX,p.yaw+p.fall*.7,p.leanZ);this.root.scale.set(scale*(vanished?0:1),scale*p.squash*(vanished?0:1),scale*(vanished?0:1));this.root.updateMatrix();
      this.place(b.body,id,0,0,0,1,1,1);
      this.place(b.smile,id,hx,hy-.12,.46,1,1,1,.24,Math.PI);
      for(let side=0;side<2;side++){
        const sign=side?1:-1,index=id*2+side,a=fighterArm(p,side,this.arm||(this.arm={}));
        const dx=a.x-a.shoulderX,dy=a.y-a.shoulderY,dz=a.z-a.shoulderZ,length=Math.hypot(dx,dy,dz);
        this.place(b.arms,index,(a.x+a.shoulderX)/2,(a.y+a.shoulderY)/2,(a.z+a.shoulderZ)/2,.30,length+.10,.30,Math.atan2(dz,dy),-Math.atan2(dx,Math.hypot(dy,dz)));
        this.place(b.hands,index,a.x,a.y,a.z,.32,.34,.32);
        this.place(b.legs,index,sign*.23,.18,Math.sin(p.walk*sign)*.11,.34,.33,.42,p.walk*sign*.4);
        const earY=kind===1?1.85:kind===3?1.43:1.68,earX=kind===3?.48:.36,earH=kind===1?.59:kind===3?.65:.32;
        this.place(b.ears,index,hx+sign*earX,earY,-.025,kind===2?0:kind===1?.24:.34,kind===2?0:earH,kind===2?0:.28,kind===3?Math.sin(this.time*5+f.id)*.08:0,sign*(kind===3?.30:.12));
        this.place(b.catEars,index,hx+sign*.36,1.72,-.025,kind===2?.39:0,kind===2?.38:0,kind===2?.31:0,0,-sign*.19);
        const eyeY=hy+.015,blink=f.hurt>.2?.32:1;
        this.place(b.eyes,index,hx+sign*.175,eyeY,.447,.063,.09*blink,.02,-.03,0,sign*.32);
      }
      const ws=f.weapon==='sword'&&!dead?1:0,s=heldSword(fighterArm(p,1,this.arm),this.sword||(this.sword={}));
      this.place(b.blade,id,s.bladeX,s.bladeY,s.bladeZ,ws,ws,ws,s.pitch,s.roll);
      this.place(b.guard,id,s.guardX,s.guardY,s.guardZ,ws*.43,ws*.12,ws*.16,s.pitch,s.roll);
      this.place(b.grip,id,s.x,s.y,s.z,ws*.12,ws*.31,ws*.12,s.pitch,s.roll);
      this.color.set(f.flash>0?'#fff1da':f.color).lerp(SOFT_TINT,.14);b.body.setColorAt(id,this.color);
      for(const mesh of[b.arms,b.hands,b.legs,b.ears,b.catEars]){mesh.setColorAt(id*2,this.color);mesh.setColorAt(id*2+1,this.color)}
      this.part.position.set(point.x,.1,point.z);this.part.rotation.set(-Math.PI/2,0,0);this.part.scale.set(vanished?0:1.25,vanished?0:.95,1);this.part.updateMatrix();this.shadows.setMatrixAt(id,this.part.matrix);
      this.part.position.set(point.x,.145,point.z);this.part.scale.setScalar(dead?0:scale*1.3);this.part.updateMatrix();this.teamRings.setMatrixAt(id,this.part.matrix);this.teamRings.setColorAt(id,this.color.set(f.color));
    }
    for(const mesh of Object.values(b)){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true}
    this.shadows.instanceMatrix.needsUpdate=true;this.teamRings.instanceMatrix.needsUpdate=true;this.teamRings.instanceColor.needsUpdate=true;
  }
  event(e){
    const p=this.project(e.x,e.y+(e.type==='hit'?25:0),1.6);
    if(e.type==='hit'&&e.crit)this.numbers.push({x:p.x,y:p.y,text:e.type==='dodge'?'회피':String(e.damage)+(e.crit?'!':''),life:.65,crit:e.crit});
    if(e.type==='hit'||e.type==='eliminate')for(let i=0;i<(this.lowPower?3:7);i++)this.particles.push({x:p.x,y:p.y,vx:(Math.random()-.5)*65,vy:-Math.random()*45,life:.4,color:e.type==='eliminate'?e.fighter.color:'#ffe7a4'});
    if(e.type==='attack'){const center=this.project(e.fighter.x,e.fighter.y,1.35),sword=e.fighter.weapon==='sword';this.rings.push({kind:'swing',x:center.x,y:center.y,angle:e.fighter.angle,side:sword?1:e.fighter.attackSide,sword,life:sword?.3:.22,color:e.fighter.color})}
    if(e.type==='hit')this.rings.push({kind:'impact',x:p.x,y:p.y,life:.18,crit:e.crit});
    if(e.type==='skill'){const screen=this.project(e.fighter.x,e.fighter.y,.1);this.rings.push({x:screen.x,y:screen.y,life:.35})}
    if(e.type==='win')for(let i=0;i<(this.lowPower?30:70);i++)this.particles.push({x:100+Math.random()*568,y:Math.random()*80,vx:(Math.random()-.5)*30,vy:30+Math.random()*40,life:4,color:['#efca74','#cfdb91','#eda181'][i%3]});
    this.particles=this.particles.slice(this.lowPower?-90:-200);this.numbers=this.numbers.slice(-12);this.rings=this.rings.slice(this.lowPower?-32:-64);
  }
  draw(battle,dt){
    if(this.contextLost||this.disposed)return;
    this.time+=dt;this.setMap(battle.map.id);
    if(this.lastBattle!==battle){this.rings=[];this.deathAges.fill(0);this.lastBattle=battle}
    for(const f of battle.fighters)if(f.dead)this.deathAges[f.id]+=dt;
    this.actors(battle);
    this.safeRing.visible=battle.ring!==null;if(battle.ring!==null)this.safeRing.scale.set(battle.ring/(this.activeMap===ART_MAP_ID?18:20),1,battle.ring/(this.activeMap===ART_MAP_ID?19.8:33));
    const center=battle.map.ringCenter??{x:384,y:252},ringPoint=this.activeMap===ART_MAP_ID?artWorldPosition(center.x,center.y):worldPosition(center.x,center.y);this.safeRing.position.set(ringPoint.x,0,ringPoint.z);
    this.gl.render(this.scene,this.camera);
    const c=this.c;c.clearRect(0,0,768,480);c.textAlign='center';
    const scale=fighterScale(this.mobile,battle.fighters.length);
    for(const f of battle.alive){
      const p=this.project(f.x,f.y,1.73*scale);
      if(f.hp<100&&battle.fighters.length<=40){c.fillStyle='#172c31';c.fillRect(p.x-12,p.y,24,5);c.fillStyle=f.hp>35?'#a4e38b':'#ffb46d';c.fillRect(p.x-11,p.y+1,22*f.hp/100,3)}
      if(battle.winner===f){c.font='26px sans-serif';c.fillStyle='#ffdc7a';c.strokeStyle='#172c31';c.lineWidth=3;c.strokeText('♛',p.x,p.y-10);c.fillText('♛',p.x,p.y-10)}
    }
    for(const n of this.numbers){n.life-=dt;n.y-=dt*25;c.globalAlpha=Math.min(1,Math.max(0,n.life*3));c.font=`800 ${n.crit?16:12}px sans-serif`;c.strokeStyle='#294331';c.lineWidth=3;c.strokeText(n.text,n.x,n.y);c.fillStyle=n.crit?'#ffda86':'#fff6d7';c.fillText(n.text,n.x,n.y)}c.globalAlpha=1;this.numbers=this.numbers.filter(n=>n.life>0);
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;c.globalAlpha=Math.min(1,Math.max(0,p.life*3));c.fillStyle=p.color;c.fillRect(p.x,p.y,3,3)}c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
    for(const ring of this.rings){
      ring.life-=dt;if(ring.life<=0)continue;
      if(ring.kind==='swing'){
        const progress=1-ring.life/(ring.sword?.3:.22),angle=ring.angle+(ring.side?1:-1)*(.9-progress*1.7);
        c.globalAlpha=Math.min(1,ring.life*5);c.save();c.translate(ring.x,ring.y);c.scale(1,.65);c.beginPath();c.arc(0,0,(ring.sword?25:18)+progress*9,angle-.65,angle+.65);c.strokeStyle=ring.sword?'#b8e6ee':'#fff2cc';c.lineWidth=ring.sword?6:4;c.stroke();c.strokeStyle='#fffdf0';c.lineWidth=2;c.stroke();c.restore();
      }else if(ring.kind==='impact'){
        c.globalAlpha=Math.min(1,ring.life*9);const radius=(ring.crit?14:9)*(1-ring.life/.18)+5;c.strokeStyle='#fff8de';c.lineWidth=3;
        for(let i=0;i<5;i++){const a=i/5*Math.PI*2;c.beginPath();c.moveTo(ring.x+Math.cos(a)*radius*.4,ring.y+Math.sin(a)*radius*.4);c.lineTo(ring.x+Math.cos(a)*radius,ring.y+Math.sin(a)*radius);c.stroke()}
      }else{
        c.globalAlpha=Math.max(0,ring.life/.35);c.strokeStyle='#fff1b5';c.lineWidth=3;c.beginPath();c.ellipse(ring.x,ring.y,(1-ring.life/.35)*45,(1-ring.life/.35)*22,0,0,Math.PI*2);c.stroke();
      }
    }c.globalAlpha=1;this.rings=this.rings.filter(r=>r.life>0);

  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    this.canvas.removeEventListener('webglcontextlost',this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored',this.onContextRestored);
    disposeScene(this.scene);this.gl.dispose();this.gl.forceContextLoss();
    this.mapGroups.clear();for(const canvas of this.backgrounds.values())canvas.cancelMapArt?.();this.backgrounds.clear();if(this.mapArtTextures){for(const texture of this.mapArtTextures.values())texture.dispose();this.mapArtTextures.clear()}this.lastBattle=null;
    this.particles=[];this.numbers=[];this.rings=[];this.overlay.remove();
  }
}
