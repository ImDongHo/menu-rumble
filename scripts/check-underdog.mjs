import {Battle} from '../dist/engine.mjs';
let minorityWins=0,unfinished=0,example=null;
for(let seed=1;seed<=200;seed++) {
  const b=new Battle([{name:'치킨',count:10},{name:'피자',count:2}],'forest',seed);b.start();
  for(let frame=0;frame<6000&&b.state==='running';frame++){b.step(1/60);b.drainEvents()}
  if(b.state!=='finished')unfinished++;
  if(b.winner?.teamId===1){minorityWins++;example??={seed,seconds:Math.round(b.elapsed),survivors:b.alive.length}}
}
console.log(JSON.stringify({scenario:'10 vs 2',rounds:200,minorityWins,unfinished,example}));
