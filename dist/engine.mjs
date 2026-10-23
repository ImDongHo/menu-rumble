import {terrainContains,constrainTerrain,terrainWaypoint} from './terrain.mjs';
export const COLORS = ['#ec6259','#ed9c3e','#ee79a3','#479cdd','#a67b54','#e1bd39','#a884d3','#60aa59','#39b6a2','#ca799b','#7298b3','#b0ba4d','#c17a49','#7e8ed0','#be9992','#8fa26b'];
export const MAX_FIGHTERS = 160;
export const WEAPONS = {none:{name:'맨손',multiplier:1},sword:{name:'짧은 검',multiplier:1.1}};
export const MAPS = [
  {id:'forest',name:'숲속 유적',english:'FOREST RUINS',subtitle:'초록빛 숲속, 첫 번째 한판',ground:'#47965b',dark:'#2e6440',light:'#78b667',floor:'#94ce65',tile:'#a0d675',edge:'#536e43',accent:'#d8e7a1',obstacles:[{x:240,y:170,r:17},{x:528,y:170,r:17},{x:240,y:334,r:17},{x:528,y:334,r:17}]},
  {id:'sand',name:'모래 경기장',english:'SANDSTONE ARENA',subtitle:'뜨거운 모래 위의 승부',ground:'#dba759',dark:'#a97c47',light:'#eacb81',floor:'#e8cb8a',tile:'#f0d698',edge:'#aa8856',accent:'#ffedbb',obstacles:[{x:270,y:180,r:17},{x:498,y:180,r:17},{x:270,y:324,r:17},{x:498,y:324,r:17}]},
  {id:'moon',name:'달빛 정원',english:'MOONLIT GARDEN',subtitle:'달빛이 비추는 마지막 승부',ground:'#355a71',dark:'#293d5a',light:'#4f7d89',floor:'#88a8b1',tile:'#9ab8c0',edge:'#526d83',accent:'#d2c9e9',obstacles:[{x:240,y:190,r:17},{x:528,y:190,r:17},{x:240,y:314,r:17},{x:528,y:314,r:17}]},
  {id:'ice',name:'얼음 호수',english:'FROZEN CROSSING',subtitle:'두 빙판을 잇는 좁은 다리',ground:'#3a7693',dark:'#28617e',light:'#76b9cb',floor:'#caeef1',tile:'#aedfe7',edge:'#689fae',accent:'#f0ffff',backdrop:'#6d9ba9',terrain:[[76,90],[320,90],[320,210],[448,210],[448,90],[692,90],[692,414],[448,414],[448,294],[320,294],[320,414],[76,414]],obstacles:[{x:204,y:178,r:22},{x:564,y:326,r:22}]},
  {id:'lava',name:'용암 분화구',english:'EMBER CALDERA',subtitle:'중앙 바위를 둘러싼 순환 지형',ground:'#b6472e',dark:'#622a28',light:'#ed9b4d',floor:'#645259',tile:'#786369',edge:'#423c49',accent:'#ffd47a',backdrop:'#442f39',terrain:[[76,150],[154,90],[614,90],[692,150],[692,354],[614,414],[154,414],[76,354]],obstacles:[{x:384,y:252,r:43},{x:202,y:174,r:20},{x:566,y:330,r:20}]},
  {id:'ship',name:'해적선 갑판',english:'CORSAIR DECK',subtitle:'화물 사이로 이어지는 좁은 갑판',ground:'#347a91',dark:'#23516c',light:'#65adba',floor:'#bb8a54',tile:'#cc9d66',edge:'#654b3b',accent:'#f3dfad',backdrop:'#4c8b9e',terrain:[[76,160],[180,90],[588,90],[692,160],[692,350],[588,414],[180,414],[76,350]],obstacles:[{x:244,y:178,r:23},{x:524,y:178,r:23},{x:244,y:326,r:23},{x:524,y:326,r:23}]}
];

export function seededRandom(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function shuffle(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function normalizeNames(text) {
  return text.split(/[,，\n]/u).map(x => x.trim()).filter(Boolean);
}
export function parseMenuInput(text) {
  return normalizeNames(text).map(part => {
    const pieces = part.split('*');
    const name = pieces[0].trim();
    const count = pieces.length === 1 ? 5 : Number(pieces[1]);
    if (!name || [...name].length > 12) throw new RangeError('메뉴 이름은 1–12글자로 넣어주세요.');
    if (pieces.length > 2 || !Number.isInteger(count) || count < 1 || count > 40) throw new RangeError('출전 수는 메뉴마다 1–40마리로 정해주세요.');
    return {name, count};
  });
}

export class Battle {
  constructor(entries, mapId = 'forest', seed = Date.now()) {
    if (entries.length < 2 || entries.length > 16) throw new RangeError('참가 메뉴는 2–16개입니다.');
    const menus = entries.map(item => typeof item === 'string' ? {name:item,count:5} : {...item});
    if (menus.some(m => !m.name || !Number.isInteger(m.count) || m.count < 1 || m.count > 40)) throw new RangeError('출전 수는 메뉴마다 1–40마리입니다.');
    if (menus.reduce((sum,m) => sum + m.count, 0) > MAX_FIGHTERS) throw new RangeError(`한판에는 최대 ${MAX_FIGHTERS}마리가 참가할 수 있어요.`);
    this.random = seededRandom(seed);
    this.map = MAPS.find(m => m.id === mapId) || MAPS[0];
    this.elapsed = 0; this.state = 'ready'; this.events = []; this.eliminations = []; this.winner = null;
    this.teams = menus.map((m,i) => ({...m,weapon:m.weapon==='sword'?'sword':'none',id:i,color:COLORS[i]}));
    const positions = [];
    for (let y = 115; y <= 404; y += 27) for (let x = 101; x <= 668; x += 29) {
      if (terrainContains(this.map,x,y,12)&&this.map.obstacles.every(o => Math.hypot(x-o.x,y-o.y) > o.r+14)) positions.push({x,y});
    }
    if(positions.length<menus.reduce((sum,m)=>sum+m.count,0))throw new RangeError('경기장에 출전할 공간이 부족합니다.');
    const spots = shuffle(positions,this.random);
    this.fighters = [];
    for (const team of this.teams) for (let member = 0; member < team.count; member++) {
      const id = this.fighters.length, spot = spots[id];
      this.fighters.push({id,teamId:team.id,member,name:team.name,color:team.color,weapon:team.weapon,...spot,hp:100,vx:0,vy:0,face:this.random()>.5?1:-1,angle:0,cooldown:.15+this.random()*.65,retarget:0,target:null,step:this.random()*6.28,swing:0,flash:0,stun:0,invulnerable:0,dash:0,dashCooldown:1+this.random()*3,skillCooldown:.4+this.random()*4,kills:0,dead:false,deadTime:0});
    }
  }
  get alive() { return this.fighters.filter(f => !f.dead); }
  get ring() { return this.elapsed > 24 ? Math.max(28,340-(this.elapsed-24)*8) : null; }
  get aliveTeams() { return [...new Set(this.alive.map(f => f.teamId))]; }
  start() { if (this.state === 'ready') this.state = 'running'; }
  drainEvents() { const events = this.events; this.events = []; return events; }
  eliminate(f,killer = null) {
    if (f.dead || this.alive.length <= 1) return;
    f.hp = 0; f.dead = true; f.deadTime = this.elapsed;
    this.eliminations.push(f.id);
    if (killer) { killer.kills++; killer.hp = Math.min(100,killer.hp+12); }
    this.events.push({type:'eliminate',fighter:f,killer,x:f.x,y:f.y});
  }
  hit(attacker,target,damage,crit = false,area = false) {
    if (target.dead || target.teamId === attacker.teamId || target.invulnerable > 0) return;
    // Brief invulnerability stops a surrounding crowd from landing every hit at once.
    // Equal dodge and area-skill chances let a lone survivor occasionally turn a battle.
    if (this.random() < .24) {
      target.invulnerable = .2;
      this.events.push({type:'dodge',fighter:target,x:target.x,y:target.y-18});
      return;
    }
    damage = damage*(WEAPONS[attacker.weapon]?.multiplier??1);
    target.hp = Math.max(0,target.hp-damage); target.flash = .12; target.stun = .09; target.invulnerable = .34;
    const dx = target.x-attacker.x,dy = target.y-attacker.y,d = Math.hypot(dx,dy)||1;
    target.vx += dx/d*(crit?145:80); target.vy += dy/d*(crit?145:80);
    this.events.push({type:'hit',fighter:attacker,target,damage:Math.round(damage),crit,area,x:target.x,y:target.y-25});
    if (target.hp <= 0) this.eliminate(target,attacker);
  }
  step(dt) {
    if (this.state !== 'running') return;
    dt = Math.min(Math.max(dt,0),.05); this.elapsed += dt;
    const alive = this.alive;
    for (const f of shuffle(alive,this.random)) {
      if (f.dead) continue;
      for (const key of ['cooldown','retarget','dashCooldown','skillCooldown']) f[key] -= dt;
      for (const key of ['stun','flash','swing','dash','invulnerable']) f[key] = Math.max(0,f[key]-dt);
      if (!f.target || f.target.dead || f.retarget <= 0) {
        let nearest = Infinity; f.target = null;
        for (const other of alive) if (!other.dead && other.teamId !== f.teamId) {
          const distance = Math.hypot(f.x-other.x,f.y-other.y);
          if (distance < nearest) { nearest = distance; f.target = other; }
        }
        f.retarget = .3+this.random()*.5;
      }
      const target = f.target;
      if (!target) continue;
      const dx = target.x-f.x,dy = target.y-f.y,d = Math.hypot(dx,dy)||1;
      f.angle = Math.atan2(dy,dx); if (Math.abs(dx) > 2) f.face = dx > 0 ? 1 : -1;
      let speed = d > 25 ? 43 : 6;
      if (f.dashCooldown <= 0 && d > 60) { f.dash = .18; f.dashCooldown = 1.5+this.random()*3; this.events.push({type:'dash',fighter:f,x:f.x,y:f.y}); }
      if (f.dash > 0) speed = 155;
      if (f.stun > 0) speed = 0;
      const waypoint=terrainWaypoint(this.map,f,target),wx=waypoint.x-f.x,wy=waypoint.y-f.y,wd=Math.hypot(wx,wy)||1;
      let mx = wx/wd*speed,my = wy/wd*speed,nearbyEnemies = 0;
      for (const other of alive) {
        if (other === f || other.dead) continue;
        const ox = f.x-other.x,oy = f.y-other.y,od = Math.hypot(ox,oy);
        if (other.teamId !== f.teamId && od < 65) nearbyEnemies++;
        if (od < 16 && od > 0) { mx += ox/od*(16-od)*4; my += oy/od*(16-od)*4; }
      }
      for (const o of this.map.obstacles) {
        const ox = f.x-o.x,oy = f.y-o.y,od = Math.hypot(ox,oy)||1;
        if (od < o.r+25) { const push = (o.r+25-od)*2.6; mx += ox/od*push-oy/od*14; my += oy/od*push+ox/od*14; }
      }
      const previous={x:f.x,y:f.y};
      f.x += (mx+f.vx)*dt; f.y += (my+f.vy)*dt;
      f.vx *= Math.exp(-10*dt); f.vy *= Math.exp(-10*dt);
      f.x = Math.max(91,Math.min(677,f.x)); f.y = Math.max(106,Math.min(410,f.y));
      for (const o of this.map.obstacles) {
        const ox = f.x-o.x,oy = f.y-o.y,od = Math.hypot(ox,oy)||.01;
        if (od < o.r+8) { f.x = o.x+ox/od*(o.r+8); f.y = o.y+oy/od*(o.r+8); }
      }
      constrainTerrain(this.map,f,previous);
      // Crowding charges the same counterattack for every character. A surrounded
      // survivor can strike several enemies instead of being locked in a damage pile.
      f.skillCooldown -= dt*Math.max(0,nearbyEnemies-2)*.7;
      f.step += dt*(speed > 15 ? 13 : 3);
      if (f.stun <= 0 && f.skillCooldown <= 0 && d < 49) {
        f.skillCooldown = 3.5+this.random()*3; f.swing = .24;
        const burst = this.random() < .13;
        if (burst) { f.invulnerable = .9; this.events.push({type:'comeback',fighter:f,x:f.x,y:f.y-10}); }
        this.events.push({type:'skill',fighter:f,x:f.x,y:f.y-10});
        for (const other of alive) if (!other.dead && other.teamId !== f.teamId && Math.hypot(f.x-other.x,f.y-other.y) < (burst?84:55)) this.hit(f,other,Math.round((28+this.random()*24)*(burst?2.7:1)),true,true);
      } else if (!target.dead && d < 33 && f.cooldown <= 0 && f.stun <= 0) {
        f.cooldown = .3+this.random()*.5; f.swing = .18;
        const crit = this.random() < .19;
        this.hit(f,target,Math.round((8+this.random()*12)*(crit?2.3:1)),crit);
      }
      if (this.ring !== null && Math.hypot(f.x-384,(f.y-252)*1.65) > this.ring) {
        f.hp = Math.max(0,f.hp-dt*16);
        if (f.hp <= 0) this.eliminate(f);
      }
    }
    // Finish from live battle state only. No winner is chosen before the fight.
    const survivingTeams = this.aliveTeams;
    if (survivingTeams.length === 1) {
      this.winner = this.alive.reduce((best,f) => f.hp > best.hp ? f : best);
      this.state = 'finished';
      this.events.push({type:'win',fighter:this.winner,x:this.winner.x,y:this.winner.y});
    }
  }
}
