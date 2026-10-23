import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,MAPS,MODES,seededRandom} from '../dist/engine.mjs';
import {terrainContains} from '../dist/terrain.mjs';
import {estimateBattles,simulateOutcome} from '../dist/odds.mjs';

test('three selectable modes include one random captain per team with standard combat stats',()=>{
  assert.deepEqual(Object.keys(MODES),['classic','captain','traps']);
  const entries=[{name:'A',count:5},{name:'B',count:8}],a=new Battle(entries,'forest',13,'captain'),b=new Battle(entries,'forest',13,'captain');
  assert.deepEqual(a.fighters,b.fighters);assert.equal(a.trapField,null);assert.equal(a.winner,null);
  for(const team of a.teams)assert.equal(a.fighters.filter(f=>f.teamId===team.id&&f.isCaptain).length,1);
  assert.ok(a.fighters.every(f=>f.hp===100));
  for(const mode of['classic','traps'])assert.ok(new Battle(entries,'forest',13,mode).fighters.every(f=>!f.isCaptain));
  const members=new Set();for(let seed=1;seed<=24;seed++)members.add(new Battle(entries,'forest',seed,'captain').fighters.find(f=>f.teamId===0&&f.isCaptain).member);
  assert.ok(members.size>1,'the first roster member must not always be captain');
});

test('a captain defeat eliminates its entire team and awards only the direct kill',()=>{
  const b=new Battle([{name:'A',count:3},{name:'B',count:4}],'forest',13,'captain');
  const attacker=b.fighters.find(f=>f.teamId===0),leader=b.fighters.find(f=>f.teamId===1&&f.isCaptain);attacker.hp=50;
  b.eliminate(leader,attacker);assert.equal(b.alive.filter(f=>f.teamId===1).length,0);assert.equal(b.alive.length,3);
  assert.equal(attacker.kills,1);assert.equal(attacker.hp,62);assert.equal(b.drainEvents().filter(e=>e.type==='captain-out').length,1);
  b.start();b.step(0);assert.equal(b.state,'finished');assert.equal(b.winner.teamId,0);assert.equal(b.winner.isCaptain,true);
});

test('followers can fall independently and the final surviving captain remains a valid winner',()=>{
  const b=new Battle([{name:'A',count:3},{name:'B',count:3}],'forest',13,'captain'),follower=b.fighters.find(f=>f.teamId===0&&!f.isCaptain);
  b.eliminate(follower);assert.equal(b.alive.filter(f=>f.teamId===0).length,2);assert.equal(b.drainEvents().filter(e=>e.type==='captain-out').length,0);
  b.eliminate(b.fighters.find(f=>f.teamId===1&&f.isCaptain));
  const captain=b.alive.find(f=>f.isCaptain);captain.hp=0;b.eliminate(captain);b.start();b.step(0);
  assert.equal(b.state,'finished');assert.equal(b.winner,captain);assert.ok(captain.hp>0);
});

test('captain battles support 160 fighters on every map and different seeds can change the winner',()=>{
  const winners=new Set();
  for(const map of MAPS)for(const seed of[13,97]){
    const b=new Battle(Array.from({length:16},(_,i)=>({name:'메뉴'+i,count:10})),map.id,seed,'captain');b.start();
    for(let i=0;i<6000&&b.state==='running';i++){
      b.step(1/60);b.drainEvents();for(const f of b.fighters)assert.ok(terrainContains(map,f.x,f.y,7.99),map.id);
    }
    assert.equal(b.state,'finished',map.id);assert.equal(b.aliveTeams.length,1);assert.ok(b.winner.isCaptain&&b.winner.hp>0);winners.add(b.winner.teamId);
    for(const team of b.teams)if(team.id!==b.winner.teamId)assert.ok(b.fighters.filter(f=>f.teamId===team.id).every(f=>f.dead));
  }
  assert.ok(winners.size>1);
});

test('captain odds simulate captain rules without selecting a live winner',()=>{
  const entries=[{name:'A',count:3},{name:'B',count:3}],live=new Battle(entries,'forest',13,'captain');
  const results=[...estimateBattles(entries,'forest',8,79,'captain')].at(-1),random=seededRandom(79),wins=[0,0];
  for(let i=0;i<8;i++)wins[simulateOutcome(entries,'forest',Math.floor(random()*4294967296),'captain')]++;
  assert.deepEqual(results.wins,wins);assert.equal(results.rounds,8);assert.equal(live.winner,null);assert.equal(live.state,'ready');
});
