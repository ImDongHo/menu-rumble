export const ANIMALS=['곰','토끼','고양이','강아지'];
export const animalKind=teamId=>teamId%ANIMALS.length;

// Visual animation only: never changes attack rolls, health or collision.
export function animalPose(f,time,state,out={},battleTime=time){
  const armed=f.weapon==='sword',side=armed?1:(f.attackSide||0);
  const walk=state==='running'?Math.sin(f.step||0):Math.sin(time*2+f.id)*.12;
  const distance=f.target?Math.hypot(f.target.x-f.x,f.target.y-f.y):Infinity;
  const windup=state==='running'&&!f.dead&&f.stun<=0&&distance<48&&f.cooldown>0&&f.cooldown<.16?1-f.cooldown/.16:0;
  const skill=state==='running'&&(f.spin||0)>0;
  const total=skill?.68:(f.swingTotal||.48),remaining=state==='running'?(skill?f.spin:f.swing):0,progress=remaining>0?Math.max(0,Math.min(1,1-remaining/total)):1;
  const attack=remaining>0?Math.pow(Math.max(0,1-progress),1.5):0;
  const hurt=state==='running'?Math.max(0,f.hurt||0)/.36:0,recoil=Math.sin(Math.min(1,hurt)*Math.PI)*(f.hurtStrength||.45);
  const fall=f.dead?Math.min(1,Math.max(0,(battleTime-f.deadTime)/.36)):0;
  out.walk=walk;out.windup=skill?0:windup;out.attack=attack;out.skill=skill;out.armed=armed;
  out.yaw=(state==='ready'?.25:Math.PI/2-f.angle)+(skill?progress*Math.PI*2:(side?1:-1)*(attack*(armed?.7:.42)-windup*.28));
  out.leanX=attack*.22-windup*.14-recoil*.75;
  out.leanZ=walk*.035+Math.sin(hurt*12)*recoil*.25+fall*1.48*(f.id%2?1:-1);
  out.bob=(state==='running'?Math.abs(walk)*.06:Math.sin(time*2+f.id)*.018)+(skill?Math.sin(progress*Math.PI)*.22:0)+recoil*.12;
  out.lunge=attack*.16;out.squash=1-recoil*.12;out.headWobble=Math.sin(hurt*15)*recoil*.07;
  out.leftPunch=skill?.7:!side?attack:0;
  out.rightPunch=skill?.7:side?attack:0;
  out.leftBack=!side?windup:0;out.rightBack=side?windup:0;
  out.flail=recoil;out.fall=fall;
  return out;
}

// Reused local-space anchors keep the arm, mitten and held sword connected.
export function fighterArm(p,side,out={}){
  const sign=side?1:-1,punch=side?p.rightPunch:p.leftPunch,back=side?p.rightBack:p.leftBack;
  out.shoulderX=sign*.38;out.shoulderY=.94;out.shoulderZ=0;
  out.x=sign*(p.skill?.88:.50-punch*.15);out.y=.61+punch*.35+p.flail*.25;out.z=.12+punch*.94-back*.40+p.walk*sign*.06;
  if(p.armed&&side&&!p.skill){out.x=.51+back*.18-punch*.68;out.y=.72+back*.54+punch*.27+p.flail*.25;out.z=.15-back*.24+punch*.76}
  out.pitch=p.skill?.85:.12-back*.60+punch*1.22;
  out.roll=p.skill?-.9:-.18-back*.40+punch*1.26;
  return out;
}

export function heldSword(arm,out={}){
  const x=-Math.sin(arm.roll),y=Math.cos(arm.pitch)*Math.cos(arm.roll),z=Math.sin(arm.pitch)*Math.cos(arm.roll);
  out.x=arm.x;out.y=arm.y;out.z=arm.z;out.pitch=arm.pitch;out.roll=arm.roll;
  out.guardX=arm.x+x*.16;out.guardY=arm.y+y*.16;out.guardZ=arm.z+z*.16;
  out.bladeX=arm.x+x*.66;out.bladeY=arm.y+y*.66;out.bladeZ=arm.z+z*.66;
  return out;
}
