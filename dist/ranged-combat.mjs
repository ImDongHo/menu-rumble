import {terrainContains} from './terrain.mjs';
export const ACORN={ammo:6,damage:18,speed:235,range:260,fireEvery:.95,spread:.12,maxProjectiles:160};
export function circleContact(from,to,center,radius){
 const dx=to.x-from.x,dy=to.y-from.y,ox=from.x-center.x,oy=from.y-center.y,a=dx*dx+dy*dy,c=ox*ox+oy*oy-radius*radius;
 if(c<=0)return 0;if(!a)return Infinity;const b=2*(ox*dx+oy*dy),discriminant=b*b-4*a*c;if(discriminant<0)return Infinity;
 const t=(-b-Math.sqrt(discriminant))/(2*a);return t>=0&&t<=1?t:Infinity;
}
export function wallContact(map,from,to){
 let first=Infinity;for(const obstacle of map.obstacles)first=Math.min(first,circleContact(from,to,obstacle,obstacle.r+3));
 const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/2));
 for(let i=0;i<=steps;i++){const t=i/steps;if(t>=first)break;if(!terrainContains(map,from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t,2)){first=t;break}}
 return first;
}
export function fireAcorn(b,f,target){
 if(b.mode!=='royale'||f.dead||f.acornAmmo<=0||f.acornCooldown>0||f.stun>0||target.dead||target.teamId===f.teamId||b.projectiles.length>=ACORN.maxProjectiles)return false;
 const distance=Math.hypot(target.x-f.x,target.y-f.y);if(distance<40||distance>ACORN.range||wallContact(b.map,f,target)!==Infinity)return false;
 const angle=Math.atan2(target.y-f.y,target.x-f.x)+(b.random()-.5)*2*ACORN.spread,dx=Math.cos(angle),dy=Math.sin(angle);
 b.projectiles.push({id:++b.projectileSerial,owner:f,teamId:f.teamId,x:f.x+dx*16,y:f.y+dy*16,vx:dx*ACORN.speed,vy:dy*ACORN.speed,remaining:ACORN.range-16,angle});
 f.acornAmmo--;f.acornCooldown=ACORN.fireEvery;f.acornKick=.18;f.angle=Math.atan2(target.y-f.y,target.x-f.x);b.events.push({type:'acorn-shot',fighter:f,x:f.x+dx*16,y:f.y+dy*16});
 if(!f.acornAmmo)b.events.push({type:'acorn-empty',fighter:f,x:f.x,y:f.y});return true;
}
export function stepAcorns(b,dt){
 if(b.mode!=='royale')return;const remaining=[];
 for(const shot of b.projectiles){
  const travel=Math.min(shot.remaining,ACORN.speed*dt),to={x:shot.x+Math.cos(shot.angle)*travel,y:shot.y+Math.sin(shot.angle)*travel};let first=wallContact(b.map,shot,to),targets=[];
  for(const f of b.fighters){if(f.dead||f.teamId===shot.teamId)continue;const t=circleContact(shot,to,f,11);if(t<first-1e-8){first=t;targets=[f]}else if(Number.isFinite(t)&&Math.abs(t-first)<1e-8&&targets.length)targets.push(f)}
  if(Number.isFinite(first)){
   const p={x:shot.x+(to.x-shot.x)*first,y:shot.y+(to.y-shot.y)*first};
   if(targets.length){const target=targets[Math.floor(b.random()*targets.length)];b.hit(shot.owner,target,ACORN.damage,false,false,true)}
   b.events.push({type:'acorn-impact',blocked:!targets.length,...p});continue;
  }
  Object.assign(shot,to);shot.remaining-=travel;if(shot.remaining>0)remaining.push(shot);
 }
 b.projectiles=remaining;
}
