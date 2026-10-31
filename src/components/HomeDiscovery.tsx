'use client';

import Link from 'next/link';
import {useEffect,useId,useRef,useState} from 'react';
import {Icon} from './Icons';
import type {mountHomeKinetic} from '@/lib/home-kinetic';
import '@/app/home-discovery.css';

export type DiscoveryItem={label:string;description:string;href:string;action:string};
export function HomeDiscovery({heading,hint,items,pauseLabel,playLabel}:{heading:string;hint:string;items:DiscoveryItem[];pauseLabel:string;playLabel:string}){
 const stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),controller=useRef<Awaited<ReturnType<typeof mountHomeKinetic>>|null>(null),selection=useRef(0),paused=useRef(false);
 const [active,setActive]=useState(0),[isPaused,setPaused]=useState(false),id=useId();
 useEffect(()=>{
  const host=stage.current,surface=canvas.current;if(!host||!surface)return;
  const abort=new AbortController();let started=false;
  const observer=new IntersectionObserver(entries=>{
   if(started||!entries.some(entry=>entry.isIntersecting))return;started=true;
   void import('@/lib/home-kinetic').then(module=>module.mountHomeKinetic(surface,host,abort.signal)).then(scene=>{
    if(abort.signal.aborted){scene.dispose();return;}controller.current=scene;scene.select(selection.current);scene.pause(paused.current);
   }).catch(()=>{if(!abort.signal.aborted)host.dataset.kinetic='fallback';});
  },{rootMargin:'200px'});observer.observe(host);
  return()=>{abort.abort();observer.disconnect();controller.current?.dispose();controller.current=null;};
 },[]);
 const select=(index:number)=>{selection.current=index;setActive(index);controller.current?.select(index);};
 const toggle=()=>{paused.current=!paused.current;setPaused(paused.current);controller.current?.pause(paused.current);};
 const item=items[active]||items[0];
 return <section className="home-discovery" aria-labelledby={id}>
  <div className="home-discovery-copy"><h2 id={id}>{heading}</h2><p>{hint}</p>
   <div className="home-discovery-choices">{items.map((entry,index)=><button type="button" key={entry.label} aria-pressed={index===active} onClick={()=>select(index)}>{entry.label}</button>)}</div>
   {item&&<div className="home-discovery-destination" aria-live="polite"><p>{item.description}</p><Link href={item.href}>{item.action}<Icon name="arrow"/></Link></div>}
  </div>
  <div ref={stage} className="home-discovery-stage"><canvas ref={canvas} aria-hidden="true"/><div className="home-discovery-fallback" aria-hidden="true"><i/><i/><i/></div><button type="button" className="home-discovery-pause" aria-label={isPaused?playLabel:pauseLabel} aria-pressed={isPaused} onClick={toggle}><Icon name={isPaused?'play':'pause'}/></button></div>
 </section>;
}
