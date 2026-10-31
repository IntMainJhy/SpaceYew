'use client';

import {useEffect,useRef,useState} from 'react';
import {Icon} from './Icons';

/** A recording of the actual public Skill directory, loaded only beside the viewport. */
export function HomeStoryVideo({src,poster,label,pauseLabel,playLabel}:{src:string;poster:string;label:string;pauseLabel:string;playLabel:string}){
 const host=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null);
 const [enabled,setEnabled]=useState(false),[visible,setVisible]=useState(false),[hidden,setHidden]=useState(false),[reduced,setReduced]=useState(true),[paused,setPaused]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  const preference=matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>setReduced(preference.matches),visibility=()=>setHidden(document.hidden);motion();visibility();
  const nearby=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setEnabled(true);nearby.disconnect();}},{rootMargin:'200px'}),viewport=new IntersectionObserver(entries=>setVisible(entries.some(entry=>entry.isIntersecting)),{threshold:.05});
  nearby.observe(element);viewport.observe(element);preference.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);
  return()=>{nearby.disconnect();viewport.disconnect();preference.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{
  const element=video.current;if(!element)return;
  if(enabled&&visible&&!hidden&&!reduced&&!paused&&!failed){void element.play().catch(()=>{});}else element.pause();
  return()=>element.pause();
 },[enabled,visible,hidden,reduced,paused,failed]);
 return <div ref={host} className="home-story-video" data-ready={ready&&!failed&&!reduced?'true':'false'}>
  <img src={poster} alt={label} width={1200} height={900} loading="lazy" decoding="async"/>
  {enabled&&!failed&&<video ref={video} src={src} poster={poster} muted loop playsInline preload="metadata" aria-hidden="true" onLoadedData={()=>setReady(true)} onError={()=>setFailed(true)}/>}
  {ready&&!failed&&!reduced&&<button type="button" className="home-media-pause" aria-label={paused?playLabel:pauseLabel} aria-pressed={paused} onClick={()=>setPaused(value=>!value)}><Icon name={paused?'play':'pause'}/></button>}
 </div>;
}
