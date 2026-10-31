'use client';

import {useEffect,useRef} from 'react';
import {gsap} from 'gsap';

/** Large alternating stories arrive independently; the macOS stage keeps its existing motion. */
export function HomeMotion(){
 const anchor=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const root=anchor.current?.closest<HTMLElement>('.v2-home');
  if(!root)return;
  const media=gsap.matchMedia();
  media.add({desktop:'(min-width: 761px)',mobile:'(max-width: 760px)',reduce:'(prefers-reduced-motion: reduce)'},match=>{
    const {desktop,reduce}=match.conditions!;
    if(reduce)return;
    const distance=desktop?32:14;
    const pending=new Map<HTMLElement,{story:boolean;side:number}>();
    // Read the document once before creating any tweens; offscreen entrances do not
    // need a global scroll ticker or a refresh that remeasures every story on image load.
    const scenes=Array.from(root.querySelectorAll<HTMLElement>('[data-home-scene],[data-home-story],.v2-work-collection > .v2-work')).map(scene=>({scene,top:scene.getBoundingClientRect().top}));
    let storyIndex=0;
    for(const {scene,top} of scenes){
     const story=scene.matches('[data-home-story],.v2-work-collection > .v2-work');
     const side=scene.dataset.homeSide?(scene.dataset.homeSide==='right'?1:-1):(scene.classList.contains('is-reverse')||storyIndex%2===1?1:-1);
     if(story)storyIndex++;
     // Browser history, anchor links and first-paint content must never disappear during setup.
     if(top<window.innerHeight*.86)continue;
     pending.set(scene,{story,side});
    }
    if(!pending.size)return;
    const enter=(scene:HTMLElement,{story,side}:{story:boolean;side:number})=>match.add(()=>{
     if(story){
      const art=scene.querySelector('.home-story-visual,.v2-work-art'),copy=scene.querySelector('.home-story-copy,.v2-work-copy');
      if(!art&&!copy)return;
      const timeline=gsap.timeline({defaults:{duration:.85,ease:'expo.out'}});
      if(art)timeline.fromTo(art,{x:desktop?side*distance:0,y:desktop?12:18,rotationY:desktop?-side*1.4:0,scale:.985,opacity:.92,transformPerspective:1200,transformOrigin:side<0?'right center':'left center'},{x:0,y:0,rotationY:0,scale:1,opacity:1,clearProps:'transform,transformOrigin,opacity'},0);
      if(copy)timeline.fromTo(copy,{x:desktop?-side*distance*.55:0,y:desktop?0:10,opacity:.82},{x:0,y:0,opacity:1,duration:.65,clearProps:'transform,opacity'},.1);
      return;
     }
     const heading=scene.querySelector('.v2-section-heading');
     if(!heading&&scene.dataset.homeScene!=='invitation')return;
     const timeline=gsap.timeline({
      defaults:{duration:.6,ease:'expo.out'}
     });
     if(heading)timeline.fromTo(heading,{opacity:.84},{opacity:1,clearProps:'opacity'},0);
     if(scene.dataset.homeScene==='invitation'){
      const title=scene.querySelector('h2'),actions=scene.querySelector(':scope > div');
      if(title)timeline.fromTo(title,{y:distance*.4,opacity:.82},{y:0,opacity:1,clearProps:'transform,opacity'},0);
      if(actions)timeline.fromTo(actions,{opacity:.85},{opacity:1,duration:.4,clearProps:'opacity'},.12);
     }
    });
    let observer:IntersectionObserver|undefined,resizeFrame=0,live=true;
    const observe=()=>{
     observer?.disconnect();
     if(!pending.size)return;
     observer=new IntersectionObserver(entries=>{
      if(!live)return;
      for(const entry of entries){
       if(!entry.isIntersecting)continue;
       const scene=entry.target as HTMLElement,details=pending.get(scene);if(!details)continue;
       pending.delete(scene);observer?.unobserve(scene);enter(scene,details);
      }
      if(!pending.size){observer?.disconnect();window.removeEventListener('resize',resize);cancelAnimationFrame(resizeFrame);resizeFrame=0;}
     },{rootMargin:`0px 0px -${Math.round(window.innerHeight*.14)}px 0px`,threshold:0});
     for(const scene of pending.keys())observer.observe(scene);
    };
    const resize=()=>{if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;if(live)observe();});};
    observe();window.addEventListener('resize',resize);
    return()=>{live=false;observer?.disconnect();pending.clear();cancelAnimationFrame(resizeFrame);window.removeEventListener('resize',resize);};
   },root);
  return()=>media.revert();
 },[]);
 return <span ref={anchor} hidden aria-hidden="true"/>;
}
