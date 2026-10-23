// Single-level arenas. The floor, thumbnails and combat share these outlines.
const palette={ground:'#477e86',dark:'#315f68',light:'#71a1a1',floor:'#b3bf96',tile:'#c0cba5',edge:'#65785c',accent:'#e4e8c4',backdrop:'#547d82',layout:true};
export const FLAT_MAPS=[
  {...palette,id:'forest-crossing',name:'숲속 연결교',english:'FOREST CROSSING',subtitle:'두 마당을 잇는 H자 나무다리',
    terrain:[[76,90],[304,90],[304,208],[464,208],[464,90],[692,90],[692,414],[464,414],[464,296],[304,296],[304,414],[76,414]],
    bridge:{x:304,y:208,w:160,h:88},navigation:[[276,252],[492,252]],obstacles:[{x:144,y:152,r:19},{x:624,y:352,r:19}]},
  {...palette,id:'garden-loop',name:'정원 순환로',english:'GARDEN LOOP',subtitle:'중앙 정원을 돌아 만나는 두 갈래 길',ground:'#609664',dark:'#46764c',light:'#86b17b',floor:'#d1c7ac',tile:'#ddd4bb',
    terrain:[[76,90],[692,90],[692,414],[76,414]],holes:[[[284,198],[484,198],[484,306],[284,306]]],
    ringCenter:{x:384,y:150},navigation:[[244,156],[524,156],[524,348],[244,348]],obstacles:[]},
  {...palette,id:'river-bends',name:'강변 굽잇길',english:'RIVER BENDS',subtitle:'넓은 굽이를 따라 이어지는 S자 전장',floor:'#a4bbaf',tile:'#b5cabc',edge:'#577970',
    terrain:[[76,90],[692,90],[692,297],[208,297],[208,324],[692,324],[692,414],[76,414],[76,207],[560,207],[560,180],[76,180]],
    navigation:[[142,135],[626,135],[626,252],[142,252],[142,369],[626,369]],obstacles:[]},
  {...palette,id:'ruins-junction',name:'유적 교차로',english:'RUINS JUNCTION',subtitle:'네 방향에서 모이는 십자 광장',ground:'#588c63',dark:'#3c6749',light:'#80ab7c',floor:'#a7b49c',tile:'#bac6ac',
    terrain:[[254,90],[514,90],[514,174],[692,174],[692,330],[514,330],[514,414],[254,414],[254,330],[76,330],[76,174],[254,174]],
    navigation:[[384,252]],obstacles:[]}
];
