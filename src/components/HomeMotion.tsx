'use client';

import {useEffect,useRef} from 'react';
import {gsap} from 'gsap';

/** Reusable entrances stay dormant until a story crosses the viewport again. */
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
    type Entrance={story:boolean;side:number;inside:boolean;timeline?:ReturnType<typeof gsap.timeline>};
    const entrances=new Map<HTMLElement,Entrance>();
    // Read restored positions together. Initially visible content keeps its server-rendered
    // appearance, but is still observed so that a later visit can replay its entrance.
    const scenes=Array.from(root.querySelectorAll<HTMLElement>('[data-home-scene],[data-home-story],.v2-work-collection > .v2-work')).map(scene=>({scene,top:scene.getBoundingClientRect().top}));
    let storyIndex=0;
    for(const {scene,top} of scenes){
     const story=scene.matches('[data-home-story],.v2-work-collection > .v2-work');
     const side=scene.dataset.homeSide?(scene.dataset.homeSide==='right'?1:-1):(scene.classList.contains('is-reverse')||storyIndex%2===1?1:-1);
     if(story)storyIndex++;
     entrances.set(scene,{story,side,inside:top<window.innerHeight});
    }
    if(!entrances.size)return;
    const prepare=(scene:HTMLElement,entrance:Entrance)=>match.add(()=>{
     const {story,side}=entrance;
     if(story){
      const art=scene.querySelector('.home-story-visual,.v2-work-art'),copy=scene.querySelector('.home-story-copy,.v2-work-copy');
      if(!art&&!copy)return;
      const timeline=entrance.timeline=gsap.timeline({paused:true,defaults:{duration:.85,ease:'expo.out'}});
      if(art)timeline.fromTo(art,{x:desktop?side*distance:0,y:desktop?12:18,rotationY:desktop?-side*1.4:0,scale:.985,opacity:.92,transformPerspective:1200,transformOrigin:side<0?'right center':'left center'},{x:0,y:0,rotationY:0,scale:1,opacity:1,immediateRender:false,clearProps:'transform,transformOrigin,opacity'},0);
      if(copy)timeline.fromTo(copy,{x:desktop?-side*distance*.55:0,y:desktop?0:10,opacity:.82},{x:0,y:0,opacity:1,duration:.65,immediateRender:false,clearProps:'transform,opacity'},.1);
      return;
     }
     const heading=scene.querySelector('.v2-section-heading');
     if(!heading&&scene.dataset.homeScene!=='invitation')return;
     const timeline=entrance.timeline=gsap.timeline({paused:true,defaults:{duration:.6,ease:'expo.out'}});
     if(heading)timeline.fromTo(heading,{opacity:.84},{opacity:1,immediateRender:false,clearProps:'opacity'},0);
     if(scene.dataset.homeScene==='invitation'){
      const title=scene.querySelector('h2'),actions=scene.querySelector(':scope > div');
      if(title)timeline.fromTo(title,{y:distance*.4,opacity:.82},{y:0,opacity:1,immediateRender:false,clearProps:'transform,opacity'},0);
      if(actions)timeline.fromTo(actions,{opacity:.85},{opacity:1,duration:.4,immediateRender:false,clearProps:'opacity'},.12);
     }
    });
    let observer:IntersectionObserver|undefined,resizeFrame=0,live=true,generation=0;
    const observe=()=>{
     observer?.disconnect();
     const current=++generation;
     observer=new IntersectionObserver(entries=>{
      if(!live||current!==generation)return;
      for(const entry of entries){
       const scene=entry.target as HTMLElement,entrance=entrances.get(scene);if(!entrance)continue;
       if(!entry.isIntersecting){
        entrance.inside=false;
        // The full scene is outside the viewport: finish and release its ticker without
        // visibly resetting it. The same timeline restarts on the next visit in either direction.
        entrance.timeline?.progress(1).pause();
       }else if(!entrance.inside){
        entrance.inside=true;
        if(!entrance.timeline)prepare(scene,entrance);
        entrance.timeline?.restart();
       }
      }
     },{threshold:0});
     for(const scene of entrances.keys())observer.observe(scene);
    };
    const resize=()=>{if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;if(live)observe();});};
    observe();window.addEventListener('resize',resize);
    return()=>{live=false;generation++;observer?.disconnect();entrances.clear();cancelAnimationFrame(resizeFrame);window.removeEventListener('resize',resize);};
   },root);
  return()=>media.revert();
 },[]);
 return <span ref={anchor} hidden aria-hidden="true"/>;
}
