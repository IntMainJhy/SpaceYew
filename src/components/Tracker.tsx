'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
export function sendEvent(path:string,kind='view'){if(navigator.doNotTrack==='1')return;fetch('/api/analytics',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),path,kind,referrer:document.referrer}),keepalive:true}).catch(()=>{})}
export function Tracker(){const pathname=usePathname();useEffect(()=>{if(/^\/(?:$|about$|career$|(?:projects|articles|resources|community)(?:\/[^/?#]{1,200})?$)/.test(pathname))sendEvent(pathname)},[pathname]);return null}
export function TrackedLink({href,path,external=false,children,className='btn primary wide'}:{href:string,path:string,external?:boolean,children:React.ReactNode,className?:string}){return <a href={href} className={className} target={external?'_blank':undefined} rel={external?'noopener noreferrer':undefined} onClick={()=>sendEvent(path,'download')}>{children}</a>}
