import * as THREE from './vendor/three.module.js';
import {Renderer as FlatRenderer,makeMap} from './renderer.mjs';
import {MAPS,MAX_FIGHTERS} from './engine.mjs';
import {createCamera,createFighterBatches,roomBoxes,worldPosition} from './scene-model.mjs';
import {createTerrainFloor} from './outdoor-model.mjs';
import {fighterScale} from './display-model.mjs';
import {disposeScene} from './resource-cleanup.mjs';

// A tiny code-drawn icon matches the sphere head without loading a paid asset.
export function drawAvatar(canvas,color){
  canvas.width=48;canvas.height=48;const c=canvas.getContext('2d');c.clearRect(0,0,48,48);
  c.fillStyle='#233c2922';c.beginPath();c.ellipse(24,44,12,3,0,0,Math.PI*2);c.fill();
  c.fillStyle=color;c.fillRect(16,26,16,13);c.fillRect(10,28,6,11);c.fillRect(32,28,6,11);
  c.fillStyle='#334936';c.fillRect(17,39,6,6);c.fillRect(26,39,6,6);
  const g=c.createRadialGradient(20,12,2,24,19,15);g.addColorStop(0,'#fff4d5');g.addColorStop(1,'#d8bb92');c.fillStyle=g;c.beginPath();c.arc(24,19,14,0,Math.PI*2);c.fill();
  c.fillStyle='#302c25';c.fillRect(18,20,3,4);c.fillRect(27,20,3,4);
}

export class Renderer {
  constructor(canvas){
    const surface=document.createElement('canvas');
    try{
      this.gl=new THREE.WebGLRenderer({canvas:surface,antialias:true,powerPreference:'high-performance',alpha:false});
    }catch{
      return new FlatRenderer(canvas);
    }
    surface.id=canvas.id;surface.setAttribute('aria-label','구형 머리 캐릭터들이 자동으로 싸우는 입체 경기장');surface.width=768;surface.height=480;canvas.replaceWith(surface);this.canvas=surface;surface.classList.add('arena-3d');
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));this.gl.setSize(768,480,false);this.gl.outputColorSpace=THREE.SRGBColorSpace;this.gl.toneMapping=THREE.ACESFilmicToneMapping;this.gl.toneMappingExposure=1;
    this.scene=new THREE.Scene();this.camera=createCamera();this.scene.background=new THREE.Color('#465f4e');
    this.scene.add(new THREE.HemisphereLight('#fff7de','#687563',1.2));
    const sun=new THREE.DirectionalLight('#fff1d5',2);sun.position.set(-9,18,10);this.scene.add(sun);
    this.batches=createFighterBatches();for(const mesh of Object.values(this.batches))this.scene.add(mesh);
    this.mapGroups=new Map();this.activeMap=null;this.lastBattle=null;this.time=0;this.effects=true;this.particles=[];this.numbers=[];this.rings=[];this.mobile=false;this.lowPower=false;
    this.backgrounds=new Map(MAPS.map(map=>[map.id,makeMap(map.id)]));
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=32;const c=shadowCanvas.getContext('2d');const radial=c.createRadialGradient(16,16,2,16,16,15);radial.addColorStop(0,'rgba(22,28,18,.4)');radial.addColorStop(1,'rgba(22,28,18,0)');c.fillStyle=radial;c.fillRect(0,0,32,32);
    this.shadows=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),MAX_FIGHTERS);this.shadows.frustumCulled=false;this.shadows.renderOrder=1;this.scene.add(this.shadows);
    this.overlay=document.createElement('canvas');this.overlay.width=1536;this.overlay.height=960;this.overlay.className='arena-overlay';this.overlay.setAttribute('aria-hidden','true');surface.after(this.overlay);this.c=this.overlay.getContext('2d');this.c.scale(2,2);
    this.teamRings=new THREE.InstancedMesh(new THREE.RingGeometry(.34,.51,24),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,depthWrite:false}),MAX_FIGHTERS);this.teamRings.frustumCulled=false;this.scene.add(this.teamRings);
    this.root=new THREE.Object3D();this.part=new THREE.Object3D();this.matrix=new THREE.Matrix4();this.vector=new THREE.Vector3();this.color=new THREE.Color();
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
      const group=new THREE.Group(),map=MAPS.find(m=>m.id===mapId);const boxes=roomBoxes(mapId,map.obstacles);if(map.terrain)group.add(createTerrainFloor(map));
      const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({color:0xffffff}),boxes.length),dummy=new THREE.Object3D(),color=new THREE.Color();
      boxes.forEach((box,i)=>{dummy.position.set(box.x,box.y,box.z);dummy.scale.set(box.w,box.h,box.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color.set(box.color))});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;group.add(mesh);this.scene.add(group);this.mapGroups.set(mapId,group);
    }
    this.mapGroups.get(mapId).visible=true;this.activeMap=mapId;this.scene.background.set(MAPS.find(map=>map.id===mapId).backdrop??(mapId==='moon'?'#34495f':mapId==='sand'?'#cfb890':'#465f4e'));
  }
  project(x,y,height=1.9){const point=worldPosition(x,y);this.vector.set(point.x,height,point.z).project(this.camera);return{x:(this.vector.x+1)*384,y:(1-this.vector.y)*240}}
  place(batch,index,x,y,z,w,h,d,rx=0,rz=0){
    this.part.position.set(x,y,z);this.part.rotation.set(rx,0,rz);this.part.scale.set(w,h,d);this.part.updateMatrix();this.matrix.multiplyMatrices(this.root.matrix,this.part.matrix);batch.setMatrixAt(index,this.matrix);
  }
  actors(battle){
    const b=this.batches,n=battle.fighters.length;
    for(const[name,mesh]of Object.entries(b))mesh.count=['arms','hands','legs','eyes'].includes(name)?n*2:n;
    this.shadows.count=n;this.teamRings.count=n;const scale=fighterScale(this.mobile,n);
    for(const f of battle.fighters){
      const id=f.id,point=worldPosition(f.x,f.y),dead=f.dead;
      const vanished=dead&&battle.elapsed-f.deadTime>1.1;
      const bob=dead?0:Math.max(0,Math.sin(f.step||this.time*2))*.045;
      this.root.position.set(point.x,dead?.15:bob,point.z);this.root.rotation.set(0,battle.state==='ready'?.2+Math.sin(f.id)*.25:Math.PI/2-f.angle,dead?Math.PI/2:0);this.root.scale.setScalar(vanished?0:scale);this.root.updateMatrix();
      const walk=dead?0:Math.sin(f.step||this.time*2)*.45,swing=f.swing>0?Math.sin(f.swing/.24*Math.PI)*1.35:walk*.55;
      this.place(b.headOutline,id,0,1.28,0,1.12,1.12,1.12);this.place(b.bodyOutline,id,0,.7,0,.49,.56,.36);
      this.place(b.body,id,0,.7,0,.42,.5,.29);this.place(b.head,id,0,1.28,0,1,1,1);
      for(let side=0;side<2;side++){const s=side?1:-1,index=id*2+side,armAngle=side?swing:-walk*.55;
        this.place(b.arms,index,s*.31,.73,Math.sin(armAngle)*.13,.16,.4,.19,armAngle);
        this.place(b.hands,index,s*.31,.46,Math.sin(armAngle)*.25,.17,.15,.18,armAngle);
        this.place(b.legs,index,s*.115,.23,Math.sin(walk*s)*.11,.18,.4,.22,walk*s);
        this.place(b.eyes,index,s*.115,1.28,.341,.065,.085,.028);
      }
      const armed=f.weapon==='sword'&&!dead,weaponScale=armed?1:0,theta=.3+swing,handZ=Math.sin(swing)*.25;
      this.place(b.blade,id,.31,.46+Math.cos(theta)*.42,handZ+Math.sin(theta)*.42,weaponScale*.07,weaponScale*.57,weaponScale*.08,theta);
      this.place(b.guard,id,.31,.46+Math.cos(theta)*.1,handZ+Math.sin(theta)*.1,weaponScale*.26,weaponScale*.055,weaponScale*.12,theta);
      this.place(b.grip,id,.31,.46,handZ,weaponScale*.07,weaponScale*.19,weaponScale*.07,theta);
      this.color.set(f.flash>0?'#fff4c4':f.color);b.body.setColorAt(id,this.color);
      b.arms.setColorAt(id*2,this.color);b.arms.setColorAt(id*2+1,this.color);this.color.multiplyScalar(.68);b.legs.setColorAt(id*2,this.color);b.legs.setColorAt(id*2+1,this.color);
      this.part.position.set(point.x,.1,point.z);this.part.rotation.set(-Math.PI/2,0,0);this.part.scale.set(vanished?0:.95,vanished?0:.7,1);this.part.updateMatrix();this.shadows.setMatrixAt(id,this.part.matrix);
      this.part.position.set(point.x,.145,point.z);this.part.scale.setScalar(dead?0:scale*1.1);this.part.updateMatrix();this.teamRings.setMatrixAt(id,this.part.matrix);this.teamRings.setColorAt(id,this.color.set(f.color));
    }
    for(const mesh of Object.values(b)){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true}this.shadows.instanceMatrix.needsUpdate=true;this.teamRings.instanceMatrix.needsUpdate=true;this.teamRings.instanceColor.needsUpdate=true;
  }
  event(e){
    const p=this.project(e.x,e.y+(e.type==='hit'?25:0),1.6);
    if(e.type==='hit'&&e.crit)this.numbers.push({x:p.x,y:p.y,text:e.type==='dodge'?'회피':String(e.damage)+(e.crit?'!':''),life:.65,crit:e.crit});
    if(e.type==='hit'||e.type==='eliminate')for(let i=0;i<(this.lowPower?3:7);i++)this.particles.push({x:p.x,y:p.y,vx:(Math.random()-.5)*65,vy:-Math.random()*45,life:.4,color:e.type==='eliminate'?e.fighter.color:'#ffe7a4'});
    if(e.type==='skill'){const screen=this.project(e.fighter.x,e.fighter.y,.1);this.rings.push({x:screen.x,y:screen.y,life:.35})}
    if(e.type==='win')for(let i=0;i<(this.lowPower?30:70);i++)this.particles.push({x:100+Math.random()*568,y:Math.random()*80,vx:(Math.random()-.5)*30,vy:30+Math.random()*40,life:4,color:['#efca74','#cfdb91','#eda181'][i%3]});
    this.particles=this.particles.slice(this.lowPower?-90:-200);this.numbers=this.numbers.slice(-12);this.rings=this.rings.slice(this.lowPower?-32:-64);
  }
  draw(battle,dt){
    if(this.contextLost||this.disposed)return;
    this.time+=dt;this.setMap(battle.map.id);this.actors(battle);
    if(this.lastBattle!==battle){this.rings=[];this.lastBattle=battle}
    this.safeRing.visible=battle.ring!==null;if(battle.ring!==null)this.safeRing.scale.set(battle.ring/20,1,battle.ring/33);
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
    for(const ring of this.rings){ring.life-=dt;c.globalAlpha=Math.max(0,ring.life/.35);c.strokeStyle='#fff1b5';c.lineWidth=2;c.beginPath();c.ellipse(ring.x,ring.y,(1-ring.life/.35)*45,(1-ring.life/.35)*22,0,0,Math.PI*2);c.stroke()}c.globalAlpha=1;this.rings=this.rings.filter(r=>r.life>0);
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    this.canvas.removeEventListener('webglcontextlost',this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored',this.onContextRestored);
    disposeScene(this.scene);this.gl.dispose();this.gl.forceContextLoss();
    this.mapGroups.clear();this.backgrounds.clear();this.lastBattle=null;
    this.particles=[];this.numbers=[];this.rings=[];this.overlay.remove();
  }
}
