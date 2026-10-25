'use client';
import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {gsap} from 'gsap';
import {Icon} from './Icons';

// A local document gives the public template its real CSS viewport. Draft data stays in React memory.
const previewDocument='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="blog-preview-root"></div></body></html>';
const devices=[{id:'desktop',zh:'电脑',en:'Desktop',width:1100,icon:'monitor'},{id:'tablet',zh:'平板',en:'Tablet',width:768,icon:'tablet'},{id:'mobile',zh:'手机',en:'Mobile',width:390,icon:'phone'}];
export function BlogPreview({children,say,device,onDevice}:{children:ReactNode;say:(zh:string,en:string)=>string;device:string;onDevice:(value:string)=>void}){
 const frame=useRef<HTMLIFrameElement>(null),deviceFrame=useRef<HTMLDivElement>(null),previousWidth=useRef(0),progress=useRef(0),[root,setRoot]=useState<HTMLElement|null>(null),[width,setWidth]=useState(0),selected=devices.find(item=>item.id===device)||devices[0];
 useLayoutEffect(()=>{const el=frame.current;if(!el)return;const observer=new ResizeObserver(()=>setWidth(el.clientWidth));observer.observe(el);setWidth(el.clientWidth);return()=>observer.disconnect()},[]);
 useLayoutEffect(()=>{const win=root?.ownerDocument.defaultView;if(!win)return;let second=0;const first=win.requestAnimationFrame(()=>{second=win.requestAnimationFrame(()=>{win.scrollTo({top:progress.current*Math.max(0,root.ownerDocument.documentElement.scrollHeight-win.innerHeight),behavior:'instant'})})});return()=>{win.cancelAnimationFrame(first);win.cancelAnimationFrame(second)}},[root,device]);
 useLayoutEffect(()=>{
  const element=deviceFrame.current,oldWidth=previousWidth.current;if(!element||!oldWidth)return;
  const width=element.getBoundingClientRect().width;previousWidth.current=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // FLIP the frame once; the iframe gets its final viewport immediately rather than reflowing every animation frame.
  const context=gsap.context(()=>{gsap.fromTo(element,{scaleX:reduced?1:oldWidth/Math.max(1,width),opacity:.7},{scaleX:1,opacity:1,duration:reduced?.08:.26,ease:'power3.out',clearProps:'transform,opacity'})},element);
  return()=>context.revert();
 },[device]);
 function switchDevice(next:string){if(next===device)return;previousWidth.current=deviceFrame.current?.getBoundingClientRect().width||0;const win=root?.ownerDocument.defaultView;if(win)progress.current=win.scrollY/Math.max(1,root.ownerDocument.documentElement.scrollHeight-win.innerHeight);onDevice(next)}
 function scrollBehavior():ScrollBehavior{return window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}
 function ready(){const doc=frame.current?.contentDocument;if(!doc)return;for(const style of document.head.querySelectorAll('link[rel="stylesheet"],style'))doc.head.appendChild(style.cloneNode(true));for(const attribute of document.documentElement.attributes)if(attribute.name.startsWith('data-')||attribute.name==='lang')doc.documentElement.setAttribute(attribute.name,attribute.value);const reset=doc.createElement('style');reset.textContent='html,body{margin:0!important;padding:0!important;background:transparent!important;min-height:100%;overflow-x:hidden;overflow-anchor:none;scrollbar-gutter:stable}body{display:block!important}#blog-preview-root{padding:24px 0;min-height:100vh}.anx-portfolio{max-width:100%;margin:auto}';doc.head.appendChild(reset);setRoot(doc.getElementById('blog-preview-root'))}
 return <section className="blog-effect-preview" aria-label={say('博客效果预览','Blog preview')}><header className="bp-toolbar"><div><strong>{say('效果预览','Live preview')}</strong><span>{say('当前草稿的展示效果','The current draft, as visitors see it')}</span></div><div className="bp-options"><div className="bp-devices" role="group" aria-label={say('预览尺寸','Preview size')}>{devices.map(item=><button key={item.id} type="button" aria-pressed={device===item.id} onClick={()=>switchDevice(item.id)}><Icon name={item.icon}/>{say(item.zh,item.en)}</button>)}</div><output className="bp-size" aria-label={say('实际预览宽度','Actual preview width')}>{width||selected.width} px</output><button className="bp-top" type="button" onClick={()=>{progress.current=0;root?.ownerDocument.defaultView?.scrollTo({top:0,behavior:scrollBehavior()})}}><Icon name="chevron-up"/><span>{say('回到顶部','Back to top')}</span></button></div></header><div className="bp-stage"><div ref={deviceFrame} className="bp-device" data-device={device} style={{width:selected.width}}>{!root&&<p className="bp-loading" role="status">{say('正在生成预览…','Preparing preview…')}</p>}<iframe ref={frame} title={say('博客效果预览','Blog preview')} srcDoc={previewDocument} onLoad={ready}/>{root&&createPortal(<div onClickCapture={event=>{const anchor=(event.target as Element).closest?.('a'),href=anchor?.getAttribute('href');if(href?.startsWith('#')){event.preventDefault();root.ownerDocument.getElementById(href.slice(1))?.scrollIntoView({block:'start',behavior:scrollBehavior()})}}}>{children}</div>,root)}</div></div></section>;
}
