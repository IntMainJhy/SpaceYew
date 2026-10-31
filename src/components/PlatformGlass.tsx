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
  const update=()=>shell.toggleAttribute('data-glass-scrolled',window.scrollY>48);
  update();window.addEventListener('scroll',update,{passive:true});
  return()=>{window.removeEventListener('scroll',update);shell.removeAttribute('data-glass-scrolled');};
 },[path]);
 return <><span ref={anchor} hidden aria-hidden="true"/>{scene==='interior'&&<InteriorAtmosphere scene={interiorSceneForPath(path)}/>}</>;
}
