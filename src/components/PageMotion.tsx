'use client';
import {useEffect,useLayoutEffect,useRef} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {gsap} from 'gsap';
import '@/app/surface-clarity.css';
import '@/app/interaction-motion.css';

type Box={left:number;top:number;width:number;height:number};
type Snapshot={from:string;to:string;regions:Record<string,Box>;active?:Box;scroll:number;key?:string;keyboard:boolean};
const regions={nav:'.feed-nav-links',identity:'.feed-identity',compose:'.feed-navigation>.feed-write',discover:'.community-navigation-shell>.feed-discover',content:'.community-route-content,.space-workspace-main'};
// PublicFrame can remount between routes; one pending handoff also bridges its header links.
let pending:Snapshot|null=null;
const box=(element:Element):Box=>{const {left,top,width,height}=element.getBoundingClientRect();return{left,top,width,height};};

export function PageMotion({children,className=''}:{children:React.ReactNode;className?:string}){
 const path=usePathname(),query=useSearchParams().toString(),route=path+(query?'?'+query:'');
 const root=useRef<HTMLDivElement>(null),lastRoute=useRef(route);
 useEffect(()=>{
  document.querySelectorAll<HTMLDetailsElement>('.organic-mobile-menu[open],.feed-mobile-account[open]').forEach(menu=>{menu.open=false;});
 },[path,query]);
 useEffect(()=>{
  const capture=(to:string,keyboard=false,key?:string)=>{
   const element=root.current,nav=element?.querySelector<HTMLElement>('.feed-nav-links');
   if(!element||to===element.dataset.motionRoute)return;
   const active=nav?.querySelector('[data-nav-key][aria-current="page"]');
   const indicator=nav?.querySelector('.feed-active-indicator');
   pending={from:element.dataset.motionRoute||'',to,keyboard,key,scroll:nav?.scrollTop||0,regions:Object.fromEntries(Object.entries(regions).flatMap(([name,selector])=>{const node=element.querySelector(selector);return node?[[name,box(node)]]:[]})),active:indicator&&nav?.dataset.motionReady?box(indicator):active?box(active):undefined};
  };
  const click=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a'):null;
   const element=root.current,shell=element?.closest('.organic-site,.blog-public-shell')||element;
   if(!link||!shell?.contains(link)||link.target||link.hasAttribute('download'))return;
   const next=new URL(link.href,location.href);
   if(next.origin===location.origin)capture(next.pathname+next.search,event.detail===0,link.dataset.navKey);
  };
  const dismiss=(event:PointerEvent|KeyboardEvent)=>{
   const menu=document.querySelector<HTMLDetailsElement>('.organic-mobile-menu[open]');
   if(!menu)return;
   if('key' in event){
    if(event.key!=='Escape')return;
    event.preventDefault();menu.open=false;menu.querySelector('summary')?.focus();
   }else if(event.target instanceof Node&&!menu.contains(event.target))menu.open=false;
  };
  const back=()=>capture(location.pathname+location.search);
  document.addEventListener('click',click,true);window.addEventListener('popstate',back);
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',dismiss);
  return()=>{document.removeEventListener('click',click,true);window.removeEventListener('popstate',back);document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',dismiss);};
 },[]);
 useLayoutEffect(()=>{
  const element=root.current,previous=pending?.to===route?pending:null;pending=null;
  const last=lastRoute.current,changed=last!==route||!!previous;lastRoute.current=route;
  if(!element)return;
  if(!element.querySelector('.community-navigation-shell')){
   if(!changed)return;
   const queryOnly=(previous?.from||last).split('?')[0]===path;
   const media=gsap.matchMedia();
   media.add('(prefers-reduced-motion: no-preference)',()=>{
    // Keep full-screen WebGL scenes in their coordinate system; animate their text receivers.
    const content=element.querySelector<HTMLElement>('.resource-hub > [data-glass-reveal],.catalog-page,.skills-page,.product-download-page,.document-reader,.shared-reading-layout,.community-auth-form,.community-report,.community-policy-document,.community-receipt');
    const heading=element.querySelector<HTMLElement>('.v2-hero-copy,.blog-spaces-heading,.catalog-page-heading,.organic-page-heading,.product-section-heading,.learning-heading');
    if(content)gsap.fromTo(content,{opacity:.88,y:queryOnly?0:10},{opacity:1,y:0,duration:queryOnly ? .24 : .36,ease:'power3.out',clearProps:'transform,opacity',overwrite:'auto'});
    if(heading&&!queryOnly&&!content?.contains(heading))gsap.fromTo(heading,{opacity:.86,y:12},{opacity:1,y:0,duration:.4,ease:'power3.out',clearProps:'transform,opacity',overwrite:'auto'});
    if(!content&&!heading)gsap.fromTo(element,{opacity:.9},{opacity:1,duration:.22,ease:'power2.out',clearProps:'opacity',overwrite:'auto'});
   },element);
   return()=>media.revert();
  }
  const nav=element.querySelector<HTMLElement>('.feed-nav-links');
  if(previous&&nav)nav.scrollTop=previous.scroll;
  if(previous?.keyboard&&previous.key){const link=Array.from(element.querySelectorAll<HTMLElement>('[data-nav-key]')).find(link=>link.dataset.navKey===previous.key);link?.focus({preventScroll:true});}
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(preference.matches)return;
  const nodes=Object.entries(regions).flatMap(([name,selector])=>{const node=element.querySelector<HTMLElement>(selector);return node?[{name,node,rect:box(node)}]:[];});
  const active=nav?.querySelector<HTMLElement>('[data-nav-key][aria-current="page"]'),indicator=nav?.querySelector<HTMLElement>('.feed-active-indicator');
  const activeBox=active?box(active):null,navBox=nav?box(nav):null;
  const content=element.querySelector('.community-route-content,.space-workspace-main');
  const context=gsap.context(()=>{
   if(previous){
    for(const {name,node,rect} of nodes){const before=previous.regions[name];if(!before)continue;const x=before.left-rect.left,y=Math.abs(before.top-rect.top)<=32?before.top-rect.top:0;if(Math.abs(x)+Math.abs(y)>.5)gsap.fromTo(node,{x,y},{x:0,y:0,duration:.3,ease:'power3.out',clearProps:'transform',overwrite:'auto'});}
    if(content)gsap.fromTo(content,{opacity:.9},{opacity:1,duration:.2,ease:'power2.out',clearProps:'opacity',overwrite:'auto'});
   }
   if(nav&&indicator&&activeBox&&navBox&&window.matchMedia('(min-width:768px)').matches){
    const from=previous?.active,oldNav=previous?.regions.nav;
    const end={x:activeBox.left-navBox.left,y:activeBox.top-navBox.top+nav.scrollTop};
    gsap.set(indicator,{width:activeBox.width,height:activeBox.height,transformOrigin:'left top',opacity:1});
    gsap.fromTo(indicator,from&&oldNav?{x:from.left-oldNav.left,y:from.top-oldNav.top+previous.scroll,scaleX:from.width/activeBox.width,scaleY:from.height/activeBox.height}:end,{...end,scaleX:1,scaleY:1,duration:from ? .28 : 0,ease:'power3.out',overwrite:'auto'});
    nav.dataset.motionReady='true';
   }
   let live=true,observer:ResizeObserver|undefined;
   if(nav&&active&&indicator&&activeBox&&navBox){
    let size=[navBox.width,activeBox.width,activeBox.height].join(':');
    observer=new ResizeObserver(()=>{
     if(!live)return;
     const n=box(nav),a=box(active),next=[n.width,a.width,a.height].join(':');
     if(next===size)return;size=next;
     context.add(()=>{
      gsap.killTweensOf(indicator);
      if(window.matchMedia('(min-width:768px)').matches){gsap.set(indicator,{x:a.left-n.left,y:a.top-n.top+nav.scrollTop,width:a.width,height:a.height,scaleX:1,scaleY:1,opacity:1});nav.dataset.motionReady='true';}
      else delete nav.dataset.motionReady;
     });
    });
    observer.observe(nav);observer.observe(active);
   }
   return()=>{live=false;observer?.disconnect();if(nav)delete nav.dataset.motionReady;};
  },element);
  const reduce=()=>{if(preference.matches)context.revert();};
  preference.addEventListener('change',reduce);
  return()=>{preference.removeEventListener('change',reduce);context.revert();};
 },[path,query]);
 return <div ref={root} className={'page-content '+className} data-page-content data-motion-route={route}>{children}</div>;
}
