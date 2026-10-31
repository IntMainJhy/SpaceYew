'use client';

import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import {V2Atmosphere} from './V2Atmosphere';

/** One shared interior scene; home and the blog flight provide their own renderer. */
export function PlatformGlass({scene='interior'}:{scene?:'home'|'interior'|'blogs'}){
 const anchor=useRef<HTMLSpanElement>(null),path=usePathname();
 useEffect(()=>{
  const shell=anchor.current?.closest('.v2-site,.blog-public-shell');if(!shell)return;
  const update=()=>shell.toggleAttribute('data-glass-scrolled',window.scrollY>48);
  update();window.addEventListener('scroll',update,{passive:true});
  return()=>{window.removeEventListener('scroll',update);shell.removeAttribute('data-glass-scrolled');};
 },[path]);
 return <><span ref={anchor} hidden aria-hidden="true"/>{scene==='interior'&&<div className="site-glass-atmosphere" aria-hidden="true"><V2Atmosphere mode="interior"/></div>}</>;
}
