import test from 'node:test';
import assert from 'node:assert/strict';
import {entriesFromText,makeCustomPreset,readCustomPresets,validatePresetEntries} from '../dist/custom-presets.mjs';
test('a custom menu set can replace default meals with exact quantities',()=>{
  assert.deepEqual(entriesFromText(' 돈까스*3\n 쌀국수*5, 김치찌개*2 '),[{name:'돈까스',count:3,weapon:'none'},{name:'쌀국수',count:5,weapon:'none'},{name:'김치찌개',count:2,weapon:'none'}]);
});
test('a saved menu set survives JSON storage with weapons and counts intact',()=>{
  const menus=entriesFromText('치킨*10,피자*2',{치킨:'sword'}),preset=makeCustomPreset('우리 팀 점심',menus,'custom-test');
  assert.deepEqual(readCustomPresets(JSON.parse(JSON.stringify([preset]))),[preset]);
  assert.equal(preset.entries[0].weapon,'sword');
});
test('custom menu validation rejects duplicates, one menu, oversized groups and empty names',()=>{
  for(const text of['치킨','치킨*3,치킨*2','A*40,B*40,C*40,D*40,E*1'])assert.throws(()=>entriesFromText(text),RangeError);
  assert.throws(()=>makeCustomPreset('',entriesFromText('A,B'),'custom-test'),RangeError);
  assert.throws(()=>validatePresetEntries([{name:'A',count:1},{name:'B',count:0}]),RangeError);
});
test('malformed local saved sets are skipped without losing valid sets',()=>{
  const valid=makeCustomPreset('나의 메뉴',entriesFromText('돈까스,우동'),'custom-valid');
  assert.deepEqual(readCustomPresets([null,{id:'bad',name:'bad'},valid,valid]),[valid]);
});
