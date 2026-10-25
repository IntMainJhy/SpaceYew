'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Icon} from './Icons';
// The original semantic list is always available. Duplicates are visual only.
export function BlogMotionSkills({skills,enabled,pauseLabel,playLabel}:{skills:string[];enabled:boolean;pauseLabel:string;playLabel:string}){
 const root=useRef<HTMLDivElement>(null),[paused,setPaused]=useState(false),[running,setRunning]=useState(false);
 useEffect(()=>{
  const el=root.current;if(!el||!enabled)return;
  const doc=el.ownerDocument,win=doc.defaultView;if(!win)return;
  const preference=win.matchMedia('(prefers-reduced-motion: reduce)');let visible=false;
  const sync=()=>setRunning(visible&&!doc.hidden&&!preference.matches);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{threshold:.1});observer.observe(el);
  doc.addEventListener('visibilitychange',sync);preference.addEventListener('change',sync);
  return()=>{observer.disconnect();doc.removeEventListener('visibilitychange',sync);preference.removeEventListener('change',sync)};
 },[enabled]);
 const active=enabled&&skills.length>1;
 return <div ref={root} className="blog-skill-motion" data-marquee={active} data-running={running&&!paused} style={{'--marquee-duration':Math.max(24,skills.join('').length/5)+'s'} as CSSProperties}>
  {active&&<button type="button" className="blog-marquee-toggle" aria-label={paused?playLabel:pauseLabel} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}><Icon name={paused?'play':'pause'}/><span>{paused?playLabel:pauseLabel}</span></button>}
  <div className="blog-marquee-window"><div className="blog-marquee-track"><ul className="anx-skills">{skills.map((skill,i)=><li key={i}>{skill}</li>)}</ul>{active&&<ul className="anx-skills blog-marquee-copy" aria-hidden="true">{skills.map((skill,i)=><li key={i}>{skill}</li>)}</ul>}</div></div>
 </div>;
}
