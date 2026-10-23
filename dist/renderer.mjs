import {ART_MAP_ID,loadMapArt,projectArtPoint,artPillarRect} from './art-map.mjs';
import {terrainContains} from './terrain.mjs';
import {drawFlatGround,drawFlatProps} from './flat-scenery.mjs';
import{MAPS,seededRandom}from'./engine.mjs';
const W=768,H=480;
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function poly(c,pts,color){c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()}
function shade(hex,delta){const n=parseInt(hex.slice(1),16);return'#'+[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,v+delta)).toString(16).padStart(2,'0')).join('')}
function tree(c,x,y,map,s=1){c.save();c.translate(x,y);c.scale(s,s);const moon=map.id==='moon';rect(c,-17,-2,38,10,'#142c2733');rect(c,-4,-24,8,31,moon?'#50616e':'#756447');rect(c,-2,-22,3,29,moon?'#76858c':'#a28b5a');const dark=moon?'#3f5c73':'#345e41',mid=moon?'#5a7b8e':'#4f8050',light=moon?'#7a9a9d':'#76a366';poly(c,[[-30,-20],[-34,-34],[-28,-45],[-20,-45],[-20,-56],[-6,-56],[-6,-64],[10,-64],[10,-57],[23,-57],[23,-46],[32,-46],[36,-29],[28,-16],[11,-12],[-12,-13]],dark);poly(c,[[-29,-33],[-26,-44],[-15,-44],[-15,-55],[-4,-55],[-4,-60],[9,-60],[9,-53],[20,-53],[20,-43],[29,-43],[29,-29],[19,-22],[-10,-21],[-10,-27]],mid);poly(c,[[-18,-43],[-12,-43],[-12,-53],[-3,-53],[-3,-57],[7,-57],[7,-49],[19,-49],[19,-42],[9,-42],[9,-36],[-14,-36]],light);rect(c,-25,-32,7,4,light);rect(c,16,-30,9,4,shade(mid,18));rect(c,-9,-19,9,3,shade(mid,-9));c.restore()}
function cactus(c,x,y,map){rect(c,x-9,y+2,22,6,'#815b3633');rect(c,x-5,y-34,10,37,'#608358');rect(c,x-3,y-35,4,35,'#83a366');rect(c,x-15,y-25,7,19,'#608358');rect(c,x-12,y-12,12,6,'#608358');rect(c,x+9,y-29,6,17,'#608358');rect(c,x+3,y-17,11,6,'#608358');rect(c,x-13,y-24,3,13,'#83a366');rect(c,x+10,y-28,2,12,'#83a366');rect(c,x-2,y-25,2,3,'#cbd8a3')}
function pillar(c,o,map){const{x,y}=o;
 if(map.terrain&&!map.layout){const r=o.r;c.save();c.translate(x,y);c.fillStyle='#17293930';c.beginPath();c.ellipse(3,4,r+4,r*.64,0,0,Math.PI*2);c.fill();
 if(map.id==='ice'){poly(c,[[-r,r*.4],[-r*.7,-r],[0,-r*1.8],[r*.8,-r],[r,r*.4]],'#93c8df');poly(c,[[0,-r*1.8],[r*.8,-r],[r,r*.4],[0,r*.6]],'#c7edf3');rect(c,-r*.4,-r,r*.18,r,'#efffff')}
 else if(map.id==='lava'){poly(c,[[-r,r*.3],[-r*.8,-r*.7],[0,-r*1.2],[r,-r*.4],[r*.85,r*.5]],'#5c4553');poly(c,[[-r*.8,-r*.7],[0,-r*1.2],[r,-r*.4],[0,-r*.25]],'#96717a');rect(c,-r*.45,0,r*.7,3,'#ffb86a')}
 else{rect(c,-r*.75,-r*1.2,r*1.5,r*1.6,'#966940');rect(c,-r*.75,-r*1.2,r*1.5,r*.4,'#d1a36d');rect(c,-r*.5,-r*1.2,3,r*1.6,'#634a36');rect(c,r*.4,-r*1.2,3,r*1.6,'#634a36')}
 c.restore();return;
 }rect(c,x-21,y+1,45,13,'#23332925');rect(c,x-16,y-18,32,26,map.edge);rect(c,x-12,y-27,24,26,shade(map.tile,-9));rect(c,x-14,y-29,28,8,shade(map.tile,20));rect(c,x-17,y-8,34,9,shade(map.floor,-12));rect(c,x-17,y-10,34,4,shade(map.tile,15));rect(c,x-9,y-20,4,9,shade(map.edge,18));rect(c,x+5,y-19,3,8,map.edge);if(map.id==='forest'){rect(c,x-14,y-29,14,4,'#78925e');rect(c,x-15,y-25,5,8,'#6c8452');rect(c,x+11,y-8,6,5,'#8ba367')}else if(map.id==='moon'){rect(c,x-3,y-24,6,6,'#d4cce1');rect(c,x-1,y-25,2,8,'#f1e4f3')}}
function outdoorMap(c,map){
 rect(c,0,0,W,H,map.ground);const random=seededRandom(8721);
 for(let i=0;i<220;i++)rect(c,random()*W,random()*H,8+random()*20,2,i%3?map.light:map.dark);
 if(map.layout){drawFlatGround(c,map);drawFlatProps(c,map)}
 const path=()=>{c.beginPath();for(const polygon of[map.terrain,...map.holes??[]]){polygon.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath()}};
 c.save();c.translate(0,9);path();c.fillStyle=map.edge;c.fill('evenodd');c.restore();path();c.fillStyle=map.floor;c.fill('evenodd');
 c.save();path();c.clip('evenodd');
 for(let y=90,row=0;y<414;y+=18,row++)for(let x=76;x<692;x+=24){rect(c,x+1,y+1,22,16,(row+Math.floor(x/24))%3?map.tile:map.floor);if(map.id==='ice'&&random()>.88)rect(c,x+3,y+4,11,1,'#f1ffff')}
 if(map.bridge){const b=map.bridge;rect(c,b.x,b.y,b.w,b.h,'#8f704d');for(let y=b.y+1;y<b.y+b.h;y+=8){rect(c,b.x+1,y,b.w-2,6,'#c2a06a');rect(c,b.x+1,y,b.w-2,1,'#d9ba83')}}
 c.restore();path();c.strokeStyle=map.id==='ice'?'#efffff':map.edge;c.lineWidth=4;c.stroke();
 if(map.layout){for(const polygon of[map.terrain,...map.holes??[]])for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/18);for(let j=0;j<n;j++){const t=(j+.5)/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;rect(c,x-4,y-6,8,7,map.edge);rect(c,x-4,y-7,8,2,map.accent)}}}
 if(map.holes)for(const polygon of map.holes){const xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;rect(c,x+5,y+5,w-10,h-10,'#6f985c');for(let i=0;i<22;i++){const px=x+16+random()*(w-32),py=y+16+random()*(h-32);rect(c,px-6,py-5,12,10,i%3?'#91ad72':'#c7c98a')}}
 if(map.id==='ship'){for(const x of[244,524]){rect(c,x-4,44,8,54,'#75523a');rect(c,x-30,53,60,4,'#af9063');rect(c,x-26,58,52,25,'#f0e0bb')}}
 for(const o of map.obstacles)pillar(c,o,map);
}
export function makeMap(mapId){const map=MAPS.find(m=>m.id===mapId)||MAPS[0],canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;const random=seededRandom(8712);if(map.art){rect(c,0,0,W,H,map.ground);rect(c,65,76,638,347,map.floor);for(const o of map.obstacles)pillar(c,o,map);loadMapArt(canvas,map.art);return canvas}if(map.terrain){outdoorMap(c,map);return canvas}rect(c,0,0,W,H,map.ground);
 // Pixel clusters on the woodland floor, with a coherent light direction.
 for(let i=0;i<1650;i++){const x=Math.floor(random()*W/3)*3,y=Math.floor(random()*H/3)*3;rect(c,x,y,random()>.8?6:3,2,random()>.5?map.dark:map.light)}
 // Deep foundation, vertical stone courses and a chipped perimeter.
 rect(c,57,78,654,354,map.dark);rect(c,65,78,638,363,shade(map.edge,-14));rect(c,65,423,638,15,map.edge);
 for(let x=65;x<700;x+=32){rect(c,x,424,30,9,shade(map.edge,9));rect(c,x+2,435,26,3,shade(map.edge,-10))}
 rect(c,65,76,638,347,map.floor);
 for(let y=79;y<420;y+=27){const offset=((y-79)/27)%2?16:0;for(let x=66-offset;x<702;x+=36){const xx=Math.max(66,x),width=Math.min(x+34,701)-xx;if(width<=0)continue;const v=Math.floor(random()*11)-5;rect(c,xx,y,width,25,shade(map.tile,v));rect(c,xx,y,width,2,shade(map.tile,v+11));rect(c,xx,y+23,width,2,shade(map.floor,-2));if(random()>.76){rect(c,xx+8,y+11,9,1,shade(map.floor,-13));rect(c,xx+15,y+12,1,4,shade(map.floor,-13))}if(random()>.84)rect(c,xx+4,y+4,2,2,shade(map.floor,19))}}
 // Border insets and fine corner accents.
 rect(c,72,84,624,3,shade(map.edge,9));rect(c,72,414,624,3,shade(map.edge,7));rect(c,72,84,3,333,shade(map.edge,7));rect(c,693,84,3,333,shade(map.edge,7));
 for(const x of[80,674])for(const y of[91,398]){rect(c,x,y,14,3,map.accent);rect(c,x,y,3,14,map.accent);rect(c,x+11,y+11,3,3,map.accent)}
 // Faded central arena seal.
 c.save();c.globalAlpha=.2;c.strokeStyle=map.edge;c.lineWidth=3;c.beginPath();c.ellipse(384,252,85,55,0,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(384,252,77,49,0,0,Math.PI*2);c.stroke();c.lineWidth=5;c.beginPath();c.moveTo(365,235);c.lineTo(405,270);c.moveTo(404,234);c.lineTo(365,270);c.stroke();c.restore();
 // Stone stairway through the bottom wall.
 for(let i=0;i<4;i++){rect(c,343-i*3,421+i*5,82+i*6,5,shade(map.tile,-i*7));rect(c,343-i*3,421+i*5,82+i*6,1,shade(map.tile,15-i*7))}
 // Moss growing in the seams and soft grass tufts outside the arena.
 for(let i=0;i<100;i++){const x=78+random()*607,y=89+random()*320;if(map.id==='forest'&&random()>.5){rect(c,x,y,7,2,'#8fa57c');rect(c,x+3,y-2,2,3,'#9daf83')}}
 for(let i=0;i<140;i++){const x=random()*W,y=random()*H;if(x>55&&x<713&&y>60&&y<446)continue;rect(c,x,y,2,5,map.light);rect(c,x-3,y+2,2,3,map.light);if(random()>.8){rect(c,x,y-2,3,3,map.id==='moon'?'#c5b7cc':'#d6ce8e')}}
 // Peripheral environment: full trees and cropped canopies lend depth.
 const decor=[[14,89,1.4],[70,38,1.1],[159,40,.85],[258,42,.72],[670,44,1.12],[738,110,1.35],[19,231,1.05],[750,294,1.15],[35,391,1.22],[108,475,1.22],[658,481,1.08],[750,450,1.4],[456,28,.75]];
 for(const[x,y,s]of decor){if(map.id==='sand')cactus(c,x,y,map);else tree(c,x,y,map,s)}
 // Two warm braziers on the top approach.
 for(const x of[328,440]){rect(c,x-7,64,14,10,map.edge);rect(c,x-5,53,10,12,shade(map.edge,-14));rect(c,x-7,51,14,5,'#a59b73');rect(c,x-4,44,8,8,map.id==='moon'?'#b9c8e5':'#efc76a');rect(c,x-2,40,4,10,map.id==='moon'?'#e0e6f1':'#ffe4a2')}
 return canvas;
}
export function drawFighter(c,f,time=0,scale=1,showLabel=true,labelSize=9){
 c.save();c.translate(Math.round(f.x),Math.round(f.y));c.scale(scale,scale);
 if(f.dead){c.globalAlpha=.23;rect(c,-6,-3,12,4,'#283c32');rect(c,-4,-4,8,3,f.color);c.restore();return}
 const outline='#2c3336',bob=Math.round(Math.sin(f.step||time*2)),walk=Math.sin(f.step||time*2)>0?1:-1;
 // A plain cream head, colored body and four tiny limbs: no equipment or clothing detail.
 rect(c,-9,0,18,3,'#203b3230');c.translate(0,bob);
 rect(c,-5,-2,3,4,outline);rect(c,3,-2+walk,3,4,outline);
 rect(c,-7,-13,14,12,outline);rect(c,-5,-15,10,16,outline);rect(c,-6,-12,12,9,f.color);rect(c,-4,-14,8,12,f.color);rect(c,-4,-3,8,2,shade(f.color,-20));
 rect(c,-9,-10,3,5,outline);rect(c,7,-10,3,5,outline);rect(c,-9,-9,2,3,'#ffe5b9');rect(c,8,-9,2,3,'#ffe5b9');
 const headGradient=c.createRadialGradient(-3,-22,1,0,-19,8);headGradient.addColorStop(0,'#fff8df');headGradient.addColorStop(1,'#d8ba93');c.fillStyle=outline;c.beginPath();c.arc(0,-19,8,0,Math.PI*2);c.fill();c.fillStyle=headGradient;c.beginPath();c.arc(0,-19,7,0,Math.PI*2);c.fill();
 const ex=f.face>0?1:-1;rect(c,ex-3,-19,2,2,outline);rect(c,ex+2,-19,2,2,outline);
 if(f.weapon==='sword'){const side=f.face>0?1:-1;rect(c,side*10-1,-15,2,11,'#dce3d4');rect(c,side*10-3,-5,6,2,'#d7b66e');rect(c,side*10-1,-3,2,4,'#765538')}
 if(f.flash>0){c.globalAlpha=.6;rect(c,-6,-23,12,21,'#fff8d5');c.globalAlpha=1}
 if(f.swing>0){c.save();c.rotate(f.angle);c.strokeStyle='#fffae3';c.lineWidth=3;c.beginPath();c.arc(0,-8,20,-.7,.7);c.stroke();c.restore()}
 c.translate(0,-bob);
 rect(c,-9,-30,18,3,outline);rect(c,-8,-29,16*Math.max(0,f.hp)/100,1,f.hp>35?'#a6e26b':'#ffbd68');
 if(showLabel){c.font=`600 ${labelSize}px "Noto Sans KR",sans-serif`;const width=c.measureText(f.name).width+8;rect(c,-width/2,-34-labelSize,width,labelSize+4,'#233e32e8');c.fillStyle='#fffbe5';c.textAlign='center';c.fillText(f.name,0,-31)}
 c.restore();
}
export function drawAvatar(canvas,color,index=0){canvas.width=36;canvas.height=36;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;drawFighter(c,{x:18,y:33,color,hp:100,face:1,step:0,swing:0},0,1,false)}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d');this.backgrounds=new Map(MAPS.map(m=>[m.id,makeMap(m.id)]));this.particles=[];this.numbers=[];this.shake=0;this.time=0;this.effects=true}
 event(event){const{x,y}=this.activeMap===ART_MAP_ID?projectArtPoint(event.x,event.y):event;if(event.type==='hit'){
  this.numbers.push({x,y,text:String(event.damage),life:.8,crit:event.crit});if(this.effects)this.shake=event.crit?3:1.2;
  for(let i=0;i<(event.crit?11:6);i++)this.particles.push({x,y:y+12,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100-20,life:.25+Math.random()*.2,max:.45,color:event.crit?'#ffe4a0':'#f9f5d0',size:2+Math.random()*2});
 }else if(event.type==='eliminate'){for(let i=0;i<15;i++)this.particles.push({x,y:y-10,vx:(Math.random()-.5)*100,vy:-Math.random()*85,life:.6,max:.6,color:event.fighter.color,size:3})}
 else if(event.type==='dash'){for(let i=0;i<5;i++)this.particles.push({x:x+(Math.random()-.5)*12,y,vx:(Math.random()-.5)*15,vy:-8,life:.3,max:.3,color:'#fff1c4',size:2})}
 else if(event.type==='dodge'){this.numbers.push({x,y,text:'회피',life:.55,crit:false})}
 else if(event.type==='skill'){for(let i=0;i<18;i++){const a=i/18*Math.PI*2;this.particles.push({x,y,vx:Math.cos(a)*125,vy:Math.sin(a)*75,life:.35,max:.35,color:'#fff2af',size:3})}}
 else if(event.type==='win'){for(let i=0;i<100;i++)this.particles.push({x:80+Math.random()*608,y:-Math.random()*220,vx:(Math.random()-.5)*45,vy:40+Math.random()*50,life:5,max:5,color:['#e4b859','#c9d695','#e19a7c','#b2c4d3'][i%4],size:3+Math.random()*3})}
 this.particles=this.particles.slice(this.lowPower?-180:-700);this.numbers=this.numbers.slice(this.lowPower?-28:-100)}
 draw(battle,dt){this.activeMap=battle.map.id;this.canvas.style.imageRendering=battle.map.art?'auto':'';this.time+=dt;const c=this.c,ringCenter=battle.map.ringCenter??{x:384,y:252};c.imageSmoothingEnabled=Boolean(battle.map.art);c.save();const s=this.effects?this.shake:0;c.translate((Math.random()-.5)*s,(Math.random()-.5)*s);this.shake*=.7;c.drawImage(this.backgrounds.get(battle.map.id),0,0);
  if(battle.map.id===ART_MAP_ID&&battle.ring!==null){const center=projectArtPoint(384,252),edge=projectArtPoint(384+battle.ring,252),bottom=projectArtPoint(384,252+battle.ring/1.65);c.save();c.fillStyle='#b65a5233';c.beginPath();c.rect(0,0,W,H);c.ellipse(center.x,center.y,edge.x-center.x,bottom.y-center.y,0,0,Math.PI*2,true);c.fill('evenodd');c.restore()}else if(battle.ring!==null){c.save();c.fillStyle='#b65a5233';c.beginPath();c.rect(76,88,616,328);c.ellipse(ringCenter.x,ringCenter.y,battle.ring,battle.ring/1.65,0,0,Math.PI*2,true);c.fill('evenodd');c.strokeStyle='#f4cf8c88';c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.ellipse(ringCenter.x,ringCenter.y,battle.ring,battle.ring/1.65,0,0,Math.PI*2);c.stroke();c.restore()}
  // Sort pillars and fighters by feet position for correct top-down occlusion.
  const entities=[...battle.map.obstacles.map(o=>({kind:'pillar',y:o.y,o})),...battle.fighters.map(f=>({kind:'fighter',y:f.y,f}))].sort((a,b)=>a.y-b.y);
  const representatives=new Map();for(const f of battle.alive)if(!representatives.has(f.teamId))representatives.set(f.teamId,f.id);
  for(const e of entities)if(e.kind==='pillar'){if(battle.map.id===ART_MAP_ID){const r=artPillarRect(e.o);c.save();c.beginPath();c.rect(r.x,r.y,r.w,r.h);c.clip();c.drawImage(this.backgrounds.get(battle.map.id),0,0);c.restore()}else pillar(c,e.o,battle.map)}else{const f=e.f;if(f.dead&&battle.elapsed-f.deadTime>2)continue;if(battle.state==='ready')f.step=this.time*2+f.id;const display=battle.map.id===ART_MAP_ID?{...f,...projectArtPoint(f.x,f.y)}:f;drawFighter(c,display,this.time,this.mobile?1.15:1,false,this.mobile?12:9);if(battle.state==='finished'&&battle.winner===f){c.fillStyle='#f4d585';c.font='19px sans-serif';c.textAlign='center';c.fillText('♛',display.x,display.y-57+Math.sin(this.time*3)*2)}}
  for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.max<2)p.vy+=100*dt;c.globalAlpha=Math.max(0,p.life/p.max);rect(c,p.x,p.y,p.size,p.size,p.color)}c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
  for(const n of this.numbers){n.life-=dt;n.y-=dt*23;c.globalAlpha=Math.min(1,Math.max(0,n.life*3));c.font=`800 ${n.crit?16:12}px Outfit,sans-serif`;c.textAlign='center';c.lineWidth=3;c.strokeStyle='#294532';c.strokeText(n.text+(n.crit?'!':''),n.x,n.y);c.fillStyle=n.crit?'#ffe09a':'#fffbdc';c.fillText(n.text+(n.crit?'!':''),n.x,n.y)}c.globalAlpha=1;this.numbers=this.numbers.filter(n=>n.life>0);
  if(battle.map.id==='moon'){for(let i=0;i<22;i++){const x=40+(i*103)%700+Math.sin(this.time*.7+i)*8,y=30+(i*71)%410+Math.cos(this.time*.5+i)*8;c.globalAlpha=.25+Math.sin(this.time+i)*.15;rect(c,x,y,2,2,'#e1e4cd')}c.globalAlpha=1}c.restore();
 }
 dispose(){for(const canvas of this.backgrounds.values())canvas.cancelMapArt?.();this.backgrounds.clear();this.particles=[];this.numbers=[]}

}
