export const ANIMALS=['곰','토끼','고양이','강아지'];
export const animalKind=teamId=>teamId%ANIMALS.length;

// Visual animation only: never changes attack rolls, health or collision.
export function animalPose(f,time,state,out={},battleTime=time){
  const walk=state==='running'?Math.sin(f.step||0):Math.sin(time*2+f.id)*.12;
  const distance=f.target?Math.hypot(f.target.x-f.x,f.target.y-f.y):Infinity;
  const windup=state==='running'&&!f.dead&&f.stun<=0&&distance<48&&f.cooldown>0&&f.cooldown<.16?1-f.cooldown/.16:0;
  const skill=state==='running'&&(f.spin||0)>0;
  const total=skill?.68:(f.swingTotal||.48),remaining=state==='running'?(skill?f.spin:f.swing):0,progress=remaining>0?Math.max(0,Math.min(1,1-remaining/total)):1;
  const attack=remaining>0?Math.pow(Math.max(0,1-progress),1.5):0;
  const hurt=state==='running'?Math.max(0,f.hurt||0)/.36:0,recoil=Math.sin(Math.min(1,hurt)*Math.PI)*(f.hurtStrength||.45);
  const fall=f.dead?Math.min(1,Math.max(0,(battleTime-f.deadTime)/.36)):0;
  out.walk=walk;out.windup=skill?0:windup;out.attack=attack;out.skill=skill;
  out.yaw=(state==='ready'?.25:Math.PI/2-f.angle)+(skill?progress*Math.PI*2:((f.attackSide||0)?1:-1)*(attack*.42-windup*.22));
  out.leanX=attack*.22-windup*.14-recoil*.75;
  out.leanZ=Math.sin(hurt*12)*recoil*.25+fall*1.48*(f.id%2?1:-1);
  out.bob=(state==='running'?Math.abs(walk)*.06:Math.sin(time*2+f.id)*.018)+(skill?Math.sin(progress*Math.PI)*.22:0)+recoil*.12;
  out.lunge=attack*.16;out.squash=1-recoil*.12;out.headWobble=Math.sin(hurt*15)*recoil*.07;
  out.leftPunch=skill?.7:!(f.attackSide||0)?attack:0;
  out.rightPunch=skill?.7:(f.attackSide||0)?attack:0;
  out.leftBack=!(f.attackSide||0)?windup:0;out.rightBack=(f.attackSide||0)?windup:0;
  out.flail=recoil;out.fall=fall;
  return out;
}
