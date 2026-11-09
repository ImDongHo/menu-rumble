import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraControls,canvasViewport} from '../dist/camera-controls.mjs';
import {Battle} from '../dist/engine.mjs';
import {Renderer} from '../dist/renderer-3d.mjs';
import {createCamera} from '../dist/scene-model.mjs';
function setup(){const listeners=new Map(),canvas={style:{},setAttribute(){},addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n),getBoundingClientRect:()=>({left:0,top:0,width:768,height:480})},battle=new Battle(['A','B'],undefined,13,'race'),r={canvas,lastBattle:battle,viewState:{x:0,z:0,h:14.5},camera:createCamera(),onCameraChange(){this.changes=(this.changes??0)+1}},control=new CameraControls(r);r.cameraControls=control;control.setEnabled(true);return {canvas,r,control,listeners,battle,emit:(name,e)=>listeners.get(name)({button:0,preventDefault(){},...e})}}

test('letterboxed square mobile canvases map gestures to the visible 16:10 surface',()=>{
 assert.deepEqual(canvasViewport({getBoundingClientRect:()=>({left:10,top:20,width:390,height:390})}),{x:10,y:93.125,w:390,h:243.75});
});

test('a tap preserves tracking, a drag enters manual mode and holds its view while fighters run',()=>{
 const {r,emit,battle}=setup();emit('pointerdown',{pointerId:1,clientX:350,clientY:250});emit('pointerup',{pointerId:1});assert.equal(r.manualView,undefined);
 emit('pointerdown',{pointerId:1,clientX:350,clientY:250});emit('pointermove',{pointerId:1,clientX:450,clientY:300});emit('pointerup',{pointerId:1});assert.ok(r.manualView.x<0&&r.manualView.z<0);assert.equal(r.overview,false);
 battle.start();Renderer.prototype.updateCamera.call(r,battle,1);const view={...r.viewState};battle.fighters[0].x=900;Renderer.prototype.updateCamera.call(r,battle,1);assert.deepEqual(r.viewState,view);
 Renderer.prototype.setCameraMode.call(r,'auto');assert.equal(r.manualView,null);Renderer.prototype.updateCamera.call(r,battle,0);assert.notEqual(r.viewState.x,view.x);
});

test('wheel and pinch zoom stay bounded, resume tracking explicitly and leave normal maps scrollable',()=>{
 const {r,emit,control,canvas,listeners}=setup();emit('wheel',{deltaY:-250,deltaMode:0,clientX:384,clientY:240});assert.ok(r.manualView.h<14.5);
 const before=r.manualView.h;emit('pointerdown',{pointerId:1,clientX:300,clientY:240});emit('pointerdown',{pointerId:2,clientX:450,clientY:240});emit('pointermove',{pointerId:2,clientX:600,clientY:240});assert.ok(r.manualView.h<before);emit('pointercancel',{pointerId:1});emit('lostpointercapture',{pointerId:2});assert.equal(control.points.size,0);
 for(let i=0;i<50;i++)control.zoom(.1,384,240);assert.equal(r.manualView.h,6.5);for(let i=0;i<50;i++)control.zoom(10,384,240);assert.equal(r.manualView.h,r.lastBattle.map.overview*1.35);
 control.pan(1e8,1e8);assert.ok(Number.isFinite(r.manualView.x)&&r.manualView.x>-100);control.setEnabled(false);assert.equal(canvas.style.touchAction,'');let prevented=false;emit('wheel',{preventDefault(){prevented=true}});assert.equal(prevented,false);control.dispose();assert.equal(listeners.size,0);
});
