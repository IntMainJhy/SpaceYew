'use client';
import {useEffect} from 'react';
import {post} from '@/lib/client';
export type SpaceData=Record<string,any>;
export function SpaceVisit({handle}:{handle:string}){useEffect(()=>{let visitor;try{visitor=localStorage.getItem('ergathia-visitor');if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('ergathia-visitor',visitor)}}catch{return}const timer=setTimeout(()=>void post('/api/spaces/visit',{handle,path:location.pathname,visitor}).catch(()=>{}),600);return()=>clearTimeout(timer)},[handle]);return null}
