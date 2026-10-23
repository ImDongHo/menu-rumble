// Single-level arenas. The floor, thumbnails and combat share these outlines.
const palettes={
  sand:{theme:'sand',ground:'#d1b078',dark:'#a37e49',light:'#e3c58f',floor:'#dfbc7c',tile:'#efcf94',edge:'#9e7849',accent:'#f8e4b5',backdrop:'#cbb17d',layout:true},
  moon:{theme:'moon',ground:'#40516d',dark:'#2b3c59',light:'#71849d',floor:'#929fb8',tile:'#b3bdd0',edge:'#536580',accent:'#dbd7ef',backdrop:'#40516d',layout:true},
  ice:{theme:'ice',ground:'#aecbd8',dark:'#6f99af',light:'#e4f4f7',floor:'#b9e1eb',tile:'#d7f1f4',edge:'#6595ae',accent:'#f4ffff',backdrop:'#a3c9d5',layout:true},
  lava:{theme:'lava',ground:'#564043',dark:'#382f3c',light:'#95654f',floor:'#73616e',tile:'#897481',edge:'#413746',accent:'#e8ad72',backdrop:'#563f43',layout:true}
};
export const FLAT_MAPS=[
  {...palettes.sand,id:'forest-crossing',name:'사막 연결교',english:'DESERT CROSSING',subtitle:'모래 유적을 잇는 H자 나무다리',
    terrain:[[76,90],[304,90],[304,208],[464,208],[464,90],[692,90],[692,414],[464,414],[464,296],[304,296],[304,414],[76,414]],
    bridge:{x:304,y:208,w:160,h:88},navigation:[[276,252],[492,252]],obstacles:[{x:144,y:152,r:19},{x:624,y:352,r:19}]},
  {...palettes.moon,id:'garden-loop',name:'달빛 순환정원',english:'MOONLIT LOOP',subtitle:'은빛 정원을 돌아 만나는 두 갈래 길',
    terrain:[[76,90],[692,90],[692,414],[76,414]],holes:[[[284,198],[484,198],[484,306],[284,306]]],
    ringCenter:{x:384,y:150},navigation:[[244,156],[524,156],[524,348],[244,348]],obstacles:[]},
  {...palettes.ice,id:'river-bends',name:'빙하 굽잇길',english:'FROZEN BENDS',subtitle:'푸른 빙판을 따라 이어지는 S자 전장',
    terrain:[[76,90],[692,90],[692,297],[208,297],[208,324],[692,324],[692,414],[76,414],[76,207],[560,207],[560,180],[76,180]],
    navigation:[[142,135],[626,135],[626,252],[142,252],[142,369],[626,369]],obstacles:[]},
  {...palettes.lava,id:'ruins-junction',name:'화산 교차로',english:'EMBER JUNCTION',subtitle:'잿빛 유적에서 맞붙는 십자 광장',
    terrain:[[254,90],[514,90],[514,174],[692,174],[692,330],[514,330],[514,414],[254,414],[254,330],[76,330],[76,174],[254,174]],
    navigation:[[384,252]],obstacles:[]}
];
