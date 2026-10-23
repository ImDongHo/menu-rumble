import {Battle,seededRandom} from './engine.mjs';

// Use fresh, independent simulated battles. This never supplies an outcome to the live game.
export function simulateOutcome(entries,mapId,seed,mode='classic') {
  const battle=new Battle(entries,mapId,seed,mode);battle.start();
  for(let step=0;step<6000&&battle.state==='running';step++) {battle.step(1/60);battle.drainEvents()}
  return battle.state==='finished'?battle.winner.teamId:null;
}
export function estimatedPercentages(wins,rounds) {
  if(!Number.isInteger(rounds)||rounds<1)return null;
  // A weak symmetric prior avoids presenting a zero count in a finite sample as impossibility.
  return wins.map(win=>(win+1)/(rounds+wins.length)*100);
}
export function* estimateBattles(entries,mapId,rounds,seed,mode='classic') {
  if(!Number.isInteger(rounds)||rounds<1||rounds>128)throw new RangeError('승률 계산은 1–128회로 제한됩니다.');
  const random=seededRandom(seed),wins=entries.map(()=>0);let completed=0,attempted=0;
  while(attempted<rounds) {
    attempted++;const winner=simulateOutcome(entries,mapId,Math.floor(random()*4294967296),mode);
    if(winner!==null){wins[winner]++;completed++}
    if(attempted%8===0||attempted===rounds)yield {wins:[...wins],rounds:completed,attempted,percentages:estimatedPercentages(wins,completed),done:attempted===rounds};
  }
}
