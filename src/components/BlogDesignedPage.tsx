'use client';
import {useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {useLocale} from './LocaleProvider';
import {BlogSticker} from './BlogSticker';
import {AnxPortfolio} from './AnxPortfolio';
import {BlogDesignLabel} from './BlogDesignFields';
import {designHeight,designOrder,visibleDesignNodes,designBounds,positionedBlogDesign,mobileBlogDesign} from '@/lib/blog-design.mjs';
import type {SpaceData} from './SpaceBoard';
export function designBlockStyle(node:SpaceData):CSSProperties{
 const s=node.style||{};return {...({'--sticker-paper':s.background||'#f5f0df'} as CSSProperties),background:s.background||undefined,color:s.color||undefined,borderRadius:s.radius||0,padding:s.padding||0,textAlign:s.align||'left',...(node.kind!=='template'?{fontSize:s.fontSize||28,fontFamily:s.font==='sans'?'Arial,"PingFang SC",sans-serif':s.font==='mono'?'ui-monospace,monospace':node.kind==='sticker'?'"Kaiti SC",STKaiti,cursive':'Baskerville,"Songti SC",serif'}:{}),...(node.kind==='template'?{'--anx-paper':s.background||'#ffffff','--anx-ink':s.color||'#202124'} as CSSProperties:{})};
}
export function BlogDesignBlock({node,data,profile,preview=false}:{node:SpaceData;data:SpaceData;profile:SpaceData;preview?:boolean}){
 const settings=data.layout.blog||{},content=[...(data.content||[]),...(data.legacyContent||[])];
 return <div className={'bd-block bd-kind-'+node.kind} data-page-template={settings.design?.template||'anx'} data-presentation={node.presentation||'classic'} style={designBlockStyle(node)}>
  {node.kind==='template'&&<BlogDesignLabel.Provider value={node.label||''}><AnxPortfolio data={{...data,layout:{...data.layout,blog:settings}}} p={profile} content={content} part={node.part} preview={preview} embedded/></BlogDesignLabel.Provider>}
  {node.kind==='sticker'&&<BlogSticker node={node}/>}
  {node.kind==='text'&&<p className="bd-custom-text">{node.text}</p>}
  {node.kind==='image'&&(node.assetId?<figure className="bd-custom-image"><img src={'/media/'+node.assetId} alt={node.alt||''}/>{node.text&&<figcaption>{node.text}</figcaption>}</figure>:null)}
  {node.kind==='button'&&(!node.url?<span className="bd-custom-button">{node.text}</span>:<a className="bd-custom-button" href={node.url} target="_blank" rel="noopener noreferrer">{node.text}</a>)}
 </div>;
}
export function BlogDesignedPage({data,profile,preview=false}:{data:SpaceData;profile:SpaceData;preview?:boolean}){
 const {locale}=useLocale(),design=data.layout.blog.design,nodes=designOrder(visibleDesignNodes(design.nodes)).map((n:SpaceData)=>({...n,...Object.fromEntries(['label','text','alt'].map(key=>[key,n.translations?.[locale]?.[key]?.trim()?n.translations[locale][key]:n[key]]))}));
 const shell=useRef<HTMLDivElement>(null),page=useRef<HTMLDivElement>(null),[view,setView]=useState({width:0,height:0});
 useLayoutEffect(()=>{const outer=shell.current,inner=page.current;if(!outer||!inner)return;let frame=0;const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const width=outer.clientWidth,height=Math.max(inner.offsetHeight,inner.scrollHeight);setView(v=>v.width===width&&v.height===height?v:{width,height})})};const observer=new ResizeObserver(measure);observer.observe(outer);observer.observe(inner);setView({width:outer.clientWidth,height:Math.max(inner.offsetHeight,inner.scrollHeight)});measure();return()=>{cancelAnimationFrame(frame);observer.disconnect()}},[design]);
 const bounds=designBounds(design),span=bounds.right-bounds.left,mobile=mobileBlogDesign(view.width),scale=view.width&&!mobile?Math.min(1,view.width/span):1,left=mobile?0:Math.max(0,(view.width-span*scale)/2)-bounds.left*scale;
 const roots=nodes.filter((n:SpaceData)=>!n.anchor),decorated=nodes.some((n:SpaceData)=>n.anchor&&n.frame.x<0);
 return <div className="bd-page-shell" ref={shell}><div className="bd-public-stage" style={{height:!mobile&&view.height?(view.height-bounds.top)*scale:undefined}}><div className="bd-public" ref={page} data-mobile={mobile} data-decorated={decorated} data-layout={positionedBlogDesign(design)?'free':'flow'} style={{'--bd-width':design.width+'px','--bd-height':designHeight(design)+'px',background:design.background,width:mobile?'100%':design.width,margin:0,left,top:mobile?0:-bounds.top*scale,transform:mobile?undefined:`scale(${scale})`,transformOrigin:'top left'} as CSSProperties}>
  {roots.map((node:SpaceData)=><div className="bd-public-node" data-overlay={node.kind==='sticker'} key={node.id} style={{'--bd-x':node.frame.x/design.width*100+'%','--bd-y':node.frame.y+'px','--bd-w':node.frame.w/design.width*100+'%','--bd-h':node.frame.h+'px',zIndex:node.kind==='template'?undefined:design.nodes.findIndex((n:SpaceData)=>n.id===node.id)-1} as CSSProperties}><BlogDesignBlock node={node} data={data} profile={profile} preview={preview}/>{nodes.filter((n:SpaceData)=>n.anchor===node.id).map((note:SpaceData)=><div className="bd-public-annotation" key={note.id} style={{left:note.frame.x,top:note.frame.y,width:note.frame.w,zIndex:design.nodes.findIndex((n:SpaceData)=>n.id===note.id)-1}}><BlogDesignBlock node={note} data={data} profile={profile} preview={preview}/></div>)}</div>)}
 </div></div></div>;
}
