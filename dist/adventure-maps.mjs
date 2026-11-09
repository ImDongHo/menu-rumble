const common={layout:true,large:true,backdrop:'#4e756c',edge:'#687963',accent:'#dfe7bf',ground:'#75956c',dark:'#49674f',light:'#9cb689',floor:'#aab696',tile:'#bdc8a8',theme:'moon'};
const grid=(xs,ys)=>ys.flatMap(y=>xs.map(x=>[x,y]));
export const ADVENTURE_MAPS=[
 {...common,id:'forgotten-island',name:'잊힌 섬',english:'FORGOTTEN ISLAND',subtitle:'네 구역과 두 다리, 마지막 중앙 광장',modes:['royale'],kind:'island',theme:'sand',
  bounds:{x:-156,y:-68,w:1080,h:640},terrain:[[-96,-68],[864,-68],[924,-8],[924,512],[864,572],[-96,572],[-156,512],[-156,-8]],
  holes:[[[130,130],[240,130],[240,218],[130,218]],[[130,286],[240,286],[240,374],[130,374]],[[528,130],[638,130],[638,218],[528,218]],[[528,286],[638,286],[638,374],[528,374]]],
  bridges:[{x:130,y:218,w:110,h:68},{x:528,y:218,w:110,h:68}],navigation:grid([40,284,484,728],[60,252,460]),
  obstacles:[{x:-30,y:50,r:22},{x:798,y:50,r:22},{x:-30,y:454,r:22},{x:798,y:454,r:22},{x:330,y:70,r:18},{x:438,y:434,r:18}],
  overview:22,surfaces:['#9cb991','#d3bd89','#a4b6ae','#b5a891']},
 {...common,id:'relic-circuit',name:'유적 순환 코스',english:'RELIC CIRCUIT',subtitle:'직선·S자 굽이·아이템을 지나 결승선으로',modes:['race'],kind:'circuit',theme:'sand',floor:'#d1b17a',tile:'#e2c28b',edge:'#8a724d',accent:'#f4dfb1',
  bounds:{x:-190,y:0,w:1150,h:510},terrain:[[-150,0],[920,0],[960,40],[960,470],[920,510],[-150,510],[-190,470],[-190,40]],holes:[[[-20,184],[780,184],[780,330],[-20,330]]],obstacles:[],
  course:[[40,90],[280,90],[400,140],[540,90],[860,90],[900,240],[820,420],[500,420],[340,370],[160,420],[-60,420],[-120,252],[-60,90],[40,90]],overview:22},
 {...common,id:'sealed-lab',name:'폐쇄 연구단지',english:'SEALED LAB',subtitle:'세 마당과 순환 통로를 잇는 감염 전장',modes:['infection'],kind:'lab',theme:'moon',floor:'#858d9f',tile:'#a1a9b9',edge:'#48566c',accent:'#b2dbba',ground:'#435064',light:'#71899a',
  bounds:{x:-56,y:12,w:880,h:480},terrain:[[-16,12],[784,12],[824,52],[824,452],[784,492],[-16,492],[-56,452],[-56,52]],
  holes:[[[80,108],[260,108],[260,188],[80,188]],[[508,108],[688,108],[688,188],[508,188]],[[80,316],[260,316],[260,396],[80,396]],[[508,316],[688,316],[688,396],[508,396]]],
  navigation:grid([20,300,468,748],[60,252,444]),obstacles:[],overview:19}
];
export function mapBounds(map){return map.bounds??{x:76,y:90,w:616,h:324}}
export function overviewTransform(map,width=768,height=480){const b=mapBounds(map),scale=Math.min((width-56)/b.w,(height-56)/b.h);return{scale,x:width/2-(b.x+b.w/2)*scale,y:height/2-(b.y+b.h/2)*scale}}
export function surfaceColor(map,x,y){return map.surfaces?map.surfaces[(x<384?0:1)+(y<252?0:2)]:map.floor}

const courses=new WeakMap();
export function courseGeometry(map){
 if(courses.has(map))return courses.get(map);
 const controls=map.course.slice(0,-1),n=controls.length,segments=[],preview=[controls[0]];let length=0;
 const sample=(i,t)=>{
  const p0=controls[(i+n-1)%n],p1=controls[i],p2=controls[(i+1)%n],p3=controls[(i+2)%n],point=[],tangent=[];
  for(let axis=0;axis<2;axis++){const a=2*p1[axis],b=-p0[axis]+p2[axis],c=2*p0[axis]-5*p1[axis]+4*p2[axis]-p3[axis],d=-p0[axis]+3*p1[axis]-3*p2[axis]+p3[axis];point.push((a+b*t+c*t*t+d*t*t*t)/2);tangent.push((b+2*c*t+3*d*t*t)/2)}
  const norm=Math.hypot(...tangent)||1;return{point,dx:tangent[0]/norm,dy:tangent[1]/norm};
 };
 for(let i=0;i<n;i++)for(let k=1;k<=64;k++){
  const a=sample(i,(k-1)/64),b=sample(i,k/64),size=Math.hypot(b.point[0]-a.point[0],b.point[1]-a.point[1]);
  segments.push({x:a.point[0],y:a.point[1],tx:b.point[0],ty:b.point[1],length:size,start:length,ax:a.dx,ay:a.dy,bx:b.dx,by:b.dy});length+=size;if(k%8===0)preview.push(b.point);
 }
 const course={segments,length,preview};courses.set(map,course);return course;
}
