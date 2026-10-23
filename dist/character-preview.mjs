import * as THREE from './vendor/three.module.js';
import {Renderer} from './renderer-3d.mjs?v=soft-beans-2';

const renderer=new Renderer(document.querySelector('#characters')),stage=document.querySelector('#stage');
const colors=['#f28b82','#f4d576','#bca1df','#9bcca3'];
const fighters=colors.map((color,id)=>({id,teamId:id,color,x:384,y:252,hp:100,weapon:id%2?'sword':'none',angle:Math.PI/2,step:0,stun:0,swing:0,swingTotal:.48,spin:0,cooldown:1,attackSide:1,hurt:0,hurtStrength:0,flash:0,dead:false,deadTime:0,target:{x:384,y:252}}));
const battle={fighters,state:'ready'};
let mode='ready',elapsed=0,last=0,frame=0,disposed=false;
if(renderer.gl){
  renderer.overlay.remove();
  renderer.teamRings.visible=false;
  renderer.scene.background.set('#f7f5ef');
  const light=renderer.scene.children.find(child=>child.isDirectionalLight);if(light){light.intensity=2;light.position.set(-4,8,7)}
  const camera=new THREE.OrthographicCamera();camera.position.set(0,5,11);camera.lookAt(0,1,0);renderer.camera=camera;
  const resize=()=>{
    const width=stage.clientWidth,height=stage.clientHeight,small=width<580,viewHeight=small?7.7:5.4,viewWidth=viewHeight*width/height;
    camera.position.set(0,small?11:5,11);camera.lookAt(0,1,0);camera.updateMatrixWorld();
    camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.near=.1;camera.far=100;camera.updateProjectionMatrix();
    renderer.gl.setSize(width,height,false);
    fighters.forEach((f,i)=>{f.x=384+(small?(i%2?1.4:-1.4):(i-1.5)*3.05)*20;f.y=252+(small?(i<2?-2.2:2.2):0)*20;f.target.x=f.x+12;f.target.y=f.y});
  };
  resize();window.addEventListener('resize',resize);
  for(const button of document.querySelectorAll('[data-motion]'))button.addEventListener('click',()=>{mode=button.dataset.motion;elapsed=0;for(const b of document.querySelectorAll('[data-motion]'))b.setAttribute('aria-pressed',String(b===button))});
  const draw=now=>{
    if(disposed)return;const dt=Math.min(.05,(now-last)/1000||0);last=now;
    if(!document.hidden){
      elapsed+=dt;renderer.time=elapsed;battle.state=mode==='ready'?'ready':'running';
      for(const f of fighters){
        const phase=(elapsed+f.id*.08)%1.45;f.weapon=mode==='sword'||mode==='spin'||(mode==='ready'&&f.id%2)?'sword':'none';
        f.cooldown=phase<.18?.18-phase:1;f.swing=phase>=.18&&phase<.66?.66-phase:0;f.spin=mode==='spin'&&phase>=.18&&phase<.86?.86-phase:0;
        f.step=mode==='ready'?0:Math.sin(elapsed*3)*.5;f.attackSide=Math.floor(elapsed/1.45)%2;
      }
      renderer.actors(battle);renderer.gl.render(renderer.scene,camera);
    }
    frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);
  window.addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;cancelAnimationFrame(frame);window.removeEventListener('resize',resize);renderer.dispose()});
}else{
  document.querySelector('.note').textContent='이 브라우저에서는 입체 미리보기를 지원하지 않아요. 게임에서는 기본 그래픽으로 실행됩니다.';
  for(const button of document.querySelectorAll('[data-motion]'))button.disabled=true;
}
