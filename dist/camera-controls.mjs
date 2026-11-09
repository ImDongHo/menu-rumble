import {mapBounds} from './adventure-maps.mjs';
const GROUND_COS=27.65/Math.hypot(27.65,25);
export function canvasViewport(canvas){
 const r=canvas.getBoundingClientRect(),w=Math.min(r.width,r.height*1.6),h=w/1.6;
 return {x:r.left+(r.width-w)/2,y:r.top+(r.height-h)/2,w,h};
}
export function limitView(view,map){
 const b=mapBounds(map);view.h=Math.max(6.5,Math.min(map.overview*1.35,view.h));
 view.x=Math.max((b.x-384)/20,Math.min((b.x+b.w-384)/20,view.x));view.z=Math.max((b.y-252)/20,Math.min((b.y+b.h-252)/20,view.z));return view;
}
export class CameraControls{
 constructor(renderer){
  this.renderer=renderer;this.canvas=renderer.canvas;this.points=new Map();this.enabled=false;this.listeners=[];
  const on=(name,fn,options)=>{this.canvas.addEventListener(name,fn,options);this.listeners.push([name,fn,options])};
  on('pointerdown',e=>{if(!this.enabled||e.button>0)return;const r=canvasViewport(this.canvas);if(e.clientX<r.x||e.clientX>r.x+r.w||e.clientY<r.y||e.clientY>r.y+r.h)return;this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});this.dragDistance=0;this.canvas.setPointerCapture?.(e.pointerId)});
  on('pointermove',e=>{
   if(!this.points.has(e.pointerId))return;const before=[...this.points.values()],old=this.points.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;
   this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});this.dragDistance+=Math.hypot(dx,dy);if(this.points.size<2&&this.dragDistance<4)return;
   const after=[...this.points.values()];if(after.length===1)this.pan(dx,dy);else{
    const mid=a=>({x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2}),a=mid(before),b=mid(after),length=a=>Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
    this.pan(b.x-a.x,b.y-a.y);const from=length(before),to=length(after);if(from>4&&to>4)this.zoom(from/to,b.x,b.y);
   }e.preventDefault();
  });
  const release=e=>this.points.delete(e.pointerId);on('pointerup',release);on('pointercancel',release);on('lostpointercapture',release);
  on('wheel',e=>{if(!this.enabled)return;e.preventDefault();const amount=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?480:1);this.zoom(Math.exp(Math.max(-1,Math.min(1,amount*.0015))),e.clientX,e.clientY)},{passive:false});
  on('keydown',e=>{if(!this.enabled)return;const r=canvasViewport(this.canvas);if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();this.pan(e.key==='ArrowLeft'?40:e.key==='ArrowRight'?-40:0,e.key==='ArrowUp'?40:e.key==='ArrowDown'?-40:0)}else if(['+','=','-'].includes(e.key)){e.preventDefault();this.zoom(e.key==='-'?1.15:1/1.15,r.x+r.w/2,r.y+r.h/2)}});
 }
 setEnabled(enabled){if(this.enabled===enabled)return;this.enabled=enabled;this.points.clear();this.canvas.style.touchAction=enabled?'none':'';this.canvas.style.cursor=enabled?'grab':'';this.canvas.tabIndex=enabled?0:-1;if(enabled)this.canvas.setAttribute('aria-label','경기장. 드래그 또는 방향키로 이동, 휠·두 손가락·더하기와 빼기 키로 확대와 축소. 자동 추적 버튼으로 복귀합니다.')}
 manual(){const r=this.renderer;if(!this.enabled||!r.viewState)return null;r.manualView??={...r.viewState};r.overview=false;r.cameraNeedsSnap=true;r.onCameraChange?.();return r.manualView}
 pan(dx,dy){const view=this.manual();if(!view)return;const r=canvasViewport(this.canvas);if(!r.w||!r.h)return;view.x-=dx/r.w*view.h*3.2;view.z-=dy/r.h*view.h*2/GROUND_COS;limitView(view,this.renderer.lastBattle.map)}
 zoom(factor,x,y){const view=this.manual();if(!view)return;const r=canvasViewport(this.canvas);if(!r.w||!r.h)return;const h=view.h,nx=(x-r.x)/r.w-.5,ny=(y-r.y)/r.h-.5;view.h*=factor;limitView(view,this.renderer.lastBattle.map);view.x+=nx*(h-view.h)*3.2;view.z+=ny*(h-view.h)*2/GROUND_COS;limitView(view,this.renderer.lastBattle.map)}
 dispose(){this.points.clear();for(const [name,fn,options]of this.listeners)this.canvas.removeEventListener(name,fn,options);this.listeners=[];this.canvas.style.touchAction='';this.canvas.style.cursor=''}
}
