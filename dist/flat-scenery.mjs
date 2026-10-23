import {terrainContains} from './terrain.mjs';

const noise=(x,y,s=0)=>{const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n)};
const tint=(hex,amount)=>'#'+hex.slice(1).match(/../g).map(n=>Math.max(0,Math.min(255,parseInt(n,16)+amount)).toString(16).padStart(2,'0')).join('');
const waterAt=(map,x,y)=>map.id==='forest-crossing'?Math.abs(x-384-Math.sin(y/130)*14)<90:map.id==='river-bends'&&!(Math.abs(x-384)>365||(y<30||y>470)&&Math.abs(x-384)>225);
const STYLES={
  sand:{base:'#c9aa75',water:'#648e89',waterLight:'#a4bcb0',shore:'#e1c38e',detail:'#ac925e',flower:'#ecd5a0',plant:'#7b9567',plantDark:'#627951',plantLight:'#a7b37b',rock:'#b99a69',rockDark:'#90754f',rockLight:'#dcc291',trunk:'#8e744e',garden:'#bfa675',gardenPlant:'#c7b287',gardenLight:'#ebd8aa'},
  moon:{base:'#465670',water:'#536f91',waterLight:'#9db0cd',shore:'#7c8a9f',detail:'#6d7d98',flower:'#cabce3',plant:'#647593',plantDark:'#435572',plantLight:'#a4acc8',rock:'#7b8aa1',rockDark:'#53627b',rockLight:'#bac0d4',trunk:'#65718b',garden:'#536980',gardenPlant:'#8e97b7',gardenLight:'#d3cbe4'},
  ice:{base:'#b6d0da',water:'#45788f',waterLight:'#9fcad9',shore:'#d8eef2',detail:'#e5f4f6',flower:'#f5ffff',plant:'#8eafb9',plantDark:'#608a9d',plantLight:'#e7f6f7',rock:'#8fbccc',rockDark:'#6598b1',rockLight:'#e4f7fa',trunk:'#7d99a5',garden:'#9fc1ce',gardenPlant:'#b6dce5',gardenLight:'#efffff'},
  lava:{base:'#594548',water:'#af583a',waterLight:'#ecb273',shore:'#98674e',detail:'#85615b',flower:'#d48b5c',plant:'#795b5f',plantDark:'#453847',plantLight:'#c38164',rock:'#66515f',rockDark:'#3f3445',rockLight:'#a77767',trunk:'#4a3944',garden:'#634851',gardenPlant:'#866268',gardenLight:'#dba077'}
};
export const sceneryStyle=map=>STYLES[map.theme]??STYLES.moon;

export function flatScenery(map){
  const items=[],style=sceneryStyle(map);
  const clear=(x,y,r)=>!waterAt(map,x,y)&&[-1,0,1].every(dx=>[-1,0,1].every(dy=>!terrainContains(map,x+dx*(r+12),y+dy*(r+12))));
  const trees=[[-34,46],[52,24],[172,15],[594,20],[728,30],[804,95],[-30,196],[796,250],[18,368],[750,379],[65,505],[187,505],[594,502],[721,510],[-77,480],[840,460]];
  const tallKind={sand:'cactus',moon:'tree',ice:'pine',lava:'spire'}[map.theme]??'tree';
  for(const [x,y]of trees)if(clear(x,y,32))items.push({kind:tallKind,x,y,size:.85+noise(x,y)*.3,color:style.plant});
  for(let y=28;y<520;y+=53)for(let x=-55;x<840;x+=61){
    const px=x+(noise(x,y,1)-.5)*19,py=y+(noise(x,y,2)-.5)*19,n=noise(x,y,3);
    if(n>.65||!clear(px,py,15))continue;
    const kind=n<.22?'rock':map.theme==='sand'?'dryTuft':map.theme==='ice'?'snowdrift':map.theme==='lava'?'ember':'shrub';
    items.push({kind,x:px,y:py,size:.65+noise(x,y,4)*.55,color:n<.22?style.rock:style.plant});
  }
  if(map.theme==='moon')for(const [x,y]of[[40,81],[728,81],[40,454],[728,454]])if(clear(x,y,13))items.push({kind:'lantern',x,y,size:1,color:style.rock});
  if(map.id==='forest-crossing')for(const y of[14,73,365,440,495])for(const side of[-1,1])items.push({kind:'reed',x:384+Math.sin(y/130)*14+side*97,y,size:1,color:style.plant});
  return items;
}

// Shared ground texture for map cards, 2D fallback and the 3D scenery plane.
export function drawFlatGround(c,map,left=0,top=0,width=768,height=480){
  const style=sceneryStyle(map);c.fillStyle=style.base;c.fillRect(left,top,width,height);
  for(let y=Math.floor(top/20)*20;y<top+height;y+=20)for(let x=Math.floor(left/24)*24;x<left+width;x+=24){
    const water=waterAt(map,x+12,y+10),n=noise(x,y);
    const shore=map.id==='forest-crossing'&&Math.abs(Math.abs(x+12-384-Math.sin((y+10)/130)*14)-90)<12;
    c.fillStyle=tint(water?style.water:shore?style.shore:style.base,Math.floor(n*13)-6);c.fillRect(x,y,24,20);
    if(water){if(n>.52){c.fillStyle=n>.85?style.waterLight:tint(style.water,14);c.fillRect(x+4,y+8,7+n*10,1);if(n>.8)c.fillRect(x+13,y+12,5,1)}}
    else if(n>.36){
      c.fillStyle=style.detail;
      if(map.theme==='sand'){c.fillRect(x+5,y+9,11,1);if(n>.8)c.fillRect(x+10,y+12,9,1)}
      else if(map.theme==='lava'){c.fillRect(x+5,y+4,1,8);c.fillRect(x+5,y+11,10,1);if(n>.91){c.fillStyle=style.flower;c.fillRect(x+5,y+7,1,5)}}
      else if(map.theme==='ice'){c.fillRect(x+4,y+9,13,2);if(n>.8)c.fillRect(x+7,y+6,6,1)}
      else{c.fillRect(x+6,y+9,2,4);c.fillRect(x+9,y+11,2,2);if(n>.93){c.fillStyle=style.flower;c.fillRect(x+7,y+7,3,2)}}
    }
  }
}

export function drawFlatProps(c,map){
  const style=sceneryStyle(map),block=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
  for(const item of flatScenery(map).sort((a,b)=>a.y-b.y)){
    const {x,y,size:s,color,kind}=item;c.save();c.translate(x,y);c.scale(s,s);block(-15,0,31,7,'#202b3933');
    if(kind==='tree'){
      block(-4,-32,8,38,style.trunk);block(-2,-31,3,34,tint(style.trunk,20));block(-23,-54,46,24,style.plantDark);block(-30,-47,60,20,style.plantDark);block(-26,-61,49,28,color);block(-17,-69,33,25,color);block(-19,-59,28,11,style.plantLight);block(6,-48,17,8,tint(color,10));
    }else if(kind==='cactus'){
      block(-5,-48,11,52,color);block(-3,-47,3,48,style.plantLight);block(-19,-34,7,23,color);block(-15,-16,16,7,color);block(13,-41,7,23,color);block(4,-24,13,7,color);block(-18,-34,2,15,style.plantLight);
    }else if(kind==='pine'){
      block(-3,-34,6,37,style.trunk);for(let layer=0;layer<3;layer++){const w=48-layer*12,y=-24-layer*15;block(-w/2,y,w,15,style.plantDark);block(-w/2,y,w,7,style.plantLight);block(-w/2+3,y-4,w-6,6,style.plantLight)}
    }else if(kind==='spire'){
      block(-14,-27,29,29,style.rockDark);block(-10,-49,20,46,style.rock);block(-7,-60,12,17,style.rock);block(-7,-60,5,24,style.rockLight);block(7,-24,2,19,style.flower);
    }else if(kind==='rock'||kind==='ember'){
      block(-13,-10,27,13,style.rockDark);block(-10,-18,20,13,style.rock);block(-7,-18,13,4,style.rockLight);block(4,-11,10,7,style.rockDark);if(kind==='ember')block(-6,-3,15,2,style.flower);
    }else if(kind==='lantern'){
      block(-7,-4,14,6,style.rockDark);block(-3,-24,6,22,color);block(-8,-31,16,11,style.plantLight);block(-4,-29,8,7,'#e1ddff');block(-11,-34,22,4,color);
    }else if(kind==='reed'||kind==='dryTuft'){
      for(const dx of[-6,0,5]){block(dx,-18-Math.abs(dx),2,24+Math.abs(dx),kind==='dryTuft'?style.detail:color);if(kind==='reed')block(dx-1,-23-Math.abs(dx),4,6,style.shore)}
    }else{
      block(-13,-10,27,13,kind==='snowdrift'?style.plant:style.plantDark);block(-9,-17,19,15,kind==='snowdrift'?style.plantLight:color);block(-5,-17,10,4,style.plantLight);if(map.theme==='moon'){block(-8,-10,4,3,style.flower);block(7,-7,3,3,'#cbd4ed')}
    }
    c.restore();
  }
}

export function flatSceneryBoxes(map){
  const boxes=[],style=sceneryStyle(map);
  for(const item of flatScenery(map)){
    const x=(item.x-384)/20,z=(item.y-252)/20,s=item.size,color=item.color,kind=item.kind;
    const prop=(dx,y,dz,w,h,d,c)=>boxes.push({x:x+dx*s,y:-.9+y*s,z:z+dz*s,w:w*s,h:h*s,d:d*s,color:c});
    if(kind==='tree'){
      prop(0,.7,0,.25,1.4,.25,style.trunk);prop(-.25,1.2,0,.65,.14,.15,style.trunk);prop(0,1.8,0,2.5,.8,1.7,style.plantDark);prop(-.2,2.35,0,2.3,.8,1.9,color);prop(.15,2.85,-.1,1.6,.6,1.4,color);prop(-.4,2.75,-.2,1.25,.24,1.05,style.plantLight);
    }else if(kind==='cactus'){
      prop(0,1.05,0,.5,2.1,.48,color);prop(-.16,1.05,.25,.08,1.9,.04,style.plantLight);prop(-.65,.95,0,.85,.25,.3,color);prop(-.95,1.25,0,.3,.8,.3,color);prop(.55,1.45,0,.7,.24,.3,color);prop(.85,1.75,0,.3,.8,.3,color);
    }else if(kind==='pine'){
      prop(0,.6,0,.22,1.2,.22,style.trunk);for(let layer=0;layer<3;layer++){const w=2.2-layer*.5,y=1.2+layer*.6;prop(0,y,0,w,.55,w,style.plantDark);prop(0,y+.3,0,w,.12,w,style.plantLight);prop(0,y+.4,0,w*.75,.16,w*.75,style.plantLight)}
    }else if(kind==='spire'){
      prop(0,.4,0,1.4,.8,1.05,style.rockDark);prop(-.12,1.1,0,.9,1.5,.8,style.rock);prop(-.24,2,0,.5,.55,.5,style.rock);prop(-.45,1.15,.25,.06,1.1,.1,style.rockLight);prop(.35,.6,.53,.08,.75,.04,style.flower);
    }else if(kind==='rock'||kind==='ember'){
      prop(0,.25,0,1.2,.5,.85,style.rockDark);prop(-.1,.57,0,.85,.4,.7,style.rock);prop(-.2,.8,-.07,.55,.08,.5,style.rockLight);if(kind==='ember')prop(0,.3,.44,.55,.07,.04,style.flower);
    }else if(kind==='reed'||kind==='dryTuft'){
      for(const dx of[-.2,0,.2]){prop(dx,.4,0,.055,.8,.055,kind==='dryTuft'?style.detail:color);if(kind==='reed')prop(dx,.85,0,.09,.16,.08,style.shore)}
    }else if(kind==='lantern'){
      prop(0,.1,0,.75,.2,.65,style.rockDark);prop(0,.55,0,.2,.9,.2,color);prop(0,1.05,0,.5,.4,.45,'#dad8f4');prop(0,1.3,0,.8,.13,.7,color);
    }else{
      prop(0,.25,0,1.25,.5,.9,kind==='snowdrift'?style.plant:style.plantDark);prop(-.15,.55,0,.9,.4,.8,kind==='snowdrift'?style.plantLight:color);prop(-.22,.76,-.05,.55,.08,.6,style.plantLight);if(map.theme==='moon')prop(.25,.7,.25,.14,.08,.14,style.flower);
    }
  }
  return boxes;
}
