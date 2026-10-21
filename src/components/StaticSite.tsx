'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from './LocaleProvider';
import {BlogShare} from './BlogShare';
export function StaticSite({src,files,base='',entry,initialPage=entry,preview=false}:{src:string;files:string[];base?:string;entry:string;initialPage?:string;preview?:boolean}){
 const {t}=useLocale(),frame=useRef<HTMLIFrameElement>(null),[path,setPath]=useState(base),[loaded,setLoaded]=useState(false);
 function requestPage(){frame.current?.contentWindow?.postMessage({type:'spaceyew:request-page'},'*')}
 useEffect(()=>{setLoaded(false);setPath(base+(initialPage===entry?'':'?page='+encodeURIComponent(initialPage)));function message(event:MessageEvent){if(event.source!==frame.current?.contentWindow||event.data?.type!=='spaceyew:page'||typeof event.data.path!=='string')return;const value=event.data.path;if(value.length>2000||/[\u0000-\u001f]/.test(value))return;let url;try{url=new URL(value,'https://static.invalid/')}catch{return}let name;try{name=decodeURIComponent(url.pathname.slice(1))}catch{return}if(url.origin!=='https://static.invalid'||!files.includes(name)||! /\.html?$/i.test(name))return;const share=base+(name===entry&&!url.search&&!url.hash?'':'?page='+encodeURIComponent(name+url.search+url.hash));setPath(share);setLoaded(true);if(!preview&&base)history.replaceState(history.state,'',share)}window.addEventListener('message',message);requestPage();return()=>window.removeEventListener('message',message)},[src,base,entry,initialPage,files,preview]);
 return <div className="hosted-site"><div className="hosted-toolbar"><span>{t(preview?'静态主页预览':'独立设计 · 由 SpaceYew 托管')}</span>{!preview&&<BlogShare path={path||base}/>}</div>{!loaded&&<p className="hosted-loading" role="status">{t('正在打开个人主页…')}</p>}<iframe ref={frame} src={src} title={t('个人静态主页')} sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={()=>{setLoaded(true);requestPage()}}/>{preview&&<p className="space-muted">{t('预览有效期为5分钟，过期后请重新打开。')}</p>}</div>;
}
