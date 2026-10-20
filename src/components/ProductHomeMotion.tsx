'use client';

import {useEffect,useRef} from 'react';

const easing='cubic-bezier(.16,1,.3,1)';

export function ProductHomeMotion({children}:{children:React.ReactNode}){
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const node=root.current,preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(!node||!node.animate||preference.matches)return;
    const animations=new Set<Animation>();
    const play=(target:Element|null,frames:Keyframe[],duration:number,delay=0)=>{
      if(!target||preference.matches||document.hidden)return;
      const animation=target.animate(frames,{duration,delay,easing});
      animations.add(animation);
      animation.finished.then(()=>animations.delete(animation),()=>animations.delete(animation));
    };
    // Animate images only: text already displayed by SSR must stay readable.
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        observer.unobserve(entry.target);
        entry.target.querySelectorAll('.pfp-post-cover,.pfp-document>img').forEach(image=>play(image,[{clipPath:'inset(0 0 10% 0)'},{clipPath:'inset(0)'}],480));
      }
    },{threshold:.18,rootMargin:'0px 0px -5% 0px'});
    node.querySelectorAll('.pfp-community,.pfp-showcase').forEach(preview=>observer.observe(preview));
    const cancel=()=>animations.forEach(animation=>animation.cancel());
    const visibility=()=>{if(document.hidden)cancel();};
    const reduce=()=>{if(preference.matches){observer.disconnect();cancel();}};
    document.addEventListener('visibilitychange',visibility);
    preference.addEventListener('change',reduce);
    return()=>{observer.disconnect();cancel();document.removeEventListener('visibilitychange',visibility);preference.removeEventListener('change',reduce);};
  },[]);
  return <div className="platform-page product-home" ref={root}>{children}</div>;
}
