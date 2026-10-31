'use client';

import {useEffect,useRef} from 'react';
import type {GlassReveal,HomeGlassScene} from '@/lib/home-glass';

const loadScene=(canvas:HTMLCanvasElement,signal:AbortSignal)=>import('@/lib/home-glass').then(module=>module.createHomeGlass(canvas,signal));

/** Load the homepage-only renderer without blocking the semantic content. */
export function mountV2Atmosphere(canvas:HTMLCanvasElement,createScene=loadScene,{mode='home'}:{mode?:'home'|'interior'}={}){
 const surface=canvas.parentElement||canvas,host=canvas.closest(mode==='home'?'.v2-home':'.v2-site')||surface,preference=window.matchMedia('(prefers-reduced-motion: reduce)'),controller=new AbortController();
 const revealElements=new Set<HTMLElement>();
 let reducedMotion=preference.matches;
 let scene:HomeGlassScene|null=null,frame=0,lastDraw=0,nextDraw=0,activeTime=0,visible=false,printing=false,lost=false,disposed=false;
 let quality=1,slowFrames=0,drawCount=0,sizedWidth=0,sizedHeight=0,sizedDpr=0;
 let targetX=0,targetY=0,pointerX=0,pointerY=0,progress=0,dirty=false,revealsDirty=true;
 canvas.dataset.atmosphere='loading';canvas.style.opacity='0';
 const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;if(scene?.animated){lastDraw=0;nextDraw=0;}if(scene)canvas.dataset.atmosphere=lost?'fallback':'paused';};
 const draw=()=>{
  if(!scene||disposed||lost||document.hidden||printing||!visible)return;
  try{
   if(revealsDirty){readReveals();revealsDirty=false;}
   const dark=document.documentElement.dataset.colorMode==='dark';
   if(scene.animated)scene.render(pointerX,pointerY,dark,progress,reducedMotion,activeTime);
   else scene.render(pointerX,pointerY,dark,progress,reducedMotion);
   const overlay=mode==='home'&&!reducedMotion?Number(canvas.dataset.glassOverlay)||0:0;
   if(overlay>0)surface.style.setProperty('--glass-overlay',overlay.toFixed(3));else surface.style.removeProperty('--glass-overlay');
   if(overlay>.99)surface.dataset.glassOverlay='true';else delete surface.dataset.glassOverlay;
   canvas.style.opacity='1';
  }
  catch{fail();}
 };
 const canRender=()=>!disposed&&!lost&&!!scene&&visible&&!document.hidden&&!printing;
 const continuous=()=>!!scene?.animated&&!reducedMotion;
 const moving=()=>!reducedMotion&&Math.abs(targetX-pointerX)+Math.abs(targetY-pointerY)>.0001;
 const tick=(now:number)=>{
  frame=0;if(!canRender())return;
  const interval=1000/(continuous()&&!dirty&&!moving()?15:30);
  if(!lastDraw||now+.5>=nextDraw){
   const elapsed=lastDraw?(now-lastDraw)/1000:1/30,amount=1-Math.exp(-7*Math.min(elapsed,.05));
   if(continuous())activeTime+=Math.min(elapsed,.25);
   if(scene?.animated&&++drawCount>12){
    slowFrames=elapsed>Math.max(.08,interval/1000*1.8)?slowFrames+1:0;
    if(slowFrames>=6&&quality>.85){quality=.85;slowFrames=0;measure();}
   }
   nextDraw=nextDraw?nextDraw+interval*(Math.floor(Math.max(0,now-nextDraw)/interval)+1):now+interval;
   lastDraw=now;pointerX+=(targetX-pointerX)*amount;pointerY+=(targetY-pointerY)*amount;dirty=false;draw();
  }
  if(canRender()&&(dirty||moving()||continuous()))frame=requestAnimationFrame(tick);else stop();
 };
 const sync=()=>{
  if(canRender()&&(dirty||moving()||continuous())){if(!frame){canvas.dataset.atmosphere='running';frame=requestAnimationFrame(tick);}}
  else stop();
 };
 const clearReveals=()=>{for(const element of revealElements){delete element.dataset.glassMotion;for(const property of['--glass-reveal','--glass-lift','--glass-tilt'])element.style.removeProperty(property);}revealElements.clear();scene?.setReveals?.([]);};
 const clearOverlay=()=>{delete surface.dataset.glassOverlay;surface.style.removeProperty('--glass-overlay');delete canvas.dataset.glassOverlay;};
 const readReveals=()=>{
  if(!scene)return;if(reducedMotion){clearReveals();return;}
  const viewport=canvas.getBoundingClientRect(),panels:GlassReveal[]=[];
  for(const element of Array.from(host.querySelectorAll?.<HTMLElement>('[data-glass-reveal]')||[])){
   const rect=element.getBoundingClientRect(),raw=Math.max(0,Math.min(1,(viewport.height-(rect.top-viewport.top))/(viewport.height*.62+Math.min(rect.height,360)*.2))),open=raw*raw*(3-2*raw);
   revealElements.add(element);element.dataset.glassMotion='active';element.style.setProperty('--glass-reveal',open.toFixed(4));element.style.setProperty('--glass-lift',((1-open)*34).toFixed(2)+'px');element.style.setProperty('--glass-tilt',((1-open)*3.5).toFixed(2)+'deg');
   if(raw>.015&&raw<.985&&rect.bottom>viewport.top&&rect.top<viewport.top+viewport.height)panels.push({left:rect.left-viewport.left,top:rect.top-viewport.top,width:rect.width,height:rect.height,progress:raw,variant:element.dataset.glassReveal});
  }
  scene.setReveals?.(panels.slice(0,2));
 };
 const readProgress=()=>{const height=Math.max(canvas.getBoundingClientRect().height,1);progress=mode==='interior'?1.05+Math.max(0,window.scrollY||0)/height:Math.max(0,-host.getBoundingClientRect().top/height);revealsDirty=true;};
 const scroll=()=>{readProgress();dirty=true;sync();};
 const measure=()=>{
  if(!scene||disposed||lost)return;
  try{
   const rect=canvas.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height),mobile=width<768;
   const dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt((mobile?3000000:8000000)/(width*height)))*quality;
   if(width!==sizedWidth||height!==sizedHeight||dpr!==sizedDpr){scene.resize(width,height,dpr);sizedWidth=width;sizedHeight=height;sizedDpr=dpr;}
   if(mode==='home'){
    const header=canvas.closest('.v2-site')?.querySelector?.<HTMLElement>('.organic-header'),brand=header?.querySelector<HTMLElement>('.organic-brand'),tools=header?.querySelector<HTMLElement>('.organic-header-tools');
    if(header&&brand&&tools){const a=brand.getBoundingClientRect(),b=tools.getBoundingClientRect(),bar=header.getBoundingClientRect();scene.setHeaderDock?.({x:(a.right+b.left)*.5-rect.left,y:bar.top+bar.height*.5-rect.top,width:Math.max(0,b.left-a.right-20)});}
    else scene.setHeaderDock?.(null);
   }
   readProgress();draw();
  }catch{fail();}
 };
 const move=(event:PointerEvent)=>{
  if(event.pointerType==='touch'||reducedMotion)return;
  const rect=canvas.getBoundingClientRect();
  targetX=Math.max(-1,Math.min(1,((event.clientX-rect.left)/Math.max(rect.width,1)-.5)*2));
  targetY=Math.max(-1,Math.min(1,((event.clientY-rect.top)/Math.max(rect.height,1)-.5)*2));sync();
 };
 const leave=()=>{targetX=targetY=0;sync();};
 const resume=()=>{draw();sync();};
 const beforePrint=()=>{printing=true;sync();};
 const afterPrint=()=>{printing=false;resume();};
 const reduced=(event?:MediaQueryListEvent)=>{reducedMotion=typeof event?.matches==='boolean'?event.matches:preference.matches;if(reducedMotion){pointerX=pointerY=targetX=targetY=0;clearReveals();clearOverlay();draw();}else readReveals();sync();};
 const contextLost=(event:Event)=>{event.preventDefault();lost=true;fail();};
 const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);
 const intersection=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);resume();},{threshold:.01});
 const theme=typeof MutationObserver==='undefined'?null:new MutationObserver(draw);
 const cleanup=()=>{
  if(disposed)return;
  disposed=true;controller.abort();stop();clearReveals();clearOverlay();resize?.disconnect();intersection?.disconnect();theme?.disconnect();
  if(!resize)window.removeEventListener('resize',measure);
  host.removeEventListener('pointermove',move as EventListener);host.removeEventListener('pointerleave',leave);
  canvas.removeEventListener('webglcontextlost',contextLost);
  document.removeEventListener('visibilitychange',resume);preference.removeEventListener('change',reduced);
  window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);
  window.removeEventListener('scroll',scroll);
  scene?.dispose();scene=null;
 };
 const fail=()=>{cleanup();canvas.style.opacity='0';canvas.dataset.atmosphere='fallback';};
 resize?.observe(surface);intersection?.observe(canvas);theme?.observe(document.documentElement,{attributes:true,attributeFilter:['data-color-mode']});
 if(!resize)window.addEventListener('resize',measure);
 if(!intersection)visible=true;
 host.addEventListener('pointermove',move as EventListener,{passive:true});host.addEventListener('pointerleave',leave);
 canvas.addEventListener('webglcontextlost',contextLost);
 document.addEventListener('visibilitychange',resume);preference.addEventListener('change',reduced);
 window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
 window.addEventListener('scroll',scroll,{passive:true});
 void createScene(canvas,controller.signal).then(loaded=>{
  if(disposed){loaded.dispose();return;}
  scene=loaded;scene.setCollectionOverlay?.(mode==='home');canvas.dataset.atmosphere=lost?'fallback':'paused';measure();sync();
 }).catch(()=>{if(!disposed)fail();});
 return cleanup;
}

export function V2Atmosphere({mode='home'}:{mode?:'home'|'interior'}={}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>canvas.current?mountV2Atmosphere(canvas.current,loadScene,{mode}):undefined,[mode]);
 return <canvas ref={canvas} className="v2-atmosphere" aria-hidden="true" style={{display:'block',width:'100%',height:'100%'}}/>;
}
