function polygonLocation(polygon,x,y){
  let inside=false,minDistance=Infinity;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [ax,ay]=polygon[j],[bx,by]=polygon[i];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
    const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    minDistance=Math.min(minDistance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }
  return {inside,minDistance};
}

export function terrainContains(map,x,y,margin=0){
  if(!map.terrain)return x>=91&&x<=677&&y>=106&&y<=410;
  const outer=polygonLocation(map.terrain,x,y);
  if(!outer.inside||outer.minDistance<margin)return false;
  return (map.holes??[]).every(hole=>{const p=polygonLocation(hole,x,y);return !p.inside&&p.minDistance>=margin});
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
  if(map.navigation)return layoutWaypoint(map,f,target);
  if(map.id!=='ice')return target;
  // The two floes share a real, narrow bridge. Approach its mouth before crossing.
  if(f.x<320&&target.x>320)return Math.abs(f.y-252)>14?{x:304,y:252}:{x:464,y:252};
  if(f.x>448&&target.x<448)return Math.abs(f.y-252)>14?{x:464,y:252}:{x:304,y:252};
  if(f.x>=320&&f.x<=448)return target.x<384?{x:304,y:252}:{x:464,y:252};
  return target;
}

// Visibility graph for the small set of broad corridors in the flat arenas.
// Cache routes per fighter, rather than searching for all 160 actors every frame.
const graphs=new WeakMap(),routes=new WeakMap();
export function terrainSegmentClear(map,a,b,margin=10){
  const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/6));
  for(let i=0;i<=steps;i++)if(!terrainContains(map,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,margin))return false;
  return true;
}
function navigationGraph(map){
  if(graphs.has(map))return graphs.get(map);
  const nodes=map.navigation.map(([x,y])=>({x,y})),n=nodes.length;
  const distances=nodes.map((a,i)=>nodes.map((b,j)=>i===j?0:terrainSegmentClear(map,a,b)?Math.hypot(a.x-b.x,a.y-b.y):Infinity));
  const next=nodes.map((_,i)=>nodes.map((_,j)=>Number.isFinite(distances[i][j])?j:null));
  for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(distances[i][k]+distances[k][j]<distances[i][j]){distances[i][j]=distances[i][k]+distances[k][j];next[i][j]=next[i][k]}
  const graph={nodes,distances,next};graphs.set(map,graph);return graph;
}
function layoutWaypoint(map,f,target){
  let route=routes.get(f);
  if(!route||route.map!==map||route.target!==target||Math.hypot(target.x-route.tx,target.y-route.ty)>48||--route.ttl<=0){
    const points=[];
    if(!terrainSegmentClear(map,f,target)){
      const {nodes,distances,next}=navigationGraph(map);
      const starts=nodes.map((node,i)=>({i,d:Math.hypot(f.x-node.x,f.y-node.y)})).filter(({i})=>terrainSegmentClear(map,f,nodes[i]));
      const ends=nodes.map((node,i)=>({i,d:Math.hypot(target.x-node.x,target.y-node.y)})).filter(({i})=>terrainSegmentClear(map,nodes[i],target));
      let best=Infinity,start=null,end=null;
      for(const a of starts)for(const b of ends){const d=a.d+distances[a.i][b.i]+b.d;if(d<best){best=d;start=a.i;end=b.i}}
      if(start!==null){points.push(nodes[start]);while(start!==end){start=next[start][end];points.push(nodes[start])}}
    }
    route={map,target,tx:target.x,ty:target.y,ttl:30,points};routes.set(f,route);
  }
  while(route.points.length&&Math.hypot(f.x-route.points[0].x,f.y-route.points[0].y)<12)route.points.shift();
  return route.points[0]??target;
}
