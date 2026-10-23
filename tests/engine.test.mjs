import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,MAPS,parseMenuInput,normalizeNames,seededRandom,shuffle} from '../dist/engine.mjs';

function simulate(entries,map='forest',seed=1,verifyEvents=false) {
  const b=new Battle(entries,map,seed);
  assert.equal(b.winner,null);
  b.start();
  for(let frame=0;frame<6000&&b.state==='running';frame++) {
    b.step(1/60);
    for(const e of b.drainEvents()) if(verifyEvents&&e.type==='hit') assert.notEqual(e.fighter.teamId,e.target.teamId,'friendly fire');
  }
  return b;
}
test('menu quantities accept comma, newline, and explicit counts',()=>{
  assert.deepEqual(parseMenuInput(' 치킨*10, 피자*2\n초밥 '),[{name:'치킨',count:10},{name:'피자',count:2},{name:'초밥',count:5}]);
  assert.deepEqual(normalizeNames('치킨，피자'),['치킨','피자']);
  for(const input of ['치킨*0','치킨*-1','치킨*2.5','치킨*41','치킨*abc','*3']) assert.throws(()=>parseMenuInput(input),RangeError);
});
test('invalid team counts, quantities and totals are rejected',()=>{
  assert.throws(()=>new Battle(['one']),RangeError);
  assert.throws(()=>new Battle(Array(17).fill('x')),RangeError);
  assert.throws(()=>new Battle([{name:'A',count:0},{name:'B',count:1}]),RangeError);
  assert.throws(()=>new Battle(Array.from({length:5},(_,i)=>({name:String(i),count:40}))),RangeError);
});
test('40-member crowd has correct teams and identical initial combat stats',()=>{
  const b=new Battle(['A','B','C','D','E','F','G','H'],'forest',5);
  assert.equal(b.fighters.length,40);
  assert.ok(b.fighters.every(f=>f.hp===100));
  for(const team of b.teams) assert.equal(b.fighters.filter(f=>f.teamId===team.id).length,5);
  assert.equal(new Set(b.fighters.map(f=>`${f.x}:${f.y}`)).size,40);
  assert.equal(b.state,'ready');
});
test('all maps support 2, 8 and 16 teams and finish with one surviving menu',()=>{
  for(const map of MAPS)for(const size of [2,8,16])for(const seed of [1,7]) {
    const b=simulate(Array.from({length:size},(_,i)=>({name:`메뉴 ${i}`,count:3})),map.id,seed,true);
    assert.equal(b.state,'finished',`${map.id}/${size}/${seed}`);
    assert.equal(b.aliveTeams.length,1);
    assert.ok(b.winner.hp>0);
    assert.ok(b.alive.every(f=>f.teamId===b.winner.teamId));
    assert.equal(new Set(b.eliminations).size,b.eliminations.length);
    for(const f of b.fighters)assert.ok(Number.isFinite(f.x)&&Number.isFinite(f.y));
  }
});
test('maximum 160 fighters finish a real battle',()=>{
  const b=simulate(Array.from({length:16},(_,i)=>({name:`메뉴 ${i}`,count:10})),'sand',27);
  assert.equal(b.fighters.length,160);
  assert.equal(b.state,'finished');
  assert.equal(b.aliveTeams.length,1);
});
test('ready and finished battles stay still',()=>{
  const b=new Battle([{name:'A',count:1},{name:'B',count:1}],'moon',12);
  const x=b.fighters[0].x;b.step(.02);assert.equal(b.fighters[0].x,x);assert.equal(b.elapsed,0);
  const finished=simulate([{name:'A',count:1},{name:'B',count:1}]);const time=finished.elapsed;finished.step(.02);assert.equal(finished.elapsed,time);
});
test('seeded shuffle preserves input',()=>{
  const input=[0,1,2,3];assert.deepEqual(shuffle(input,seededRandom(12)).sort(),input);assert.deepEqual(input,[0,1,2,3]);
});
test('a two-member team can actually beat ten without a preselected result',()=>{
  const b=simulate([{name:'치킨',count:10},{name:'피자',count:2}],'forest',101,true);
  assert.equal(b.state,'finished');
  assert.equal(b.winner.name,'피자');
  assert.ok(b.alive.length<=2);
});
