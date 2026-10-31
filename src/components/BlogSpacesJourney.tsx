'use client';

import {useEffect,useRef} from 'react';
import {useRouter} from 'next/navigation';
import type {BlogSpacesScene} from '@/lib/blog-spaces-scene';

export type BlogSpacePreview={handle:string;name:string;intro:string;avatarId:string;coverId:string;href:string;projectTitle?:string;projectSummary?:string};
type Labels={open:string;skip:string};

export function BlogSpacesJourney({spaces,labels}:{spaces:BlogSpacePreview[];labels:Labels}){
 const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),open=useRef<HTMLAnchorElement>(null),router=useRouter();
 useEffect(()=>{
  const element=host.current,surface=canvas.current,opening=element?.parentElement;if(!element||!surface||!opening||!spaces.length)return;
  const preference=matchMedia('(prefers-reduced-motion: reduce)'),controller=new AbortController(),controls=element.querySelector<HTMLElement>('.blog-spaces-journey-controls');
  let engine:BlogSpacesScene|null=null,loading=false,frame=0,lastDraw=0,visible=false,disposed=false,printing=false,lost=false,dirty=true,progress=0,x=0,y=0,targetX=0,targetY=0,downX=0,downY=0,selected=-1,navigationInset=parseFloat(getComputedStyle(element).getPropertyValue('--blog-space-header-inset'))||0;
  const staticView=()=>preference.matches||printing;
  const controlVisibility=()=>{const shown=visible&&progress<.94&&!disposed;element.dataset.controls=shown?'visible':'hidden';if(controls){controls.inert=!shown;controls.setAttribute('aria-hidden',String(!shown));}};
  const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;lastDraw=0;};
  const canDraw=()=>!!engine&&!disposed&&!lost&&!document.hidden&&visible&&!staticView();
  const select=(index:number)=>{if(index===selected)return;selected=index;const space=spaces[index];if(open.current&&space){open.current.href=space.href;open.current.textContent=labels.open+' · '+space.name;}};
  const draw=()=>{if(!canDraw())return;try{select(engine!.render(progress,x,y,false));}catch{fail();}};
  const moving=()=>Math.abs(targetX-x)+Math.abs(targetY-y)>.0005;
  const tick=(now:number)=>{
   frame=0;if(!canDraw())return;
   const dt=Math.min(lastDraw?(now-lastDraw)/1000:1/60,.08),amount=1-Math.exp(-8*dt);x+=(targetX-x)*amount;y+=(targetY-y)*amount;dirty=false;draw();lastDraw=now;
   if(canDraw()&&(dirty||moving()))frame=requestAnimationFrame(tick);
  };
  const sync=()=>{if(canDraw()&&(dirty||moving())){if(!frame)frame=requestAnimationFrame(tick);}else stop();};
  // The scene extends behind navigation; retain the original below-header scroll timing.
  const read=()=>{const rect=opening.getBoundingClientRect(),travel=Math.max(1,rect.height-element.clientHeight+navigationInset);progress=Math.max(0,Math.min(1,-rect.top/travel));opening.style.setProperty('--blog-journey-progress',String(progress));controlVisibility();dirty=true;sync();};
  // Keep high-DPI fill cost within a 120Hz budget; the readable texture and MSAA stay intact.
  const resize=()=>{navigationInset=parseFloat(getComputedStyle(element).getPropertyValue('--blog-space-header-inset'))||0;if(!engine||disposed||staticView())return;try{const rect=element.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height),dpr=Math.min(devicePixelRatio||1,2,Math.sqrt((width<768?1500000:3000000)/(width*height)));engine.resize(width,height,dpr);read();draw();}catch{fail();}};
  const move=(event:PointerEvent)=>{if(event.pointerType==='touch'||staticView())return;const rect=element.getBoundingClientRect();targetX=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));targetY=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));sync();};
  const leave=()=>{targetX=targetY=0;sync();};
  const down=(event:PointerEvent)=>{downX=event.clientX;downY=event.clientY;};
  const up=(event:PointerEvent)=>{if(event.target!==surface||event.button!==0||event.ctrlKey||event.metaKey||Math.hypot(event.clientX-downX,event.clientY-downY)>8||!engine)return;const rect=surface.getBoundingClientRect(),href=engine.pick((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);if(href)router.push(href);};
  const pause=()=>{if(document.hidden)stop();else{dirty=true;sync();}};
  const updatePreference=()=>{opening.dataset.journey=staticView()?'static':engine?'ready':'loading';if(staticView()){stop();opening.style.setProperty('--blog-journey-progress','0');}else{load();resize();read();}};
  const beforePrint=()=>{printing=true;updatePreference();},afterPrint=()=>{printing=false;updatePreference();};
  const contextLost=(event:Event)=>{event.preventDefault();lost=true;fail();};
  const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);controlVisibility();if(visible){dirty=true;draw();sync();}else stop();},{threshold:.01}),bounds=new ResizeObserver(resize);
  const cleanup=()=>{if(disposed)return;disposed=true;stop();controller.abort();observer.disconnect();bounds.disconnect();preference.removeEventListener('change',updatePreference);window.removeEventListener('scroll',read);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',pause);window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);surface.removeEventListener('pointerdown',down);surface.removeEventListener('pointerup',up);surface.removeEventListener('webglcontextlost',contextLost);engine?.dispose();};
  const fail=()=>{cleanup();controlVisibility();opening.dataset.journey='fallback';surface.style.opacity='0';opening.style.setProperty('--blog-journey-progress','0');};
  function load(){if(loading||engine||disposed)return;loading=true;void import('@/lib/blog-spaces-scene').then(module=>module.createBlogSpacesScene(surface!,spaces,controller.signal,()=>{dirty=true;sync();})).then(scene=>{if(disposed){scene.dispose();return;}engine=scene;surface!.style.opacity='1';updatePreference();}).catch(()=>{if(!disposed)fail();});}
  observer.observe(element);bounds.observe(element);preference.addEventListener('change',updatePreference);window.addEventListener('scroll',read,{passive:true});window.addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',pause);window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);element.addEventListener('pointermove',move,{passive:true});element.addEventListener('pointerleave',leave);surface.addEventListener('pointerdown',down,{passive:true});surface.addEventListener('pointerup',up);surface.addEventListener('webglcontextlost',contextLost);updatePreference();
  // Reduced-motion visitors get the real static preview and directory without loading a GPU scene.
  return cleanup;
 },[spaces,labels.open,router]);
 const first=spaces[0];
 return <div ref={host} className="blog-spaces-journey">
  <canvas ref={canvas} aria-hidden="true"/>
  {first&&<div className="blog-spaces-static-preview" aria-hidden="true">{first.coverId&&<img src={'/media/'+encodeURIComponent(first.coverId)} alt="" width={800} height={500}/>}<strong>{first.name}</strong><span>@{first.handle}</span><p>{first.intro}</p></div>}
  <div className="blog-spaces-journey-controls"><a href="#blog-spaces-directory">{labels.skip}</a>{first&&<a ref={open} className="blog-spaces-current" href={first.href}>{labels.open+' · '+first.name}</a>}</div>
 </div>;
}
