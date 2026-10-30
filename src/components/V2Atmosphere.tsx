'use client';

import {useEffect,useRef} from 'react';
import type {HomeGlassScene} from '@/lib/home-glass';

const loadScene=(canvas:HTMLCanvasElement,signal:AbortSignal)=>import('@/lib/home-glass').then(module=>module.createHomeGlass(canvas,signal));

/** Load the homepage-only renderer without blocking the semantic content. */
export function mountV2Atmosphere(canvas:HTMLCanvasElement,createScene=loadScene){
 const host=canvas.parentElement||canvas,preference=window.matchMedia('(prefers-reduced-motion: reduce)'),controller=new AbortController();
 let scene:HomeGlassScene|null=null,frame=0,lastDraw=0,visible=false,printing=false,lost=false,disposed=false;
 let targetX=0,targetY=0,pointerX=0,pointerY=0;
 canvas.dataset.atmosphere='loading';canvas.style.opacity='0';
 const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;lastDraw=0;if(scene)canvas.dataset.atmosphere=lost?'fallback':'paused';};
 const draw=()=>{
  if(!scene||disposed||lost||document.hidden||printing||!visible)return;
  try{scene.render(pointerX,pointerY,document.documentElement.dataset.colorMode==='dark');canvas.style.opacity='1';}
  catch{fail();}
 };
 const canMove=()=>!disposed&&!lost&&!!scene&&visible&&!document.hidden&&!printing&&!preference.matches;
 const moving=()=>Math.abs(targetX-pointerX)+Math.abs(targetY-pointerY)>.0001;
 const tick=(now:number)=>{
  frame=0;if(!canMove())return;
  if(!lastDraw||now-lastDraw>=1000/30){
   const amount=1-Math.exp(-7*Math.min(lastDraw?(now-lastDraw)/1000:1/30,.05));
   lastDraw=now;pointerX+=(targetX-pointerX)*amount;pointerY+=(targetY-pointerY)*amount;draw();
  }
  if(canMove()&&moving())frame=requestAnimationFrame(tick);else stop();
 };
 const sync=()=>{
  if(canMove()&&moving()){if(!frame){canvas.dataset.atmosphere='running';frame=requestAnimationFrame(tick);}}
  else stop();
 };
 const measure=()=>{
  if(!scene||disposed||lost)return;
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,rect.width<768?1.25:1.5);
  scene.resize(Math.max(1,rect.width),Math.max(1,rect.height),dpr);draw();
 };
 const move=(event:PointerEvent)=>{
  if(event.pointerType==='touch'||preference.matches)return;
  const rect=host.getBoundingClientRect();
  targetX=Math.max(-1,Math.min(1,((event.clientX-rect.left)/Math.max(rect.width,1)-.5)*2));
  targetY=Math.max(-1,Math.min(1,((event.clientY-rect.top)/Math.max(rect.height,1)-.5)*2));sync();
 };
 const leave=()=>{targetX=targetY=0;sync();};
 const resume=()=>{draw();sync();};
 const beforePrint=()=>{printing=true;sync();};
 const afterPrint=()=>{printing=false;resume();};
 const reduced=()=>{if(preference.matches){pointerX=pointerY=targetX=targetY=0;draw();}sync();};
 const contextLost=(event:Event)=>{event.preventDefault();lost=true;canvas.style.opacity='0';canvas.dataset.atmosphere='fallback';stop();};
 const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);
 const intersection=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);resume();},{threshold:.01});
 const theme=typeof MutationObserver==='undefined'?null:new MutationObserver(draw);
 const cleanup=()=>{
  disposed=true;controller.abort();stop();resize?.disconnect();intersection?.disconnect();theme?.disconnect();
  if(!resize)window.removeEventListener('resize',measure);
  host.removeEventListener('pointermove',move as EventListener);host.removeEventListener('pointerleave',leave);
  canvas.removeEventListener('webglcontextlost',contextLost);
  document.removeEventListener('visibilitychange',resume);preference.removeEventListener('change',reduced);
  window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);
  scene?.dispose();scene=null;
 };
 const fail=()=>{cleanup();canvas.style.opacity='0';canvas.dataset.atmosphere='fallback';};
 resize?.observe(host);intersection?.observe(canvas);theme?.observe(document.documentElement,{attributes:true,attributeFilter:['data-color-mode']});
 if(!resize)window.addEventListener('resize',measure);
 if(!intersection)visible=true;
 host.addEventListener('pointermove',move as EventListener,{passive:true});host.addEventListener('pointerleave',leave);
 canvas.addEventListener('webglcontextlost',contextLost);
 document.addEventListener('visibilitychange',resume);preference.addEventListener('change',reduced);
 window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
 void createScene(canvas,controller.signal).then(loaded=>{
  if(disposed){loaded.dispose();return;}
  scene=loaded;canvas.dataset.atmosphere=lost?'fallback':'paused';measure();sync();
 }).catch(()=>{if(!disposed)fail();});
 return cleanup;
}

export function V2Atmosphere(){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>canvas.current?mountV2Atmosphere(canvas.current):undefined,[]);
 return <canvas ref={canvas} className="v2-atmosphere" aria-hidden="true" style={{display:'block',width:'100%',height:'100%'}}/>;
}
