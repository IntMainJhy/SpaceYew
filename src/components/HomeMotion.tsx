'use client';

import {useEffect,useRef} from 'react';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

/** Large alternating stories arrive independently; the macOS stage keeps its existing motion. */
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
    const distance=desktop?32:14;
    let storyIndex=0;
    for(const scene of root.querySelectorAll<HTMLElement>('[data-home-scene],[data-home-story],.v2-work-collection > .v2-work')){
     const story=scene.matches('[data-home-story],.v2-work-collection > .v2-work');
     const side=scene.dataset.homeSide?(scene.dataset.homeSide==='right'?1:-1):(scene.classList.contains('is-reverse')||storyIndex%2===1?1:-1);
     if(story)storyIndex++;
     // Browser history, anchor links and first-paint content must never disappear during setup.
     if(scene.getBoundingClientRect().top<window.innerHeight*.86)continue;
     if(story){
      const art=scene.querySelector('.home-story-visual,.v2-work-art'),copy=scene.querySelector('.home-story-copy,.v2-work-copy');
      if(!art&&!copy)continue;
      const timeline=gsap.timeline({defaults:{duration:.85,ease:'expo.out'},scrollTrigger:{trigger:scene,start:'top 86%',once:true,invalidateOnRefresh:true}});
      if(art)timeline.fromTo(art,{x:desktop?side*distance:0,y:desktop?12:18,rotationY:desktop?-side*1.4:0,scale:.985,opacity:.92,transformPerspective:1200,transformOrigin:side<0?'right center':'left center'},{x:0,y:0,rotationY:0,scale:1,opacity:1,clearProps:'transform,transformOrigin,opacity'},0);
      if(copy)timeline.fromTo(copy,{x:desktop?-side*distance*.55:0,y:desktop?0:10,opacity:.82},{x:0,y:0,opacity:1,duration:.65,clearProps:'transform,opacity'},.1);
      continue;
     }
     const heading=scene.querySelector('.v2-section-heading');
     if(!heading&&scene.dataset.homeScene!=='invitation')continue;
     const timeline=gsap.timeline({
      defaults:{duration:.6,ease:'expo.out'},
      scrollTrigger:{trigger:scene,start:'top 86%',once:true,invalidateOnRefresh:true}
     });
     if(heading)timeline.fromTo(heading,{opacity:.84},{opacity:1,clearProps:'opacity'},0);
     if(scene.dataset.homeScene==='invitation'){
      const title=scene.querySelector('h2'),actions=scene.querySelector(':scope > div');
      if(title)timeline.fromTo(title,{y:distance*.4,opacity:.82},{y:0,opacity:1,clearProps:'transform,opacity'},0);
      if(actions)timeline.fromTo(actions,{opacity:.85},{opacity:1,duration:.4,clearProps:'opacity'},.12);
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
