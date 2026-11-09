import {terrainContains,terrainSegmentClear,terrainWaypoint} from './terrain.mjs';
import {ACORN} from './ranged-combat.mjs';
import {mapBounds,courseGeometry} from './adventure-maps.mjs';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function prepareAdventure(b){
 b.centerGoal={x:384,y:252};b.pickups=[];b.conversions=0;
 if(b.mode==='race'){
  const geometry=courseGeometry(b.map);b.course=geometry.segments;b.courseLength=geometry.length;
  const lanes=b.fighters.map((_,i)=>b.fighters.length===1?0:(i/(b.fighters.length-1)-.5)*110);
  for(let i=lanes.length-1;i>0;i--){const j=Math.floor(b.random()*(i+1));[lanes[i],lanes[j]]=[lanes[j],lanes[i]]}
  for(const f of b.fighters){f.raceDistance=0;f.lane=lanes[f.id];f.laneGoal=f.lane;f.nextLane=2+b.random()*3;f.boost=0;f.slow=0;f.shield=0;Object.assign(f,coursePoint(b,0,f.lane));f.weapon='none'}
  for(let i=0;i<10;i++){const progress=(i+.6)/10*b.courseLength,kind=['boost','shield','slip'][Math.floor(b.random()*3)],p=coursePoint(b,progress,(b.random()-.5)*80);b.pickups.push({...p,kind,progress,respawnAt:0,id:i})}
 }else if(b.mode==='royale'){
  b.projectiles=[];b.projectileSerial=0;for(const f of b.fighters)Object.assign(f,{acornAmmo:0,acornCooldown:0,acornKick:0,nextBackstep:0,backstepUntil:0});
  const bounds=mapBounds(b.map),rotation=b.random()*Math.PI*2,available=[];
  for(let y=bounds.y+24;y<bounds.y+bounds.h-24;y+=27)for(let x=bounds.x+24;x<bounds.x+bounds.w-24;x+=29)if(terrainContains(b.map,x,y,14)&&b.map.obstacles.every(o=>Math.hypot(x-o.x,y-o.y)>o.r+14))available.push({x,y});
  for(const team of b.teams){const angle=rotation+team.id/b.teams.length*Math.PI*2,anchor={x:384+Math.cos(angle)*450,y:252+Math.sin(angle)*240};
   for(const f of b.fighters.filter(f=>f.teamId===team.id)){let closest=0;for(let i=1;i<available.length;i++)if(distance(anchor,available[i])<distance(anchor,available[closest]))closest=i;Object.assign(f,available.splice(closest,1)[0])}
  }
  for(let i=0;i<12;i++){let p;for(let tries=0;tries<200;tries++){p={x:bounds.x+50+b.random()*(bounds.w-100),y:bounds.y+50+b.random()*(bounds.h-100)};if(terrainContains(b.map,p.x,p.y,18)&&b.map.obstacles.every(o=>distance(o,p)>o.r+20))break;p=null}if(p)b.pickups.push({...p,id:i,kind:i%3===0?'acorn':['heal','boost','shield'][Math.floor(b.random()*3)],respawnAt:0})}
 }
}

export function coursePoint(b,progress,lane=0){
 progress=Math.max(0,Math.min(b.courseLength,progress));let lo=0,hi=b.course.length-1;
 while(lo<hi){const mid=(lo+hi)>>1,s=b.course[mid];if(progress>s.start+s.length)lo=mid+1;else hi=mid}
 const s=b.course[lo],t=Math.min(1,(progress-s.start)/s.length),dx=s.ax+(s.bx-s.ax)*t,dy=s.ay+(s.by-s.ay)*t,norm=Math.hypot(dx,dy)||1;
 const x=s.x+(s.tx-s.x)*t,y=s.y+(s.ty-s.y)*t,point=amount=>({x:x-dy/norm*lane*amount,y:y+dx/norm*lane*amount});
 const desired=point(1);if(terrainContains(b.map,desired.x,desired.y,10))return desired;
 let safe=0,blocked=1;for(let i=0;i<14;i++){const mid=(safe+blocked)/2,p=point(mid);if(terrainContains(b.map,p.x,p.y,10))safe=mid;else blocked=mid}
 return point(safe);
}

export function raceStandings(b){return [...b.fighters].sort((a,c)=>a===c?0:a===b.winner?-1:c===b.winner?1:a.finishTime!=null&&c.finishTime!=null?a.finishTime-c.finishTime:a.finishTime!=null?-1:c.finishTime!=null?1:c.raceDistance-a.raceDistance)}
export function finishAdventure(b,winner){b.winner=winner;b.state='finished';b.events.push({type:'win',fighter:winner,x:winner.x,y:winner.y})}
export function stepRace(b,dt){
 const previousTime=b.elapsed;b.elapsed+=dt;const wave=b.trapField?.advance(b.elapsed);
 if(wave?.warned)b.events.push({type:'trap-warning',x:384,y:252});
 const order=[...b.fighters];for(let i=order.length-1;i>0;i--){const j=Math.floor(b.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
 for(const f of order){
  f.boost=Math.max(0,f.boost-dt);f.slow=Math.max(0,f.slow-dt);f.shield=Math.max(0,f.shield-dt);
  if(b.elapsed>=f.nextLane){f.laneGoal=(b.random()-.5)*110;f.nextLane=b.elapsed+2+b.random()*3}
  const danger=b.traps.find(z=>!z.detonated&&distance(f,z)<z.r+80&&b.elapsed>=z.createdAt+(f.trapReaction??0));
  if(danger){const left=coursePoint(b,f.raceDistance,-55),right=coursePoint(b,f.raceDistance,55);f.laneGoal=distance(left,danger)>distance(right,danger)?-55:55}
  f.lane+=(f.laneGoal-f.lane)*Math.min(1,dt*1.4);
  const old=f.raceDistance,speed=80*(f.boost>0?1.45:1)*(f.slow>0?.55:1);
  f.raceDistance=Math.min(b.courseLength,old+speed*dt);const p=coursePoint(b,f.raceDistance,f.lane),ahead=coursePoint(b,Math.min(b.courseLength,f.raceDistance+5),f.lane);
  f.angle=Math.atan2(ahead.y-p.y,ahead.x-p.x);if(Math.abs(ahead.x-p.x)>.1)f.face=ahead.x>p.x?1:-1;Object.assign(f,p);f.step+=dt*13;
  for(const item of b.pickups)if(item.respawnAt<=b.elapsed&&distance(f,item)<20){
   if(item.kind==='boost')f.boost=2.5;else if(item.kind==='shield')f.shield=4;else if(f.shield>0)f.shield=0;else f.slow=1.5;
   item.respawnAt=b.elapsed+4;b.events.push({type:'pickup',fighter:f,kind:item.kind,x:f.x,y:f.y});
  }
  if(f.raceDistance>=b.courseLength&&f.finishTime==null)f.finishTime=previousTime+(b.courseLength-old)/speed;
 }
 for(let i=0;i<order.length;i++)for(let j=i+1;j<order.length;j++){
  const a=order[i],c=order[j];if(Math.abs(a.raceDistance-c.raceDistance)>18||distance(a,c)>12)continue;
  if(a.bumpUntil>b.elapsed||c.bumpUntil>b.elapsed)continue;
  const trailing=Math.abs(a.raceDistance-c.raceDistance)<1e-9?(b.random()>.5?a:c):a.raceDistance<c.raceDistance?a:c;if(trailing.shield<=0)trailing.slow=Math.max(trailing.slow,.25);
  a.bumpUntil=c.bumpUntil=b.elapsed+.8;const side=b.random()>.5?1:-1;a.laneGoal=Math.max(-55,Math.min(55,a.laneGoal+side*16));c.laneGoal=Math.max(-55,Math.min(55,c.laneGoal-side*16));
 }
 for(const zone of wave?.blasts??[])b.blast(zone);
 for(const zone of b.traps)if(zone.detonated)b.trapDamage(zone);
 const finishers=b.fighters.filter(f=>f.finishTime!=null);if(finishers.length){
  const best=Math.min(...finishers.map(f=>f.finishTime)),tied=finishers.filter(f=>Math.abs(f.finishTime-best)<1e-9),winner=tied[Math.floor(b.random()*tied.length)];b.elapsed=best;finishAdventure(b,winner);
 }
}

export function adventureWaypoint(b,f,target){
 if(b.ring!==null&&Math.hypot(f.x-384,(f.y-252)*1.65)>b.ring-24&&(b.mode!=='infection'||b.infectionRally&&distance(f,target)>80))return terrainWaypoint(b.map,f,b.centerGoal);
 if(b.mode==='royale'){
  if(f.acornAmmo>0&&distance(f,target)<95){
   if(b.elapsed>=f.nextBackstep){const d=distance(f,target)||1,p={x:f.x+(f.x-target.x)/d*34,y:f.y+(f.y-target.y)/d*34};f.nextBackstep=b.elapsed+2.5;
    if(terrainContains(b.map,p.x,p.y,12)&&terrainSegmentClear(b.map,f,p,10)&&b.map.obstacles.every(o=>distance(p,o)>o.r+12)&&(b.ring===null||Math.hypot(p.x-384,(p.y-252)*1.65)<b.ring-16)){f.backstepGoal=p;f.backstepUntil=b.elapsed+.35}
   }
   if(f.backstepGoal&&b.elapsed<f.backstepUntil)return f.backstepGoal;
  }
  if(!f.nextPlan||b.elapsed>f.nextPlan){f.nextPlan=b.elapsed+.5;f.planGoal=b.pickups.filter(p=>p.respawnAt<=b.elapsed&&distance(f,p)<190&&(p.kind!=='acorn'||!f.acornAmmo)).sort((a,c)=>distance(f,a)-distance(f,c))[0]??null}
  if(f.planGoal&&f.planGoal.respawnAt<=b.elapsed&&distance(f,target)>65)return terrainWaypoint(b.map,f,f.planGoal);
 }else if(b.mode==='infection'&&b.elapsed<28){
  if(!f.nextPlan||b.elapsed>=f.nextPlan){
   f.nextPlan=b.elapsed+.5+b.random()*.4;f.planGoal=null;const near=b.alive.filter(o=>o!==f&&distance(f,o)<110),enemies=near.filter(o=>o.teamId!==f.teamId),friends=near.length-enemies.length;
   if(enemies.length>friends+1){
    let best=-Infinity;for(let i=0;i<12;i++){const angle=i*Math.PI/6,p={x:f.x+Math.cos(angle)*75,y:f.y+Math.sin(angle)*75};if(!terrainContains(b.map,p.x,p.y,12)||!terrainSegmentClear(b.map,f,p,10)||b.map.obstacles.some(o=>distance(p,o)<o.r+12))continue;const score=Math.min(...enemies.map(o=>distance(p,o)));if(score>best){best=score;f.planGoal=p}}
   }
  }
  if(f.planGoal&&distance(f,f.planGoal)>12)return terrainWaypoint(b.map,f,f.planGoal);
 }
 return terrainWaypoint(b.map,f,target);
}
export function collectRoyaleItems(b,f){
 for(const item of b.pickups)if(item.respawnAt<=b.elapsed&&distance(f,item)<20){
  if(item.kind==='acorn'){f.acornAmmo=ACORN.ammo;f.acornCooldown=.25}else if(item.kind==='heal')f.hp=Math.min(100,f.hp+30);else if(item.kind==='boost')f.boost=3;else f.invulnerable=Math.max(f.invulnerable,2);
  item.respawnAt=b.elapsed+(item.kind==='acorn'?12:9);b.events.push({type:'pickup',kind:item.kind,fighter:f,x:f.x,y:f.y});
 }
}
export function convertFighter(b,f,attacker){
 const previousTeam=f.teamId,team=b.teams[attacker.teamId];Object.assign(f,{teamId:team.id,name:team.name,color:team.color,weapon:team.weapon,hp:100,invulnerable:1.2,stun:.35,flash:.18,target:null,retarget:0,nextPlan:0,planGoal:null});
 b.conversions++;attacker.kills++;b.events.push({type:'infect',fighter:attacker,target:f,previousTeam,toTeam:team.id,x:f.x,y:f.y});
}
