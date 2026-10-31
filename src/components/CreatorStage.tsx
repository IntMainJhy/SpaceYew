'use client';
import {useId,useLayoutEffect,useRef,useState} from 'react';
import type {KeyboardEvent} from 'react';
import Link from 'next/link';
import {useLocale} from './LocaleProvider';
import {FeedAvatar} from './FeedAvatar';
import {Icon} from './Icons';
import {gsap} from 'gsap';
export type CreatorProject={title:string;description:string;imageId?:string;href:string};
export type CreatorStageData={name:string;handle:string;intro:string;avatarId?:string;skills:string[];url:string;projects:CreatorProject[]};
export function CreatorStage({creator}:{creator:CreatorStageData}){
 const {t}=useLocale(),[tab,setTab]=useState('work'),id=useId(),tabs=[['work',t('作品')],['about',t('关于我')]];
 const tablist=useRef<HTMLDivElement>(null),panel=useRef<HTMLDivElement>(null),lastTab=useRef(tab),lastIndicator=useRef<{x:number;width:number}|null>(null);
 useLayoutEffect(()=>{
  const list=tablist.current,body=panel.current,active=list?.querySelector<HTMLButtonElement>('[aria-selected=true]'),indicator=list?.querySelector<HTMLElement>('.v2-stage-indicator');
  const previous=lastIndicator.current,changed=lastTab.current!==tab,direction=tab==='about'?1:-1;lastTab.current=tab;
  if(!list||!body||!active||!indicator)return;
  const measure=()=>({x:active.offsetLeft,width:active.offsetWidth});
  const end=measure();lastIndicator.current=end;
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',context=>{
   let live=true;
   gsap.set(indicator,{width:end.width,opacity:1});
   gsap.fromTo(indicator,{x:previous?.x??end.x,scaleX:previous&&end.width?previous.width/end.width:1},{x:end.x,scaleX:1,duration:previous ? .3 : 0,ease:'power3.out',overwrite:'auto'});
   list.dataset.tabMotion='active';
   if(changed)gsap.fromTo(body,{x:direction*8,opacity:.72},{x:0,opacity:1,duration:.26,ease:'power3.out',clearProps:'transform,opacity',overwrite:'auto'});
   const observer=new ResizeObserver(()=>{
    if(!live)return;
    const next=measure();if(next.x===lastIndicator.current?.x&&next.width===lastIndicator.current?.width)return;lastIndicator.current=next;
    context.add(()=>{gsap.killTweensOf(indicator);gsap.set(indicator,{x:next.x,width:next.width,scaleX:1,opacity:1});});
   });
   observer.observe(list);observer.observe(active);
   return()=>{live=false;observer.disconnect();delete list.dataset.tabMotion;};
  },list);
  return()=>media.revert();
 },[tab,t]);
 function navigate(event:KeyboardEvent<HTMLDivElement>){if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'work':event.key==='End'?'about':tab==='work'?'about':'work';setTab(next);event.currentTarget.querySelector<HTMLButtonElement>('[data-tab="'+next+'"]')?.focus()}
 return <div className="v2-stage" aria-label={t('创作者主页预览')}>
  <div className="v2-stage-chrome"><span className="v2-window-dots" aria-hidden="true"><i/><i/><i/></span><span className="v2-stage-address">/blog/{creator.handle}</span><Link href={creator.url} aria-label={t('查看博客空间')}><Icon name="arrow"/></Link></div>
  <div className="v2-stage-body"><aside className="v2-stage-profile"><FeedAvatar name={creator.name} avatarId={creator.avatarId}/><h2>{creator.name}</h2><span>@{creator.handle}</span><p>{creator.intro}</p><div className="v2-stage-skills">{creator.skills.slice(0,3).map(skill=><span key={skill}>{skill}</span>)}</div><Link href={creator.url}>{t('查看博客空间')}<Icon name="arrow"/></Link></aside>
   <div className="v2-stage-content"><div ref={tablist} className="v2-stage-tabs" role="tablist" aria-label={t('展板内容')} onKeyDown={navigate}>{tabs.map(([key,label])=><button key={key} data-tab={key} type="button" role="tab" id={id+'-'+key} aria-controls={id+'-panel'} aria-selected={tab===key} tabIndex={tab===key?0:-1} onClick={()=>setTab(key)}>{label}</button>)}<span className="v2-stage-indicator" aria-hidden="true"/></div>
    <div ref={panel} id={id+'-panel'} role="tabpanel" aria-labelledby={id+'-'+tab} tabIndex={0}>{tab==='work'?<div className="v2-stage-projects">{creator.projects.length?creator.projects.slice(0,2).map((project,index)=><Link href={project.href} key={project.title+'-'+index} className="v2-stage-project">{project.imageId?<img src={'/media/'+project.imageId} alt="" width={640} height={360}/>:<div className="v2-project-type" aria-hidden="true"><span>{project.title}</span><Icon name="arrow"/></div>}<div><h3>{project.title}</h3><p>{project.description}</p></div></Link>):<div className="v2-stage-note"><h3>{t('完整介绍你自己')}</h3><p>{t('个人介绍、经历、技能与作品。')}</p><Link href={creator.url}>{t('查看博客空间')}<Icon name="arrow"/></Link></div>}</div>:<div className="v2-stage-about"><h3>{creator.name}</h3><p>{creator.intro}</p><div className="v2-stage-skills">{creator.skills.map(skill=><span key={skill}>{skill}</span>)}</div><Link href={creator.url}>{t('查看博客空间')}<Icon name="arrow"/></Link></div>}</div>
   </div></div>
 </div>;
}
