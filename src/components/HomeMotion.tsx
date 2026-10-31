'use client';

import {useEffect,useRef} from 'react';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

/** Each section arrives in its own composition; the macOS stage keeps its existing motion. */
export function HomeMotion(){
 const anchor=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const root=anchor.current?.closest<HTMLElement>('.v2-home');
  if(!root)return;
  gsap.registerPlugin(ScrollTrigger);
  let active=true,refreshFrame=0;
  const refresh=()=>{
   if(!active||refreshFrame)return;
   refreshFrame=requestAnimationFrame(()=>{refreshFrame=0;if(active)ScrollTrigger.refresh();});
  };
  const media=gsap.matchMedia();
  const context=gsap.context(()=>{
   media.add({desktop:'(min-width: 761px)',mobile:'(max-width: 760px)',reduce:'(prefers-reduced-motion: reduce)'},match=>{
    const {desktop,reduce}=match.conditions!;
    if(reduce)return;
    const distance=desktop?32:16;
    for(const scene of root.querySelectorAll<HTMLElement>('[data-home-scene]')){
     // Browser history, anchor links and first-paint content must never disappear during setup.
     if(scene.getBoundingClientRect().top<window.innerHeight*.86)continue;
     const heading=scene.querySelector('.v2-section-heading');
     const timeline=gsap.timeline({
      defaults:{duration:.72,ease:'expo.out'},
      scrollTrigger:{trigger:scene,start:'top 86%',once:true,invalidateOnRefresh:true}
     });
     if(heading)timeline.fromTo(heading,{x:-distance*.4,opacity:.55},{x:0,opacity:1,clearProps:'transform,opacity'},0);
     const kind=scene.dataset.homeScene;
     if(kind==='works'){
      const art=scene.querySelector('.v2-work-feature .v2-work-art');
      const copy=scene.querySelector('.v2-work-copy');
      const secondary=scene.querySelectorAll('.v2-work-secondary');
      if(art)timeline.fromTo(art,{clipPath:'inset(9% 0 0 0 round 20px)',y:distance},{clipPath:'inset(0% 0 0 0 round 20px)',y:0,duration:.95,clearProps:'clipPath,transform'},.04);
      if(copy)timeline.fromTo(copy,{x:distance*.65,opacity:.5},{x:0,opacity:1,clearProps:'transform,opacity'},.16);
      if(secondary.length)timeline.fromTo(secondary,{y:distance*.6,opacity:.55},{y:0,opacity:1,stagger:{amount:.16},clearProps:'transform,opacity'},.24);
     }else if(kind==='creators'){
      const creators=scene.querySelectorAll('.v2-creator');
      if(creators.length)timeline.fromTo(creators,{x:-distance,opacity:.45},{x:0,opacity:1,stagger:{amount:.24},clearProps:'transform,opacity'},.12);
     }else if(kind==='explore'){
      const feature=scene.querySelector('.v2-explore-feature'),links=scene.querySelectorAll('.v2-explore-link');
      if(feature)timeline.fromTo(feature,{clipPath:'inset(0 8% 0 0 round 20px)'},{clipPath:'inset(0 0% 0 0 round 20px)',duration:.9,clearProps:'clipPath'},.08);
      if(links.length)timeline.fromTo(links,{x:distance,opacity:.5},{x:0,opacity:1,stagger:{amount:.16},clearProps:'transform,opacity'},.18);
     }else if(kind==='invitation'){
      const title=scene.querySelector('h2'),actions=scene.querySelector(':scope > div');
      if(title)timeline.fromTo(title,{y:distance*.45,opacity:.6},{y:0,opacity:1,clearProps:'transform,opacity'},0);
      if(actions)timeline.fromTo(actions,{opacity:.5},{opacity:1,duration:.45,clearProps:'opacity'},.15);
     }
    }
   },root);
  },root);
  root.addEventListener('load',refresh,true);
  window.addEventListener('pageshow',refresh);
  void document.fonts?.ready.then(refresh);
  refresh();
  return()=>{
   active=false;
   cancelAnimationFrame(refreshFrame);
   root.removeEventListener('load',refresh,true);
   window.removeEventListener('pageshow',refresh);
   media.revert();
   context.revert();
  };
 },[]);
 return <span ref={anchor} hidden aria-hidden="true"/>;
}
