import {terrainContains,terrainSegmentClear} from './terrain.mjs';

export const TRAP_RADIUS=30,TRAP_WARNING=2,TRAP_DAMAGE=35;
export const TRAP_TYPES={
  blast:{name:'바닥 폭발',short:'폭발',color:'#ffab38',activeColor:'#fff1b3',duration:.55,damage:TRAP_DAMAGE,push:110},
  poison:{name:'독 장판',short:'독',color:'#91d469',activeColor:'#b4ed8a',duration:3,damage:6,tickEvery:.5,push:0},
  shockwave:{name:'충격파',short:'충격',color:'#77c4f3',activeColor:'#d2f0ff',duration:.55,damage:8,push:300}
};
const kinds=Object.keys(TRAP_TYPES);
export const trapType=zone=>TRAP_TYPES[zone.kind]??TRAP_TYPES.blast;
export function trapFits(map,x,y,r=TRAP_RADIUS){
  if(map.terrain?!terrainContains(map,x,y,r+12):x<91+r+12||x>677-r-12||y<106+r+12||y>410-r-12)return false;
  return map.obstacles.every(o=>Math.hypot(x-o.x,y-o.y)>o.r+r+8);
}

// Placement uses only the map and an independent random stream, never team IDs.
export class TrapField{
  constructor(map,random){
    this.random=random;this.zones=[];this.nextWaveAt=1.2;this.serial=0;
    this.sites=(map.hazards??[]).filter(p=>trapFits(map,p.x,p.y,p.r));
    this.candidates=[...this.sites];
    if(!map.hazards){const b=map.bounds??{x:100,y:110,w:570,h:290};for(let y=b.y;y<=b.y+b.h;y+=10)for(let x=b.x;x<=b.x+b.w;x+=10)if(trapFits(map,x,y))this.candidates.push({x,y})}
  }
  advance(elapsed){
    const blasts=[],pulses=[];
    for(const zone of this.zones){
      if(!zone.detonated&&elapsed>=zone.blastAt){zone.detonated=true;blasts.push(zone)}
      if(zone.kind==='poison'&&zone.detonated)while(zone.nextTickAt<=Math.min(elapsed,zone.expiresAt)+1e-9){pulses.push(zone);zone.nextTickAt+=TRAP_TYPES.poison.tickEvery}
    }
    this.zones=this.zones.filter(zone=>elapsed<zone.expiresAt);
    let warned=false;
    if(elapsed>=this.nextWaveAt){
      const candidates=[...this.candidates],count=Math.min(4,2+Math.floor(elapsed/12));
      while(candidates.length&&this.zones.length<count){
        let index=Math.floor(this.random()*candidates.length);
        // Mix a central warning with random flanks, using geometry alone.
        if(this.zones.length===0)for(let i=0;i<4;i++){
          const probe=Math.floor(this.random()*candidates.length),distance=p=>Math.hypot((p.x-384)*.65,p.y-252);
          if(distance(candidates[probe])<distance(candidates[index]))index=probe;
        }
        const point=candidates.splice(index,1)[0];
        if(this.zones.some(z=>Math.hypot(z.x-point.x,z.y-point.y)<(z.r??TRAP_RADIUS)+(point.r??TRAP_RADIUS)+24))continue;
        const kind=point.kind??kinds[Math.floor(this.random()*kinds.length)],blastAt=elapsed+TRAP_WARNING;
        this.zones.push({...point,kind,id:++this.serial,r:point.r??TRAP_RADIUS,createdAt:elapsed,blastAt,expiresAt:blastAt+TRAP_TYPES[kind].duration,nextTickAt:blastAt+(TRAP_TYPES[kind].tickEvery??Infinity),detonated:false});warned=true;
      }
      this.nextWaveAt=elapsed+Math.max(3.3,5-elapsed*.025);
    }
    return {warned,blasts,pulses};
  }
}

const escapes=new WeakMap();
export function trapWaypoint(map,f,target,zones,elapsed=Infinity){
  const warnings=zones.filter(z=>!z.detonated||z.kind==='poison'),danger=warnings.find(z=>Math.hypot(f.x-z.x,f.y-z.y)<z.r+18);
  if(!danger)return target;
  if(!danger.detonated&&elapsed<danger.createdAt+(f.trapReaction??0))return target;
  const cached=escapes.get(f);
  if(cached?.zone===danger&&Math.hypot(f.x-cached.point.x,f.y-cached.point.y)>5)return cached.point;
  let best=null,bestDistance=Infinity;
  for(let i=0;i<24;i++){
    const angle=i*Math.PI/12,point={x:danger.x+Math.cos(angle)*(danger.r+26),y:danger.y+Math.sin(angle)*(danger.r+26)};
    if(!terrainContains(map,point.x,point.y,12)||!terrainSegmentClear(map,f,point,8))continue;
    if(map.obstacles.some(o=>Math.hypot(point.x-o.x,point.y-o.y)<o.r+14)||warnings.some(z=>Math.hypot(point.x-z.x,point.y-z.y)<z.r+16))continue;
    const distance=Math.hypot(point.x-f.x,point.y-f.y);
    if(distance<bestDistance){best=point;bestDistance=distance}
  }
  if(best){escapes.set(f,{zone:danger,point:best});return best}
  return target;
}

// Labels sit above the hazard edge so crowds cannot hide the countdown.
export function drawTrapLabels(c,battle,project,labelSize=14){
  c.save();c.textAlign='center';c.textBaseline='middle';c.font=`800 ${labelSize}px sans-serif`;
  for(const site of battle.trapField?.sites??[]){if((battle.traps??[]).some(z=>z.x===site.x&&z.y===site.y))continue;const p=project(site.x,site.y);c.strokeStyle='#152630';c.lineWidth=4;c.fillStyle='#ffd578';c.strokeText('!',p.x,p.y);c.fillText('!',p.x,p.y)}
  for(const zone of battle.traps??[]){
    const p=project(zone.x,zone.y),edge=project(zone.x,zone.y-zone.r),type=trapType(zone);
    const short=battle.mode==='infection'?'가스':battle.mode==='race'?'감속':type.short;
    const text=zone.detonated?`${short} 발동!`:`${short} · ${Math.max(1,Math.ceil(zone.blastAt-battle.elapsed))}초`;
    const w=c.measureText(text).width+20,h=labelSize+12,y=edge.y-h/2-5;
    c.fillStyle='#152630f5';c.strokeStyle=type.color;c.lineWidth=2;
    c.beginPath();c.roundRect(p.x-w/2,y-h/2,w,h,5);c.fill();c.stroke();
    c.fillStyle=zone.detonated?type.activeColor:'#ffffff';c.fillText(text,p.x,y);
    c.strokeStyle=type.color;c.beginPath();c.moveTo(p.x,y+h/2);c.lineTo(p.x,p.y);c.stroke();
    c.fillStyle=type.color;c.beginPath();c.arc(p.x,p.y,3,0,Math.PI*2);c.fill();
  }
  c.restore();
}
export function drawTrapHud(c,battle,mobile=false){
  if(!battle.trapField)return;
  const zones=battle.traps??[],active=zones.filter(z=>z.detonated),warning=zones.filter(z=>!z.detonated);
  const text=battle.state==='finished'?'함정 작동 종료':active.length?`함정 발동 중 · ${active.length}곳`:warning.length?`함정 경고 · ${Math.max(1,Math.ceil(Math.min(...warning.map(z=>z.blastAt))-battle.elapsed))}초 뒤 발동`:battle.mode==='race'?'감속 함정 · 2초 예고':battle.mode==='infection'?'가스 함정 · 2초 예고':battle.mode==='royale'?'폭발 · 충격파 · 2초 예고':'폭발 · 독 장판 · 충격파';
  c.save();c.font=`bold ${mobile?18:13}px sans-serif`;c.textAlign='right';c.textBaseline='middle';const w=c.measureText(text).width+28,x=mobile?14:754-w,y=mobile?430:58;
  c.fillStyle='#152630ee';c.strokeStyle=active.length?'#fff1b3':'#ffb94e';c.lineWidth=2;c.beginPath();c.roundRect(x,y,w,30,6);c.fill();c.stroke();c.fillStyle='#fff7dd';c.fillText(text,x+w-13,y+15);c.restore();
}
export function drawFlatTraps(c,battle,project){
  c.save();
  for(const site of battle.trapField?.sites??[]){const p=project(site.x,site.y),rx=Math.abs(project(site.x+site.r,site.y).x-p.x),ry=Math.abs(project(site.x,site.y+site.r).y-p.y);c.fillStyle='#26323d';c.strokeStyle='#f7c675';c.lineWidth=3;c.setLineDash([5,5]);c.beginPath();c.ellipse(p.x,p.y,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([])}
  for(const zone of battle.traps??[]){
    const p=project(zone.x,zone.y),rx=Math.abs(project(zone.x+zone.r,zone.y).x-p.x),ry=Math.abs(project(zone.x,zone.y+zone.r).y-p.y);
    const type=trapType(zone),progress=zone.detonated?(zone.kind==='shockwave'?Math.min(1,(battle.elapsed-zone.blastAt)/type.duration):1):Math.max(0,Math.min(1,(battle.elapsed-zone.createdAt)/TRAP_WARNING));
    c.fillStyle='#192731cc';c.beginPath();c.ellipse(p.x,p.y,rx*1.07,ry*1.07,0,0,Math.PI*2);c.fill();
    c.fillStyle=type.color+(zone.detonated?'aa':'77');c.strokeStyle=zone.detonated?type.activeColor:type.color;c.lineWidth=4;
    c.beginPath();c.ellipse(p.x,p.y,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();
    c.lineWidth=3;c.beginPath();c.ellipse(p.x,p.y,rx*.75,ry*.75,0,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);c.stroke();
    if(zone.detonated){c.strokeStyle=type.activeColor;for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(p.x+Math.cos(a)*rx*.4,p.y+Math.sin(a)*ry*.4);c.lineTo(p.x+Math.cos(a)*rx*.8,p.y+Math.sin(a)*ry*.8);c.stroke()}}
  }
  c.restore();
}
