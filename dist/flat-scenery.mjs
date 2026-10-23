import {terrainContains} from './terrain.mjs';

const noise=(x,y,s=0)=>{const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n)};
const tint=(hex,amount)=>'#'+hex.slice(1).match(/../g).map(n=>Math.max(0,Math.min(255,parseInt(n,16)+amount)).toString(16).padStart(2,'0')).join('');
const waterAt=(map,x,y)=>map.id==='forest-crossing'?Math.abs(x-384-Math.sin(y/130)*14)<90:map.id==='river-bends'&&!(Math.abs(x-384)>365||(y<30||y>470)&&Math.abs(x-384)>225);

export function flatScenery(map){
  const items=[],garden=map.id==='garden-loop';
  const clear=(x,y,r)=>!waterAt(map,x,y)&&[-1,0,1].every(dx=>[-1,0,1].every(dy=>!terrainContains(map,x+dx*(r+12),y+dy*(r+12))));
  const trees=[[-34,46],[52,24],[172,15],[594,20],[728,30],[804,95],[-30,196],[796,250],[18,368],[750,379],[65,505],[187,505],[594,502],[721,510],[-77,480],[840,460]];
  for(const [x,y]of trees)if(clear(x,y,32))items.push({kind:'tree',x,y,size:.85+noise(x,y)*.3,color:garden&&noise(x,y,1)>.45?'#ca94a3':'#648557'});
  for(let y=28;y<520;y+=53)for(let x=-55;x<840;x+=61){
    const px=x+(noise(x,y,1)-.5)*19,py=y+(noise(x,y,2)-.5)*19,n=noise(x,y,3);
    if(n>.65||!clear(px,py,15))continue;
    items.push({kind:n<.22?'rock':'shrub',x:px,y:py,size:.65+noise(x,y,4)*.55,color:n<.22?'#909b87':'#78945d'});
  }
  if(map.id==='forest-crossing')for(const y of[14,73,365,440,495])for(const side of[-1,1])items.push({kind:'reed',x:384+Math.sin(y/130)*14+side*97,y,size:1,color:'#98a879'});
  return items;
}

// Shared ground texture for map cards, 2D fallback and the 3D scenery plane.
export function drawFlatGround(c,map,left=0,top=0,width=768,height=480){
  const garden=map.id==='garden-loop',ruins=map.id==='ruins-junction',base=garden?'#739265':ruins?'#698969':'#6e8e68';
  c.fillStyle=base;c.fillRect(left,top,width,height);
  for(let y=Math.floor(top/20)*20;y<top+height;y+=20)for(let x=Math.floor(left/24)*24;x<left+width;x+=24){
    const water=waterAt(map,x+12,y+10),n=noise(x,y);
    const shore=map.id==='forest-crossing'&&Math.abs(Math.abs(x+12-384-Math.sin((y+10)/130)*14)-90)<12;
    c.fillStyle=tint(water?'#408589':shore?'#a4ab7e':base,Math.floor(n*13)-6);c.fillRect(x,y,24,20);
    if(water){if(n>.52){c.fillStyle=n>.85?'#79aaa4':'#569a9b';c.fillRect(x+4,y+8,7+n*10,1);if(n>.8)c.fillRect(x+13,y+12,5,1)}}
    else if(n>.36){c.fillStyle=n>.8?'#a0b180':'#839f70';c.fillRect(x+6,y+9,2,4);c.fillRect(x+9,y+11,2,2);if(n>.93){c.fillStyle=garden?'#e3b6ba':'#c5c597';c.fillRect(x+7,y+7,3,2)}}
  }
}

export function drawFlatProps(c,map){
  const block=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
  for(const item of flatScenery(map).sort((a,b)=>a.y-b.y)){
    const {x,y,size:s,color}=item;c.save();c.translate(x,y);c.scale(s,s);
    block(-15,0,31,7,'#284b3633');
    if(item.kind==='tree'){
      block(-4,-32,8,38,'#75654a');block(-2,-31,3,34,'#a58b63');
      block(-23,-54,46,24,tint(color,-15));block(-30,-47,60,20,tint(color,-15));block(-26,-61,49,28,color);block(-17,-69,33,25,color);block(-19,-59,28,11,tint(color,18));block(6,-48,17,8,tint(color,10));
    }else if(item.kind==='rock'){
      block(-13,-10,27,13,tint(color,-16));block(-10,-18,20,13,color);block(-7,-18,13,4,tint(color,22));block(4,-11,10,7,tint(color,-9));
    }else if(item.kind==='reed'){
      for(const dx of[-6,0,5]){block(dx,-18-Math.abs(dx),2,24+Math.abs(dx),color);block(dx-1,-23-Math.abs(dx),4,6,'#ad9b65')}
    }else{
      block(-13,-10,27,13,tint(color,-12));block(-9,-17,19,15,color);block(-5,-17,10,4,tint(color,22));if(map.id==='garden-loop'){block(-8,-10,4,3,'#e0b4bc');block(7,-7,3,3,'#e7cf98')}
    }
    c.restore();
  }
}
