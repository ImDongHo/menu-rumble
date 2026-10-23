import {MAX_FIGHTERS,parseMenuInput} from './engine.mjs';
export function validatePresetEntries(entries){
  if(!Array.isArray(entries)||entries.length<2||entries.length>16)throw new RangeError('메뉴를 2–16개 넣어주세요.');
  const names=new Set(),normalized=[];
  for(const item of entries){
    const name=typeof item?.name==='string'?item.name.trim():'';
    if(!name||[...name].length>12)throw new RangeError('메뉴 이름은 1–12글자로 넣어주세요.');
    if(names.has(name))throw new RangeError(`${name} 메뉴가 중복되어 있어요. 한 번만 넣어주세요.`);
    if(!Number.isInteger(item.count)||item.count<1||item.count>40)throw new RangeError('각 메뉴의 출전 수는 1–40마리입니다.');
    names.add(name);normalized.push({name,count:item.count,weapon:item.weapon==='sword'?'sword':'none'});
  }
  if(normalized.reduce((sum,item)=>sum+item.count,0)>MAX_FIGHTERS)throw new RangeError(`전체 출전 수는 ${MAX_FIGHTERS}마리까지입니다.`);
  return normalized;
}
export function entriesFromText(text,previousWeapons={}){
  return validatePresetEntries(parseMenuInput(text).map(item=>({...item,weapon:previousWeapons[item.name]==='sword'?'sword':'none'})));
}
export function makeCustomPreset(name,entries,id){
  name=typeof name==='string'?name.trim():'';
  if(!name||[...name].length>20)throw new RangeError('저장할 메뉴 모음의 이름을 1–20글자로 적어주세요.');
  if(typeof id!=='string'||!id.startsWith('custom-')||id.length>80)throw new TypeError('메뉴 모음 ID가 올바르지 않습니다.');
  return {id,name,entries:validatePresetEntries(entries)};
}
export function readCustomPresets(value){
  if(!Array.isArray(value))return [];
  const result=[],ids=new Set();
  for(const item of value.slice(0,20))try{const preset=makeCustomPreset(item.name,item.entries,item.id);if(!ids.has(preset.id)){result.push(preset);ids.add(preset.id)}}catch{}
  return result;
}
