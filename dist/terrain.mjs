export function terrainContains(map,x,y,margin=0){
  const polygon=map.terrain;if(!polygon)return x>=91&&x<=677&&y>=106&&y<=410;
  let inside=false,minDistance=Infinity;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [ax,ay]=polygon[j],[bx,by]=polygon[i];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
    const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    minDistance=Math.min(minDistance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }
  return inside&&minDistance>=margin;
}

// Keep both movement and knockback on the visible platform. Slide along banks.
export function constrainTerrain(map,f,previous){
  if(!map.terrain)return;
  if(terrainContains(map,f.x,f.y,8))return;
  if(terrainContains(map,f.x,previous.y,8)){f.y=previous.y;return}
  if(terrainContains(map,previous.x,f.y,8)){f.x=previous.x;return}
  f.x=previous.x;f.y=previous.y;
}

export function terrainWaypoint(map,f,target){
  if(map.id!=='ice')return target;
  // The two floes share a real, narrow bridge. Approach its mouth before crossing.
  if(f.x<320&&target.x>320)return Math.abs(f.y-252)>14?{x:304,y:252}:{x:464,y:252};
  if(f.x>448&&target.x<448)return Math.abs(f.y-252)>14?{x:464,y:252}:{x:304,y:252};
  if(f.x>=320&&f.x<=448)return target.x<384?{x:304,y:252}:{x:464,y:252};
  return target;
}
