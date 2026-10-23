// One projection shared by the image, actors, collision pillars and 2D fallback.
export const ART_MAP_ID='moss-ruins';
export const ART_VIEW={halfHeight:13.9333333333,targetY:2.22,cameraY:29.4,cameraZ:36,width:768,height:480};
export const artWorldPosition=(x,y)=>({x:(x-384)/18,z:(y-252)/12});
const distance=Math.hypot(ART_VIEW.cameraY-ART_VIEW.targetY,ART_VIEW.cameraZ);
const sin=(ART_VIEW.cameraY-ART_VIEW.targetY)/distance,cos=ART_VIEW.cameraZ/distance;
export function projectArtPoint(x,y,height=0){const p=artWorldPosition(x,y),scale=ART_VIEW.height/(2*ART_VIEW.halfHeight);return{x:384+p.x*scale,y:240-((height-ART_VIEW.targetY)*cos-p.z*sin)*scale}}
export function artPillarRect(obstacle){const far=projectArtPoint(obstacle.x-2.2/2*18,obstacle.y-3.0/2*12,3.35),near=projectArtPoint(obstacle.x+2.2/2*18,obstacle.y+3.0/2*12,0);return{x:far.x,y:far.y,w:near.x-far.x,h:near.y-far.y}}
export function loadMapArt(canvas,source){
 const image=new Image();canvas.mapArtState='loading';
 image.onload=()=>{const c=canvas.getContext('2d'),scale=Math.min(canvas.width/image.naturalWidth,canvas.height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;c.imageSmoothingEnabled=true;c.fillStyle='#94a080';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);canvas.mapArtState='ready';canvas.dispatchEvent(new Event('mapartready'));image.onload=image.onerror=null};
 image.onerror=()=>{canvas.mapArtState='error';canvas.dispatchEvent(new Event('mapartready'));image.onload=image.onerror=null};
 canvas.cancelMapArt=()=>{image.onload=image.onerror=null};image.src=source;
}
