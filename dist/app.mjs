import{Battle,COLORS,MAPS,MODES,parseMenuInput,MAX_FIGHTERS}from'./engine.mjs';
import{Renderer,drawAvatar}from'./renderer-3d.mjs?v=soft-beans-2';
import{validatePresetEntries,entriesFromText,makeCustomPreset,readCustomPresets}from'./custom-presets.mjs';
const $=id=>document.getElementById(id);
const presets={lunch:['치킨','피자','떡볶이','초밥','삼겹살','햄버거','파스타','국밥'],night:['치킨','족발','보쌈','떡볶이','피자','곱창','라면','닭발'],cafe:['아메리카노','카페라떼','말차라떼','밀크티','초코라떼','딸기라떼','레몬에이드','바닐라라떼']};
const pool=['치킨','피자','떡볶이','초밥','삼겹살','햄버거','파스타','국밥','쌀국수','돈까스','김치찌개','제육볶음','샐러드','우동','짜장면','카레','비빔밥','냉면','순두부찌개','마라탕','김밥','보쌈','타코','덮밥'];
function readSaved(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
let names=readSaved('mr-menus',presets.lunch);if(!Array.isArray(names)||names.length<2||names.length>16||names.some(n=>typeof n!=='string'||!n.trim()||[...n].length>12))names=[...presets.lunch];
let counts=readSaved('mr-counts',{});if(!counts||typeof counts!=='object'||Array.isArray(counts))counts={};
counts=Object.fromEntries(names.map(name=>[name,Number.isInteger(counts[name])&&counts[name]>=1&&counts[name]<=40?counts[name]:5]));
if(names.reduce((sum,name)=>sum+counts[name],0)>MAX_FIGHTERS)counts=Object.fromEntries(names.map(name=>[name,5]));
let weapons=readSaved('mr-weapons',{});if(!weapons||typeof weapons!=='object')weapons={};weapons=Object.fromEntries(names.map(name=>[name,weapons[name]==='sword'?'sword':'none']));
let customPresets=readCustomPresets(readSaved('mr-custom-presets',[])),activePreset=readSaved('mr-active-preset','lunch');
function entries(){return names.map(name=>({name,count:counts[name]??5,weapon:weapons[name]==='sword'?'sword':'none'}))}
function totalCount(){return entries().reduce((sum,item)=>sum+item.count,0)}
let mapId=readSaved('mr-map','forest');if(!MAPS.some(m=>m.id===mapId))mapId='forest';
let modeId='classic';
let history=readSaved('mr-history',[]);if(!Array.isArray(history))history=[];
history=history.filter(x=>x&&typeof x.name==='string'&&typeof x.map==='string'&&typeof x.date==='number').slice(0,20);
let sound=readSaved('mr-sound',false)===true,battle,round=1,speed=1,paused=false,countdownTime=0,lastTime=0,accumulator=0,uiTime=0,resultTimer=0,toastTimer,feedIndex=0,audio;
const renderer=new Renderer($('arena'));renderer.effects=!matchMedia('(prefers-reduced-motion: reduce)').matches;
let oddsWorker=null,oddsKey='',oddsResult=null,oddsError=false,oddsTimer=0,queuedStart=false;
const oddsCache=new Map();
let frameId=0,disposed=false;
let drawTime=0;const mobileQuery=matchMedia('(max-width: 820px)');function updateDeviceMode(){renderer.mobile=mobileQuery.matches;renderer.lowPower=mobileQuery.matches||matchMedia('(prefers-reduced-motion: reduce)').matches}updateDeviceMode();mobileQuery.addEventListener('change',updateDeviceMode);
function seed(){return crypto.getRandomValues(new Uint32Array(1))[0]}
function element(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2600)}
function tone(frequency=500,duration=.06,type='triangle',volume=.035){if(!sound||disposed||document.hidden)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),gain=audio.createGain();o.type=type;o.frequency.setValueAtTime(frequency,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(50,frequency*.55),audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(gain);gain.connect(audio.destination);o.onended=()=>{o.disconnect();gain.disconnect()};o.start();o.stop(audio.currentTime+duration)}catch{}}
function syncSound(){$('sound-btn').setAttribute('aria-pressed',String(sound));$('sound-btn').setAttribute('aria-label',sound?'효과음 끄기':'효과음 켜기')}
function busy(){return battle.state==='running'||battle.state==='countdown'}
function lockSetup(locked){$('ready-start-btn').disabled=locked||names.length<2;$('ready-start-btn').querySelector('b').textContent=queuedStart?'승률 계산 중…':locked?'전투 중':'시작하기';$('arena-start-btn').disabled=locked||names.length<2;$('arena-start-btn').textContent=queuedStart?'계산 중…':locked?'전투 중':battle.state==='finished'?'다음 판 준비':'시작';for(const el of document.querySelectorAll('.remove-menu,.weapon-toggle,.count-stepper button,.count-stepper input,.presets button,.map-card,[data-mode],#menu-input,#add-btn,#random-btn'))el.disabled=locked;$('start-btn').disabled=locked||names.length<2;$('start-btn').querySelector('span').textContent=queuedStart?'승률 계산 중…':locked?'대결 진행 중…':battle.state==='finished'?'다음 판 준비하기':'난투전 시작하기';$('mobile-start-btn').disabled=locked||names.length<2;$('mobile-start-btn').querySelector('span').textContent=queuedStart?'승률 계산 중…':locked?'자동 전투 중…':battle.state==='finished'?'다음 판 준비':'난투전 시작'}
function updateOddsUI(){
 const results=oddsResult?.percentages;
 for(let i=0;i<names.length;i++){const value=results?`${Math.round(results[i])}%`:'…';const label=$(`odds-${i}`);if(label){label.textContent=results?`추정 ${value}`:oddsError?'계산 불가':'승률 계산 중';label.title=oddsResult?`가상 전투 ${oddsResult.rounds}회로 추정한 값입니다. 실제 승률과 다를 수 있습니다.`:'가상 전투를 계산하고 있습니다.'}const chip=$(`team-${i}`)?.querySelector('.chip-odds');if(chip)chip.textContent=results?value:'…'}
 $('odds-note').textContent=oddsError?'승률 계산을 사용할 수 없어요. 실제 전투는 가능합니다.':oddsResult?`${busy()?'시작 시 추정':'가상 전투'} · ${oddsResult.rounds}회 기준 · 실제 결과와 다를 수 있어요`:'출전 수·무기·맵·모드를 반영해 가상 전투 계산 중';
}
function stopOdds(){clearTimeout(oddsTimer);oddsWorker?.terminate();oddsWorker=null}
function requestOdds(){
 if(disposed||document.hidden)return;
 const key=JSON.stringify([entries(),mapId,modeId]);
 if(key===oddsKey&&(oddsWorker||oddsResult?.done||oddsError)){updateOddsUI();return}
 stopOdds();oddsKey=key;oddsError=false;oddsResult=oddsCache.get(key)||null;updateOddsUI();if(oddsResult?.done)return;
 oddsTimer=setTimeout(()=>{try{
   oddsWorker=new Worker(new URL('./odds-worker.mjs',import.meta.url),{type:'module'});
   oddsWorker.onmessage=({data})=>{if(data.key!==oddsKey)return;if(data.error){failOdds();return}oddsResult=data;oddsCache.set(oddsKey,data);if(oddsCache.size>12)oddsCache.delete(oddsCache.keys().next().value);updateOddsUI();if(data.done){oddsWorker.terminate();oddsWorker=null}if(queuedStart&&data.rounds>=8){queuedStart=false;start()}};
   oddsWorker.onerror=()=>failOdds();oddsWorker.postMessage({entries:entries(),mapId,mode:modeId,seed:seed(),rounds:totalCount()>80?(renderer.mobile?24:48):(renderer.mobile?64:128),key});
 }catch{failOdds()}},450);
}
function failOdds(){stopOdds();oddsError=true;updateOddsUI();if(queuedStart){queuedStart=false;start()}}
function changeCount(name,value){if(busy())return;const next=Number(value);if(!Number.isInteger(next)||next<1||next>40){toast('메뉴마다 1–40마리로 정해주세요.');return false}if(totalCount()-(counts[name]??5)+next>MAX_FIGHTERS){toast(`한판에는 최대 ${MAX_FIGHTERS}마리까지 참가할 수 있어요.`);return false}counts[name]=next;save('mr-counts',counts);newBattle();return true}
function buildMenus(){
 $('menu-list').replaceChildren();$('roster').replaceChildren();$('menu-count').textContent=names.length;$('total-fighters').textContent=`총 ${totalCount()}마리 출전`;
 names.forEach((name,i)=>{
  const row=element('div','menu-row'),avatar=element('canvas');avatar.setAttribute('aria-hidden','true');avatar.style.setProperty('--avatar-bg',COLORS[i]+'18');drawAvatar(avatar,COLORS[i],i);row.append(avatar,element('span','menu-name',name));
  const stepper=element('div','count-stepper'),minus=element('button','','−'),input=element('input'),plus=element('button','','+');minus.type=plus.type='button';minus.setAttribute('aria-label',`${name} 출전 수 줄이기`);plus.setAttribute('aria-label',`${name} 출전 수 늘리기`);input.type='number';input.inputMode='numeric';input.min=1;input.max=40;input.step=1;input.value=counts[name]??5;input.setAttribute('aria-label',`${name} 출전 수`);minus.addEventListener('click',()=>changeCount(name,(counts[name]??5)-1));plus.addEventListener('click',()=>changeCount(name,(counts[name]??5)+1));input.addEventListener('change',()=>{if(!changeCount(name,input.value))input.value=counts[name]??5});stepper.append(minus,input,plus);row.append(stepper);
  const remove=element('button','remove-menu','×');remove.type='button';remove.setAttribute('aria-label',`${name} 삭제`);remove.addEventListener('click',()=>{if(busy())return;if(names.length<=2){toast('최소 2개의 메뉴가 있어야 한판 할 수 있어요.');return}names.splice(i,1);save('mr-menus',names);newBattle()});row.append(remove);
  const meta=element('div','menu-equipment'),weapon=element('button','weapon-toggle'),odds=element('span','menu-odds');odds.id=`odds-${i}`;const armed=weapons[name]==='sword';weapon.type='button';weapon.setAttribute('aria-label',`${name} 무기 ${armed?'짧은 검':'맨손'} 바꾸기`);weapon.setAttribute('aria-pressed',String(armed));weapon.textContent=armed?'⚔ 짧은 검 · 공격 +10%':'맨손 · 무기 선택';weapon.title='짧은 검은 공격력 10%를 높입니다. 승률 증가폭은 전투 조건에 따라 달라집니다.';weapon.addEventListener('click',()=>{if(busy())return;Object.defineProperty(weapons,name,{value:weapons[name]==='sword'?'none':'sword',enumerable:true,writable:true,configurable:true});save('mr-weapons',weapons);newBattle();tone(540,.06)});meta.append(weapon,odds);row.append(meta);$('menu-list').append(row);
  const chip=element('span','roster-chip');chip.id=`team-${i}`;chip.style.setProperty('--fighter-color',COLORS[i]);if(battle.mode==='captain'){const crown=element('span','captain-status','♛');crown.title='대장이 쓰러지면 팀 전체 탈락';chip.append(crown)}chip.append(element('span','roster-dot'),element('span','roster-name',name),element('span','legend-count',String(counts[name]??5)),element('em','chip-odds','…'));$('roster').append(chip);
 });
}
function newBattle(){syncMode();queuedStart=false;battle=new Battle(entries(),mapId,seed(),modeId);paused=false;countdownTime=0;resultTimer=0;accumulator=0;renderer.particles=[];renderer.numbers=[];$('result-layer').hidden=true;$('ready-banner').hidden=false;$('countdown').hidden=true;$('paused-banner').hidden=true;$('pause-btn').disabled=true;$('pause-symbol').textContent='Ⅱ';$('pause-btn').setAttribute('aria-label','대결 일시정지');$('arena-timer').textContent='00:00';$('round-label').textContent=`ROUND ${String(round).padStart(2,'0')}`;$('status-text').textContent='대기 중';$('alive-text').textContent=`${names.length}팀 · ${totalCount()}마리`;$('arena-caption').textContent='작은 친구들, 큰 메뉴 결정.';$('arena-map-name').textContent=battle.map.name;$('feed-text').textContent=modeId==='traps'?'색으로 표시된 함정이 2초 뒤 작동해요. 폭발·독 장판·충격파를 피해 살아남으세요.':modeId==='captain'?'왕관을 쓴 대장을 지켜주세요. 대장이 쓰러지면 그 메뉴 팀이 모두 탈락해요.':'수가 적어도 끝까지 모릅니다. 회피·치명타·범위 공격으로 역전 한판!';buildMenus();refreshPresetSelection();lockSetup(false);requestOdds()}
function syncMode(){
 for(const button of document.querySelectorAll('[data-mode]'))button.setAttribute('aria-pressed',String(button.dataset.mode===modeId));
 $('mode-description').textContent=MODES[modeId].description;$('arena-mode-name').textContent=MODES[modeId].name;
}
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{
 if(busy()||queuedStart||button.dataset.mode===modeId)return;modeId=button.dataset.mode;newBattle();tone(560,.06);
});
function renderMaps(){
 $('map-count').textContent=String(MAPS.length).padStart(2,'0');
 for(const map of MAPS){const button=element('button','map-card'+(map.id===mapId?' selected':''));button.type='button';button.dataset.map=map.id;button.setAttribute('aria-label',`${map.name} 맵 선택`);button.setAttribute('aria-pressed',String(map.id===mapId));const canvas=element('canvas');canvas.width=240;canvas.height=100;const source=renderer.backgrounds.get(map.id),draw=()=>{const c=canvas.getContext('2d');c.imageSmoothingEnabled=Boolean(map.art);c.clearRect(0,0,240,100);if(map.art||map.layout)c.drawImage(source,0,0,768,480,0,0,240,100);else c.drawImage(source,0,0,768,480,-6,-20,252,157)};draw();if(map.art)source.addEventListener('mapartready',draw);canvas.setAttribute('aria-hidden','true');const info=element('div','map-info'),copy=element('span');copy.append(element('b','',map.name),element('small','',map.english),element('small','map-terrain',map.subtitle));info.append(copy,element('span','map-check',map.id===mapId?'✓':'›'));button.append(canvas,info);button.addEventListener('click',()=>{if(busy())return;mapId=map.id;save('mr-map',mapId);for(const card of document.querySelectorAll('.map-card')){const selected=card.dataset.map===mapId;card.classList.toggle('selected',selected);card.setAttribute('aria-pressed',String(selected));card.querySelector('.map-check').textContent=selected?'✓':'›'}newBattle();tone(560,.06)});$('map-options').append(button)}
}
function prepareRematch(){if(busy())return;newBattle();$('ready-start-btn').focus({preventScroll:true});if(window.innerWidth<821&&!document.fullscreenElement&&!$('arena-shell').classList.contains('focus-mode'))$('arena-frame').scrollIntoView({behavior:renderer.effects?'smooth':'instant',block:'center'})}
function start(){if(busy())return;if(battle.state==='finished'){prepareRematch();return}if(names.length<2){toast('메뉴를 2개 이상 넣어주세요.');return}if(!oddsError&&(!oddsResult||oddsResult.rounds<8)){queuedStart=true;lockSetup(true);$('status-text').textContent='승률 준비 중';requestOdds();return}newBattle();stopOdds();battle.state='countdown';countdownTime=3.3;feedIndex=3;$('ready-banner').hidden=true;$('countdown').hidden=false;$('countdown').textContent='3';$('status-text').textContent='곧 시작!';$('feed-text').textContent='추정 승률을 확인했나요? 실제 승부는 지금부터 시작입니다.';updateOddsUI();lockSetup(true);tone(440,.12);if(window.innerWidth<821)$('arena-frame').scrollIntoView({behavior:renderer.effects?'smooth':'instant',block:'center'})}
function updateRoster(){const live=battle.alive;for(const team of battle.teams){const members=live.filter(f=>f.teamId===team.id),chip=$(`team-${team.id}`);chip.classList.toggle('out',members.length===0);chip.style.setProperty('--hp',`${members.reduce((sum,f)=>sum+f.hp,0)/(team.count*100)*100}%`);chip.querySelector('.legend-count').textContent=`${members.length}/${team.count}`;chip.title=`${team.name} ${members.length}마리 생존`}$('alive-text').textContent=`${battle.aliveTeams.length}팀 · ${live.length}/${battle.fighters.length} 생존`}
function handleEvent(event){
 renderer.event(event);
 if(event.type==='eliminate'&&event.cause==='captain')return;
 if(event.type==='hit'){tone(event.crit?650:220,.045,'square',event.crit?.025:.012);if(event.crit)$('feed-text').textContent=`${event.fighter.name}의 결정적 한 방! ${event.target.name}에게 ${event.damage} 피해!`}
 else if(event.type==='trap-warning'){$('feed-text').textContent='함정 경고! 표시된 구역이 2초 뒤 작동합니다.';$('arena-caption').textContent='함정을 피해 끝까지 살아남으세요!';tone(540,.1,'triangle',.035)}
 else if(event.type==='trap-blast'){$('feed-text').textContent=event.kind==='poison'?'독 장판! 초록색 구역에 있으면 지속 피해를 받아요.':event.kind==='shockwave'?'충격파! 8 피해와 강한 밀려남이 발생해요.':'바닥 폭발! 위험 구역 안의 캐릭터에게 35 피해.';tone(120,.15,'triangle',.035)}
 else if(event.type==='comeback'){$('feed-text').textContent=`${event.fighter.name}의 대역전 일격! 포위망을 뚫어냅니다.`;tone(810,.1,'triangle',.04)}
 else if(event.type==='eliminate'){$('feed-text').textContent=event.killer?`${event.killer.name}의 공격! ${event.fighter.name} 한 마리 탈락 — ${battle.alive.length}마리 생존.`:event.cause==='trap'?`${event.fighter.name}, 함정에 의해 한 마리 탈락!`:`${event.fighter.name}, 좁아지는 경기장에서 한 마리 탈락!`;tone(170,.15,'triangle',.035)}
 else if(event.type==='captain-out'){$('feed-text').textContent=`${event.fighter.name} 대장 탈락! 해당 메뉴 팀이 퇴장합니다.`;tone(190,.15,'triangle',.035)}
 else if(event.type==='win')finish();
}

function finish(){const winner=battle.winner;round++;$('status-text').textContent='대결 종료';$('arena-caption').textContent=`오늘은 ${winner.name}!`;$('feed-text').textContent=`최후의 생존 메뉴는 ${winner.name}! 이제 맛있게 먹으러 갈 시간이에요.`;$('pause-btn').disabled=true;$('winner-title').textContent=winner.name;$('winner-description').textContent=`${MODES[battle.mode].name} · ${names.length}팀 · ${battle.fighters.length}마리 · ${Math.floor(battle.elapsed)}초의 승부`;$('copy-btn').textContent='결과 복사';history.unshift({name:winner.name,map:battle.map.name,seconds:Math.floor(battle.elapsed),count:names.length,date:Date.now()});history=history.slice(0,20);save('mr-history',history);resultTimer=.9;updateRoster();lockSetup(false);tone(660,.12,'triangle',.06);setTimeout(()=>tone(880,.2,'triangle',.05),130)}
function showResult(){resultTimer=0;$('result-layer').hidden=false;$('rematch-btn').focus({preventScroll:true})}
function togglePause(){if(battle.state!=='running')return;paused=!paused;$('paused-banner').hidden=!paused;$('pause-symbol').textContent=paused?'▶':'Ⅱ';$('pause-btn').setAttribute('aria-label',paused?'대결 계속하기':'대결 일시정지');$('status-text').textContent=paused?'잠시 쉬는 중':'대결 중'}
function validateAndAdd(text){if(busy())return;let add;try{add=parseMenuInput(text)}catch(error){setMessage(error.message,true);return}if(!add.length){setMessage('추가할 메뉴 이름을 적어주세요.',true);return}const unique=[...new Set([...names,...add.map(m=>m.name)])];if(unique.length>16){setMessage('한 번에 최대 16개의 메뉴가 참가할 수 있어요.',true);return}const nextCounts=Object.fromEntries([...entries().map(m=>[m.name,m.count]),...add.map(m=>[m.name,m.count])]);if(unique.reduce((sum,n)=>sum+nextCounts[n],0)>MAX_FIGHTERS){setMessage(`총 출전 수는 ${MAX_FIGHTERS}마리까지입니다.`,true);return}names=unique;counts=nextCounts;$('menu-input').value='';save('mr-menus',names);save('mr-counts',counts);newBattle();setMessage('참가 완료! 옆의 − + 버튼으로 출전 수를 바꿀 수 있어요.');tone(620,.06)}
function setMessage(message,error=false){$('input-message').textContent=message;$('input-message').classList.toggle('error',error)}
function applyMenuSet(value,presetId=''){
 const menus=validatePresetEntries(value);names=menus.map(item=>item.name);counts=Object.fromEntries(menus.map(item=>[item.name,item.count]));weapons=Object.fromEntries(menus.map(item=>[item.name,item.weapon]));activePreset=presetId;
 save('mr-menus',names);save('mr-counts',counts);save('mr-weapons',weapons);save('mr-active-preset',activePreset);newBattle();setMessage('원하는 메뉴와 출전 수로 준비했어요. 무기도 선택할 수 있어요.');tone(520,.06);
}
function refreshPresetSelection(){
 const expected=Object.hasOwn(presets,activePreset)?presets[activePreset].map(name=>({name,count:5,weapon:'none'})):customPresets.find(p=>p.id===activePreset)?.entries;
 if(!expected||JSON.stringify(entries())!==JSON.stringify(expected)){activePreset='';save('mr-active-preset','')}
 for(const button of document.querySelectorAll('[data-preset]'))button.classList.toggle('active',button.dataset.preset===activePreset);
 for(const button of document.querySelectorAll('[data-custom-preset]')){button.classList.toggle('active',button.dataset.customPreset===activePreset);button.setAttribute('aria-pressed',String(button.dataset.customPreset===activePreset))}
}
function renderCustomPresets(){
 $('custom-presets').replaceChildren();
 for(const preset of customPresets){
  const wrap=element('span','custom-preset-chip'),button=element('button','',preset.name),remove=element('button','remove-preset','×');button.type=remove.type='button';button.dataset.customPreset=preset.id;button.setAttribute('aria-label',`${preset.name} 메뉴 모음 불러오기`);button.setAttribute('aria-pressed',String(preset.id===activePreset));remove.setAttribute('aria-label',`${preset.name} 메뉴 모음 삭제`);button.addEventListener('click',()=>{if(!busy())applyMenuSet(preset.entries,preset.id)});remove.addEventListener('click',()=>{if(busy())return;customPresets=customPresets.filter(item=>item.id!==preset.id);if(activePreset===preset.id)activePreset='';save('mr-custom-presets',customPresets);save('mr-active-preset',activePreset);renderCustomPresets();refreshPresetSelection();toast('저장한 메뉴 모음을 삭제했어요. 현재 경기 메뉴는 유지됩니다.')});wrap.append(button,remove);$('custom-presets').append(wrap);
 }
 refreshPresetSelection();
}
function showCustomMenuEditor(){
 if(busy()||queuedStart)return;
 const content=$('dialog-content');content.replaceChildren();content.append(element('p','eyebrow','MAKE IT YOURS'),element('h2','dialog-title','내 메뉴 만들기'),element('p','dialog-description','먹고 싶은 메뉴를 직접 적어주세요. 이름을 붙여 저장하면 다음에도 바로 불러올 수 있어요.'));
 const form=element('form','custom-menu-form'),nameLabel=element('label','','모음 이름 · 저장할 때 입력'),nameInput=element('input');nameInput.id='custom-preset-name';nameInput.maxLength=20;nameInput.placeholder='예: 우리 팀 점심';nameLabel.htmlFor=nameInput.id;
 const menuLabel=element('label','','참가할 메뉴'),textarea=element('textarea');textarea.id='custom-preset-menus';textarea.rows=6;textarea.maxLength=600;textarea.placeholder='돈까스*3\n쌀국수*5\n김치찌개*2';menuLabel.htmlFor=textarea.id;
 const load=element('button','load-current-button','현재 메뉴 가져오기');load.type='button';let previousWeapons={};load.addEventListener('click',()=>{textarea.value=entries().map(m=>`${m.name}*${m.count}`).join('\n');previousWeapons=Object.fromEntries(entries().map(m=>[m.name,m.weapon]));textarea.focus()});
 const helper=element('p','custom-menu-help','한 줄에 하나 또는 쉼표로 구분 · 예: 돈까스*3 · 수량을 생략하면 5마리'),error=element('p','custom-menu-error');error.setAttribute('role','alert');
 const actions=element('div','custom-menu-actions'),apply=element('button','secondary-button','바로 적용'),store=element('button','primary-button','저장하고 적용');apply.type='button';store.type='submit';
 function commit(remember){try{
   const menus=entriesFromText(textarea.value,previousWeapons);let selected='';
   if(remember){const preset=makeCustomPreset(nameInput.value,menus,'custom-'+crypto.randomUUID());if(customPresets.some(item=>item.name===preset.name))throw new Error('이미 같은 이름의 메뉴 모음이 있어요. 다른 이름으로 저장해주세요.');if(customPresets.length>=20)throw new Error('내 메뉴 모음은 20개까지 저장할 수 있어요. 필요 없는 모음을 먼저 삭제해주세요.');customPresets.push(preset);if(!save('mr-custom-presets',customPresets)){customPresets.pop();throw new Error('이 브라우저에서 저장 공간을 사용할 수 없어요. 바로 적용은 가능합니다.')}selected=preset.id}
   applyMenuSet(menus,selected);renderCustomPresets();$('info-dialog').close();toast(remember?'내 메뉴 모음을 저장하고 적용했어요.':'직접 입력한 메뉴로 준비했어요.');
 }catch(problem){error.textContent=problem.message;}}
 apply.addEventListener('click',()=>commit(false));form.addEventListener('submit',event=>{event.preventDefault();commit(true)});actions.append(apply,store);form.append(nameLabel,nameInput,menuLabel,textarea,load,helper,error,actions,element('p','custom-menu-help','저장한 메뉴 모음은 이 브라우저에 보관됩니다.'));content.append(form);$('info-dialog').showModal();textarea.focus();
}
function showDialog(kind){const content=$('dialog-content');content.replaceChildren();if(kind==='help'){content.append(element('p','eyebrow','HOW TO RUMBLE'),element('h2','dialog-title','고민은 짧게, 한판은 신나게.'),element('p','dialog-description','직접 조작할 필요 없는 자동 난투전이에요. 입력한 메뉴들이 작은 용사가 되어 오늘의 주인공을 결정합니다.'));const list=element('ol','help-steps');['고민 중인 메뉴를 2–16개 넣어주세요.','경기장과 대결 모드(일반 난투·대장전·함정전)를 선택하세요.','난투전 시작하기를 누르고 지켜보세요.','마지막까지 살아남은 메뉴로 맛있게 한 끼!'].forEach(t=>list.append(element('li','',t)));content.append(list,element('p','dialog-description','메뉴마다 1–40마리, 전체 160마리까지 출전합니다. 같은 메뉴끼리는 공격하지 않아요. 기본 체력은 같고, 짧은 검은 공격력을 10% 높입니다. 화면의 승률은 가상 전투로 계산한 추정치이며 실제 결과와 다를 수 있습니다. 회피·치명타·범위 반격으로 적은 수의 메뉴도 역전할 수 있으며, 승률이 수량 비율과 정확히 같지는 않습니다. 대장전은 메뉴마다 무작위로 대장 한 마리를 정하고, 대장이 쓰러지면 팀 전체가 탈락합니다. 대장의 능력치는 다른 캐릭터와 같습니다. 함정전은 종류와 위치가 무작위로 정해지고 2초 동안 예고합니다. 주황색 폭발은 35 피해와 밀려남, 초록색 독 장판은 3초 동안 0.5초마다 6 피해, 파란색 충격파는 8 피해와 강한 밀려남을 줍니다. 모든 캐릭터가 같은 규칙으로 함정을 피합니다. 24초 뒤부터 안전 구역이 점점 좁아집니다. 아래 버튼으로 일시정지와 1–3배속을 사용할 수 있어요.'))}else{content.append(element('p','eyebrow','YOUR DELICIOUS HISTORY'),element('h2','dialog-title','지난 대결'));if(!history.length)content.append(element('p','dialog-description','아직 열린 대결이 없어요. 첫 번째 한판을 시작해 보세요!'));for(const item of history){const row=element('div','history-item'),copy=element('div');copy.append(element('b','',item.name),element('small','',`${new Date(item.date).toLocaleDateString('ko-KR',{month:'long',day:'numeric'})} · ${item.map} · ${item.count}개 메뉴 · ${item.seconds}초`));row.append(copy,element('span','','♛'));content.append(row)}content.append(element('p','dialog-description','최근 20개의 대결이 이 브라우저에 저장됩니다.'))}$('info-dialog').showModal()}
function tick(timestamp){frameId=0;if(disposed||document.hidden)return;const realDt=Math.min((timestamp-(lastTime||timestamp))/1000,.06);lastTime=timestamp;
 if(battle.state==='countdown'){countdownTime-=realDt;const value=countdownTime>.3?Math.ceil(countdownTime-.3):'GO!';$('countdown').textContent=value;if(value!==feedIndex){feedIndex=value;tone(value==='GO!'?880:440,.1)}if(countdownTime<=0){battle.state='ready';battle.start();$('countdown').hidden=true;$('pause-btn').disabled=false;$('status-text').textContent='대결 중';$('arena-caption').textContent='마지막 생존 메뉴를 가릴 때까지!'}}
 if(battle.state==='running'&&!paused){accumulator+=realDt*speed;while(accumulator>=1/60&&battle.state==='running'){battle.step(1/60);for(const event of battle.drainEvents())handleEvent(event);accumulator-=1/60}uiTime+=realDt;if(uiTime>.12){uiTime=0;updateRoster();$('arena-timer').textContent=`${String(Math.floor(battle.elapsed/60)).padStart(2,'0')}:${String(Math.floor(battle.elapsed%60)).padStart(2,'0')}`;if(battle.elapsed>24&&battle.alive.length>1)$('arena-caption').textContent='승부를 가릴 시간! 안전 구역이 좁아집니다.'}}
 if(resultTimer>0){resultTimer-=realDt;if(resultTimer<=0)showResult()}
 drawTime+=realDt;if(!renderer.lowPower||drawTime>=1/30){renderer.draw(battle,paused?0:drawTime);drawTime=0}frameId=requestAnimationFrame(tick);
}
$('menu-form').addEventListener('submit',e=>{e.preventDefault();validateAndAdd($('menu-input').value)});
$('menu-input').addEventListener('input',()=>setMessage('예: 치킨*10, 피자*2 · 수량 없이 넣으면 5마리'));
for(const button of document.querySelectorAll('[data-preset]'))button.addEventListener('click',()=>{if(!busy())applyMenuSet(presets[button.dataset.preset].map(name=>({name,count:5,weapon:'none'})),button.dataset.preset)});
$('custom-menu-btn').addEventListener('click',showCustomMenuEditor);
$('random-btn').addEventListener('click',()=>{if(busy())return;const choices=[...pool];for(let i=choices.length-1;i>0;i--){const j=Math.floor(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]]}names=choices.slice(0,8);counts=Object.fromEntries(names.map(n=>[n,5]));save('mr-counts',counts);save('mr-menus',names);for(const b of document.querySelectorAll('[data-preset]'))b.classList.remove('active');newBattle();setMessage('8팀, 40마리의 랜덤 도전자 입장 완료!');tone(660,.09)});
$('ready-start-btn').addEventListener('click',start);$('arena-start-btn').addEventListener('click',start);$('start-btn').addEventListener('click',start);$('rematch-btn').addEventListener('click',prepareRematch);$('close-result-btn').addEventListener('click',()=>{$('result-layer').hidden=true;$('start-btn').focus({preventScroll:true})});
$('pause-btn').addEventListener('click',togglePause);$('reset-btn').addEventListener('click',()=>{newBattle();toast('같은 메뉴로 다시 준비했어요.');tone(330,.06)});
$('speed-btn').addEventListener('click',()=>{speed=speed===3?1:speed+1;$('speed-btn').textContent=speed+'×';$('speed-btn').setAttribute('aria-label',`대결 속도 ${speed}배`);toast(`대결 속도 ${speed}배`)});
$('sound-btn').addEventListener('click',()=>{sound=!sound;save('mr-sound',sound);syncSound();tone(660,.08)});
$('history-btn').addEventListener('click',()=>showDialog('history'));$('help-btn').addEventListener('click',()=>showDialog('help'));
document.querySelector('.dialog-close').addEventListener('click',()=>$('info-dialog').close());$('info-dialog').addEventListener('click',e=>{if(e.target===$('info-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
function syncFocus(){const focused=Boolean(document.fullscreenElement)||$('arena-shell').classList.contains('focus-mode');$('exit-focus-btn').hidden=!focused;document.body.classList.toggle('arena-focused',focused)}
async function closeFocus(){if(document.fullscreenElement){await document.exitFullscreen()}$('arena-shell').classList.remove('focus-mode');syncFocus()}
$('fullscreen-btn').addEventListener('click',async()=>{if(document.fullscreenElement||$('arena-shell').classList.contains('focus-mode')){await closeFocus();return}try{if(typeof $('arena-shell').requestFullscreen!=='function')throw new Error('fallback');await $('arena-shell').requestFullscreen()}catch{$('arena-shell').classList.add('focus-mode')}syncFocus()});
$('exit-focus-btn').addEventListener('click',closeFocus);document.addEventListener('fullscreenchange',syncFocus);
$('mobile-start-btn').addEventListener('click',start);$('mobile-menu-btn').addEventListener('click',()=>$('setup-panel').scrollIntoView({behavior:renderer.effects?'smooth':'instant',block:'start'}));$('mobile-back-btn').addEventListener('click',()=>$('arena-frame').scrollIntoView({behavior:renderer.effects?'smooth':'instant',block:'center'}));
$('copy-btn').addEventListener('click',async()=>{const message=`오늘의 메뉴는 ${battle.winner.name}! 🍽️\n메뉴 럼블에서 ${names.length}개의 메뉴 중 최후의 생존자가 됐어요.\n${location.origin}${location.pathname}`;try{await navigator.clipboard.writeText(message);$('copy-btn').textContent='복사 완료 ✓';toast('오늘의 메뉴 결과를 복사했어요.')}catch{toast('이 브라우저에서는 자동 복사가 지원되지 않아요.')}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('result-layer').hidden){$('result-layer').hidden=true;$('start-btn').focus({preventScroll:true})}if(e.code==='Space'&&e.target===document.body&&battle.state==='running'&&!$('info-dialog').open){e.preventDefault();togglePause()}});
function suspendPage(){
 cancelAnimationFrame(frameId);frameId=0;lastTime=0;accumulator=0;drawTime=0;stopOdds();clearTimeout(toastTimer);
 if(audio?.state==='running')audio.suspend().catch(()=>{});
}
function resumePage(){
 if(disposed||document.hidden)return;lastTime=0;
 if(!frameId)frameId=requestAnimationFrame(tick);
 if(!busy())requestOdds();
}
document.addEventListener('visibilitychange',()=>document.hidden?suspendPage():resumePage());
window.addEventListener('pagehide',event=>{
 suspendPage();
 // A back/forward-cache page keeps its resources and resumes on pageshow.
 if(event.persisted)return;
 disposed=true;renderer.dispose?.();oddsCache.clear();mobileQuery.removeEventListener('change',updateDeviceMode);
 if(audio){audio.close().catch(()=>{});audio=null}
});
window.addEventListener('pageshow',resumePage);
renderMaps();renderCustomPresets();newBattle();syncSound();resumePage();
