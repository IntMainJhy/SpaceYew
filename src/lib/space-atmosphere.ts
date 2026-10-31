import type {HomeGlassScene} from './home-glass';

/** Owns the cinematic stage; native page scrolling remains the source of truth. */
export function mountSpaceAtmosphere(canvas:HTMLCanvasElement,createScene:(canvas:HTMLCanvasElement,signal:AbortSignal)=>Promise<HomeGlassScene>){
 const host=canvas.closest<HTMLElement>('.v2-home')!,surface=canvas.parentElement!,journey=host.querySelector<HTMLElement>('.v2-space-journey')!,viewport=host.querySelector<HTMLElement>('.v2-space-viewport')!,copy=host.querySelector<HTMLElement>('.v2-hero-copy');
 const preference=window.matchMedia('(prefers-reduced-motion: reduce)'),controller=new AbortController();
 let scene:HomeGlassScene|null=null,frame=0,lastDraw=0,elapsed=0,visible=false,printing=false,disposed=false,ready=false,compact=true,failed=false;
 let x=0,y=0,targetX=0,targetY=0,progress=0,focus=false,lastState='',scrollAnchor=window.scrollY;
 let down:{id:number;x:number;y:number;lastX:number;lastY:number;scroll:number;dragged:boolean;touch:boolean}|null=null;
 const clamp=(n:number)=>Math.max(0,Math.min(1,n));
 const state=()=>{
  const phase=progress<.24?'far':progress<.82?'belt':'near';
  host.dataset.journeyFailed=String(failed);host.dataset.journeyReady=String(ready);host.dataset.journeyCompact=String(compact);host.dataset.journeyFocus=String(focus);host.dataset.journeyPhase=phase;
  const key=[ready,compact,focus,phase,failed].join(':');
  if(key!==lastState){lastState=key;window.dispatchEvent(new CustomEvent('spaceyew-space-state',{detail:{ready,compact,focus,phase,failed}}));}
 };
 const restoreCopy=()=>{if(copy){copy.inert=false;copy.removeAttribute('aria-hidden');}host.style.setProperty('--space-copy','1');};
 const readProgress=()=>{
  const rect=journey.getBoundingClientRect(),height=canvas.getBoundingClientRect().height;
  progress=compact||preference.matches?0:clamp(-rect.top/Math.max(1,rect.height-height));
  host.style.setProperty('--space-progress',String(progress));
  const fade=1-clamp((progress-.08)/.14),hidden=fade<=.01&&!compact&&!printing;
  host.style.setProperty('--space-copy',String(printing?1:fade));
  if(copy){copy.inert=hidden;if(hidden)copy.setAttribute('aria-hidden','true');else copy.removeAttribute('aria-hidden');}
  state();
 };
 const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;lastDraw=0;if(scene)canvas.dataset.atmosphere='paused';};
 const canRender=()=>!disposed&&!!scene&&visible&&!document.hidden&&!printing;
 const draw=()=>{
  if(!canRender())return;
  try{scene!.render(x,y,document.documentElement.dataset.colorMode==='dark',progress,preference.matches,elapsed);canvas.style.opacity='1';
   const next=canvas.dataset.spaceFocus==='true';if(next!==focus){focus=next;state();}
  }catch{fail();}
 };
 const tick=(now:number)=>{
  frame=0;if(!canRender())return;
  if(!lastDraw||now-lastDraw>=1000/30){
   const dt=Math.min(lastDraw?(now-lastDraw)/1000:1/30,.05);lastDraw=now;
   if(!preference.matches){elapsed+=dt;const a=1-Math.exp(-7*dt);x+=(targetX-x)*a;y+=(targetY-y)*a;}
   draw();
  }
  if(canRender()&&!preference.matches)frame=requestAnimationFrame(tick);else stop();
 };
 const sync=()=>{if(canRender()&&!preference.matches){if(!frame){canvas.dataset.atmosphere='running';frame=requestAnimationFrame(tick);}}else stop();};
 const reset=()=>{scene?.resetFocus?.();focus=false;host.dataset.journeyDragging='false';state();};
 const scroll=()=>{if(Math.abs(window.scrollY-scrollAnchor)>12){cancel();reset();scrollAnchor=window.scrollY;}readProgress();if(preference.matches)draw();sync();};
 const measure=()=>{
  if(!scene||disposed)return;
  try{const rect=canvas.getBoundingClientRect();scene.resize(Math.max(1,rect.width),Math.max(1,rect.height),Math.min(window.devicePixelRatio||1,rect.width<768?1.25:1.5));readProgress();draw();sync();}catch{fail();}
 };
 const resume=()=>{draw();sync();};
 const interactive=(target:EventTarget|null)=>(target as Element|null)?.closest?.('a,button,input,textarea,select,summary,[role=button],[contenteditable=true]');
 const inside=(event:PointerEvent)=>{const r=viewport.getBoundingClientRect();return event.clientY>=r.top&&event.clientY<=r.bottom&&event.clientX>=r.left&&event.clientX<=r.right&&journey.getBoundingClientRect().bottom>0;};
 const move=(event:PointerEvent)=>{
  if(preference.matches||event.pointerType==='touch'||!inside(event))return;
  const r=canvas.getBoundingClientRect();targetX=Math.max(-1,Math.min(1,2*(event.clientX-r.left)/r.width-1));targetY=Math.max(-1,Math.min(1,2*(event.clientY-r.top)/r.height-1));
  if(down&&event.pointerId===down.id&&!down.touch){
   if(Math.hypot(event.clientX-down.x,event.clientY-down.y)>8)down.dragged=true;
   if(down.dragged){scene?.drag?.((event.clientX-down.lastX)/r.width,(event.clientY-down.lastY)/r.height);host.dataset.journeyDragging='true';}
   down.lastX=event.clientX;down.lastY=event.clientY;
  }
  sync();
 };
 const pointerDown=(event:PointerEvent)=>{
  if(!ready||compact||preference.matches||interactive(event.target)||!inside(event)||event.button!==0)return;
  scrollAnchor=window.scrollY;
  down={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,scroll:window.scrollY,dragged:false,touch:event.pointerType==='touch'};
  if(!down.touch)viewport.setPointerCapture?.(event.pointerId);
 };
 const cancel=()=>{if(down&&viewport.hasPointerCapture?.(down.id))viewport.releasePointerCapture(down.id);down=null;host.dataset.journeyDragging='false';};
 const pointerUp=(event:PointerEvent)=>{
  const start=down;if(!start||start.id!==event.pointerId)return;
  const tap=!start.dragged&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<8&&Math.abs(window.scrollY-start.scroll)<8;
  cancel();if(!tap||interactive(event.target)||!inside(event))return;
  const r=canvas.getBoundingClientRect();focus=scene?.activate?.(2*(event.clientX-r.left)/r.width-1,1-2*(event.clientY-r.top)/r.height)||false;
  scrollAnchor=window.scrollY;state();sync();
 };
 const leave=()=>{targetX=targetY=0;};
 const command=(event:Event)=>{
  const action=(event as CustomEvent).detail;
  if(action==='reset'){reset();sync();}
  if(action==='focus'&&ready&&!compact&&!preference.matches){focus=scene?.focusNearest?.()||false;scrollAnchor=window.scrollY;state();sync();}
  if(action==='start'&&scene&&!preference.matches){compact=false;state();window.scrollTo({top:window.scrollY+journey.getBoundingClientRect().top,behavior:'smooth'});measure();}
 };
 const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){cancel();reset();sync();}};
 const reduced=()=>{x=y=targetX=targetY=0;reset();if(preference.matches)compact=true;state();measure();sync();};
 const beforePrint=()=>{printing=true;restoreCopy();sync();};
 const afterPrint=()=>{printing=false;readProgress();measure();};
 const resize=new ResizeObserver(measure),intersection=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);resume();},{threshold:0});
 const theme=new MutationObserver(draw);
 const cleanup=()=>{
  if(disposed)return;disposed=true;controller.abort();stop();cancel();resize.disconnect();intersection.disconnect();theme.disconnect();restoreCopy();
  host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);viewport.removeEventListener('pointerdown',pointerDown);viewport.removeEventListener('pointerup',pointerUp);viewport.removeEventListener('pointercancel',cancel);viewport.removeEventListener('lostpointercapture',cancel);
  window.removeEventListener('scroll',scroll);window.removeEventListener('keydown',key);window.removeEventListener('spaceyew-space-command',command);window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);
  document.removeEventListener('visibilitychange',resume);preference.removeEventListener('change',reduced);canvas.removeEventListener('webglcontextlost',contextLost);
  scene?.dispose();scene=null;
 };
 const fail=()=>{cleanup();failed=true;ready=false;compact=true;focus=false;state();canvas.style.opacity='0';canvas.dataset.atmosphere='fallback';};
 const contextLost=(event:Event)=>{event.preventDefault();fail();};
 canvas.dataset.atmosphere='loading';canvas.style.opacity='0';state();restoreCopy();
 resize.observe(surface);resize.observe(journey);intersection.observe(journey);theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-color-mode']});
 host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);viewport.addEventListener('pointerdown',pointerDown);viewport.addEventListener('pointerup',pointerUp);viewport.addEventListener('pointercancel',cancel);viewport.addEventListener('lostpointercapture',cancel);
 window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('keydown',key);window.addEventListener('spaceyew-space-command',command);window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
 document.addEventListener('visibilitychange',resume);preference.addEventListener('change',reduced);canvas.addEventListener('webglcontextlost',contextLost);
 void createScene(canvas,controller.signal).then(loaded=>{
  if(disposed){loaded.dispose();return;}
  scene=loaded;ready=true;
  compact=preference.matches||journey.getBoundingClientRect().top<-.25*canvas.getBoundingClientRect().height;
  state();canvas.dataset.atmosphere='paused';measure();sync();
 }).catch(()=>{if(!disposed)fail();});
 return cleanup;
}
