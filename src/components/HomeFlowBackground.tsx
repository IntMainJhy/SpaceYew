'use client';

import {useEffect,useId,useRef} from 'react';
import {homeFlowPaths,mountHomeFlow} from '@/lib/home-flow';

export function HomeFlowBackground({interactive=true}:{interactive?:boolean}={}){
 const node=useRef<SVGSVGElement>(null),id=useId();
 useEffect(()=>node.current?mountHomeFlow(node.current,interactive):undefined,[interactive]);
 const paths=homeFlowPaths(0);
 return <svg ref={node} className="home-flow-background" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id={id+'-sky'} x1="0" y1="0" x2=".32" y2="1">
    <stop stopColor="#fff" stopOpacity="0"/>
    <stop offset=".3" stopColor="#86b6e4" stopOpacity=".78"/>
    <stop offset=".48" stopColor="#e5f2ff" stopOpacity=".8"/>
    <stop offset=".7" stopColor="#b3d8ef" stopOpacity=".36"/>
    <stop offset="1" stopColor="#fff" stopOpacity="0"/>
   </linearGradient>
   <linearGradient id={id+'-mint'} x1="1" y1="0" x2="0" y2=".85">
    <stop stopColor="#fff" stopOpacity="0"/>
    <stop offset=".36" stopColor="#83c9bb" stopOpacity=".76"/>
    <stop offset=".52" stopColor="#effbf5" stopOpacity=".9"/>
    <stop offset=".72" stopColor="#b0d9ca" stopOpacity=".4"/>
    <stop offset="1" stopColor="#fff" stopOpacity="0"/>
   </linearGradient>
   <linearGradient id={id+'-apricot'} x1="0" y1="0" x2=".7" y2="1">
    <stop stopColor="#fff" stopOpacity="0"/>
    <stop offset=".35" stopColor="#eab59c" stopOpacity=".6"/>
    <stop offset=".6" stopColor="#fff1e7" stopOpacity=".7"/>
    <stop offset="1" stopColor="#fff" stopOpacity="0"/>
   </linearGradient>
   <radialGradient id={id+'-clear'} cx=".5" cy=".2" r=".56">
    <stop stopColor="#fff"/>
    <stop offset=".4" stopColor="#fff" stopOpacity=".98"/>
    <stop offset="1" stopColor="#fff" stopOpacity="0"/>
   </radialGradient>
   <linearGradient id={id+'-fade'} x1="0" y1="0" x2="0" y2="1">
    <stop offset=".58" stopColor="#fff" stopOpacity="0"/>
    <stop offset="1" stopColor="#fff"/>
   </linearGradient>
  </defs>
  <g data-flow-ribbons="" opacity=".9">
   <path data-flow-ribbon="" d={paths[0]} fill={'url(#'+id+'-sky)'}/>
   <path data-flow-ribbon="" d={paths[1]} fill={'url(#'+id+'-mint)'}/>
   <path data-flow-ribbon="" d={paths[2]} fill={'url(#'+id+'-apricot)'} opacity=".6"/>
  </g>
  <rect width="1600" height="900" fill={'url(#'+id+'-clear)'}/>
  <g data-flow-trail="" opacity="0" className="home-flow-particles">
   {interactive&&Array.from({length:84},(_,i)=><text key={i} data-flow-particle="" opacity="0"/>)}
  </g>
  <rect width="1600" height="900" fill={'url(#'+id+'-fade)'}/>
 </svg>;
}
