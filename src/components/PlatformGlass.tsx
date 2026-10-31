'use client';

import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import {InteriorAtmosphere} from './InteriorAtmosphere';
import {interiorSceneForPath} from '@/lib/interior-scene.mjs';

/** Interior routes have distinct sculptures; home and the blog flight own their renderers. */
export function PlatformGlass({scene='interior'}:{scene?:'home'|'interior'|'blogs'}){
 const anchor=useRef<HTMLSpanElement>(null),path=usePathname();
 useEffect(()=>{
  const shell=anchor.current?.closest('.v2-site,.blog-public-shell');if(!shell)return;
  const journey=scene==='blogs'?shell.querySelector<HTMLElement>('.blog-spaces-opening'):null;
  let brightAt=Infinity,live=true;
  const update=()=>{
   if(!live)return;
   shell.toggleAttribute('data-glass-scrolled',window.scrollY>48);
   shell.toggleAttribute('data-glass-bright',window.scrollY>brightAt);
  };
  // Read scene bounds only when its size changes. Scrolling itself only switches
  // ink at the blue-to-daylight boundary; the header never paints another surface.
  const measure=()=>{
   if(!live)return;
   const height=window.innerHeight;
   brightAt=journey?.dataset.journey==='ready'?Math.max(1,journey.offsetHeight-height+(window.innerWidth<768?64:72))*.82:height*1.02;
   update();
  };
  const bounds=journey?new ResizeObserver(measure):null;bounds?.observe(journey!);
  measure();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',measure);
  return()=>{live=false;bounds?.disconnect();window.removeEventListener('scroll',update);window.removeEventListener('resize',measure);shell.removeAttribute('data-glass-scrolled');shell.removeAttribute('data-glass-bright');};
 },[path,scene]);
 return <><span ref={anchor} hidden aria-hidden="true"/>{scene==='interior'&&<InteriorAtmosphere scene={interiorSceneForPath(path)}/>}</>;
}
