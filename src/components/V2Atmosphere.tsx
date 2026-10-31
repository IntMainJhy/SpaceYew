'use client';

import {useEffect,useRef} from 'react';
import {mountSpaceAtmosphere} from '@/lib/space-atmosphere';
import type {HomeGlassScene} from '@/lib/home-glass';

export type HomeSceneKind='space'|'moon'|'glass';
const loadSpace=(canvas:HTMLCanvasElement,signal:AbortSignal)=>import('@/lib/home-space').then(module=>module.createHomeSpace(canvas,signal));
const loadMoon=(canvas:HTMLCanvasElement,signal:AbortSignal)=>import('@/lib/home-moon').then(module=>module.createHomeMoon(canvas,signal));
const loadGlass=(canvas:HTMLCanvasElement,signal:AbortSignal)=>import('@/lib/home-glass').then(module=>module.createHomeGlass(canvas,signal));

/** Load the homepage-only renderer without blocking the semantic content. */
export function mountV2Atmosphere(canvas:HTMLCanvasElement,createScene=loadMoon,kind:HomeSceneKind='moon'){
 if(kind==='space')return mountSpaceAtmosphere(canvas,createScene);
 const surface=canvas.parentElement||canvas,host=canvas.closest('.v2-home')||surface,preference=window.matchMedia('(prefers-reduced-motion: reduce)'),controller=new AbortController();
 let scene:HomeGlassScene|null=null,frame=0,lastDraw=0,visible=false,printing=false,lost=false,disposed=false;
 let targetX=0,targetY=0,pointerX=0,pointerY=0,progress=0,dirty=false;
 canvas.dataset.atmosphere='loading';canvas.style.opacity='0';
 const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;if(scene)canvas.dataset.atmosphere=lost?'fallback':'paused';};
 const draw=()=>{
  if(!scene||disposed||lost||document.hidden||printing||!visible)return;
  try{
   const dark=document.documentElement.dataset.colorMode==='dark',reading=Math.max(0,Math.min(1,(progress-(kind==='moon'?.55:.18))/(kind==='moon'?.7:.52)));
   scene.render(pointerX,pointerY,dark,progress,preference.matches);
   const fade=kind==='moon'?(dark?.55:.5):(dark?.8:.45);
   canvas.style.opacity=String(1-fade*reading*reading*(3-2*reading));
  }
  catch{fail();}
 };
 const canRender=()=>!disposed&&!lost&&!!scene&&visible&&!document.hidden&&!printing;
 const moving=()=>!preference.matches&&Math.abs(targetX-pointerX)+Math.abs(targetY-pointerY)>.0001;
 const tick=(now:number)=>{
  frame=0;if(!canRender())return;
  if(!lastDraw||now-lastDraw>=1000/30){
   const amount=1-Math.exp(-7*Math.min(lastDraw?(now-lastDraw)/1000:1/30,.05));
   lastDraw=now;pointerX+=(targetX-pointerX)*amount;pointerY+=(targetY-pointerY)*amount;dirty=false;draw();
  }
  if(canRender()&&(dirty||moving()))frame=requestAnimationFrame(tick);else stop();
 };
 const sync=()=>{
  if(canRender()&&(dirty||moving())){if(!frame){canvas.dataset.atmosphere='running';frame=requestAnimationFrame(tick);}}
  else stop();
 };
 const readProgress=()=>{progress=Math.max(0,-host.getBoundingClientRect().top/Math.max(canvas.getBoundingClientRect().height,1));};
 const scroll=()=>{readProgress();dirty=true;sync();};
 const measure=()=>{
  if(!scene||disposed||lost)return;
  try{
   const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,rect.width<768?1.25:1.5);
   scene.resize(Math.max(1,rect.width),Math.max(1,rect.height),dpr);readProgress();draw();
  }catch{fail();}
 };
 const move=(event:PointerEvent)=>{
  if(event.pointerType==='touch'||preference.matches)return;
  const rect=canvas.getBoundingClientRect();
  targetX=Math.max(-1,Math.min(1,((event.clientX-rect.left)/Math.max(rect.width,1)-.5)*2));
  targetY=Math.max(-1,Math.min(1,((event.clientY-rect.top)/Math.max(rect.height,1)-.5)*2));sync();
 };
 const leave=()=>{targetX=targetY=0;sync();};
 const resume=()=>{draw();sync();};
 const beforePrint=()=>{printing=true;sync();};
 const afterPrint=()=>{printing=false;resume();};
 const reduced=()=>{if(preference.matches){pointerX=pointerY=targetX=targetY=0;draw();}sync();};
 const contextLost=(event:Event)=>{event.preventDefault();lost=true;fail();};
 const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);
 const intersection=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);resume();},{threshold:.01});
 const theme=typeof MutationObserver==='undefined'?null:new MutationObserver(draw);
 const cleanup=()=>{
  if(disposed)return;
  disposed=true;controller.abort();stop();resize?.disconnect();intersection?.disconnect();theme?.disconnect();
  if(!resize)window.removeEventListener('resize',measure);
  host.removeEventListener('pointermove',move as EventListener);host.removeEventListener('pointerleave',leave);
  canvas.removeEventListener('webglcontextlost',contextLost);
  document.removeEventListener('visibilitychange',resume);preference.removeEventListener('change',reduced);
  window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);
  window.removeEventListener('scroll',scroll);
  scene?.dispose();scene=null;
 };
 const fail=()=>{cleanup();canvas.style.opacity='0';canvas.dataset.atmosphere='fallback';};
 resize?.observe(surface);const copy=host.querySelector?.('.v2-hero-copy');if(copy)resize?.observe(copy);intersection?.observe(canvas);theme?.observe(document.documentElement,{attributes:true,attributeFilter:['data-color-mode']});
 if(!resize)window.addEventListener('resize',measure);
 if(!intersection)visible=true;
 host.addEventListener('pointermove',move as EventListener,{passive:true});host.addEventListener('pointerleave',leave);
 canvas.addEventListener('webglcontextlost',contextLost);
 document.addEventListener('visibilitychange',resume);preference.addEventListener('change',reduced);
 window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
 window.addEventListener('scroll',scroll,{passive:true});
 void createScene(canvas,controller.signal).then(loaded=>{
  if(disposed){loaded.dispose();return;}
  scene=loaded;canvas.dataset.atmosphere=lost?'fallback':'paused';measure();sync();
 }).catch(()=>{if(!disposed)fail();});
 return cleanup;
}

export function V2Atmosphere({initialScene='space'}:{initialScene?:HomeSceneKind}={}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const element=canvas.current;if(!element)return;
  let kind=initialScene,cleanup=()=>{};
  const mount=(next:HomeSceneKind)=>{
   cleanup();kind=next;
   const host=element.closest<HTMLElement>('.v2-home');if(host)host.dataset.scene=kind;
   cleanup=mountV2Atmosphere(element,kind==='space'?loadSpace:kind==='glass'?loadGlass:loadMoon,kind);
  };
  const change=(event:Event)=>{
   const next=(event as CustomEvent<unknown>).detail;
   if((next==='space'||next==='moon'||next==='glass')&&next!==kind)mount(next);
  };
  mount(initialScene);window.addEventListener('spaceyew-home-scene',change);
  return()=>{window.removeEventListener('spaceyew-home-scene',change);cleanup();};
 },[initialScene]);
 return <canvas ref={canvas} className="v2-atmosphere" aria-hidden="true" style={{display:'block',width:'100%',height:'100%'}}/>;
}
