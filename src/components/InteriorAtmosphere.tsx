'use client';

import {useEffect,useRef} from 'react';
import {mountV2Atmosphere} from './V2Atmosphere';
import type {InteriorScene} from '@/lib/interior-glass';
import '@/app/interior-atmosphere.css';

export function InteriorAtmosphere({scene}:{scene:InteriorScene}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>canvas.current?mountV2Atmosphere(canvas.current,(element,signal)=>import('@/lib/interior-glass').then(module=>module.createInteriorGlass(element,signal,scene)),{mode:'interior'}):undefined,[scene]);
 return <div className={'site-glass-atmosphere interior-atmosphere interior-atmosphere--'+scene} data-interior-scene={scene} aria-hidden="true">
  <div className="interior-atmosphere-fallback"><i/><i/><i/></div>
  <canvas ref={canvas} className="interior-atmosphere-canvas"/>
 </div>;
}
