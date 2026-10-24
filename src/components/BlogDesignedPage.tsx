'use client';
import {type CSSProperties} from 'react';
import {useLocale} from './LocaleProvider';
import {AnxPortfolio} from './AnxPortfolio';
import {BlogDesignLabel} from './BlogDesignFields';
import {designHeight,designOrder} from '@/lib/blog-design.mjs';
import type {SpaceData} from './SpaceBoard';
export function designBlockStyle(node:SpaceData):CSSProperties{
 const s=node.style||{};return {background:s.background||undefined,color:s.color||undefined,borderRadius:s.radius||0,padding:s.padding||0,textAlign:s.align||'left',...(node.kind!=='template'?{fontSize:s.fontSize||28,fontFamily:s.font==='sans'?'Arial,"PingFang SC",sans-serif':s.font==='mono'?'ui-monospace,monospace':'Baskerville,"Songti SC",serif'}:{}),...(node.kind==='template'?{'--anx-paper':s.background||'#ffffff','--anx-ink':s.color||'#202124'} as CSSProperties:{})};
}
export function BlogDesignBlock({node,data,profile,preview=false}:{node:SpaceData;data:SpaceData;profile:SpaceData;preview?:boolean}){
 const settings=data.layout.blog||{},content=[...(data.content||[]),...(data.legacyContent||[])];
 return <div className={'bd-block bd-kind-'+node.kind} style={designBlockStyle(node)}>
  {node.kind==='template'&&<BlogDesignLabel.Provider value={node.label||''}><AnxPortfolio data={{...data,layout:{...data.layout,blog:settings}}} p={profile} content={content} part={node.part} preview={preview} embedded/></BlogDesignLabel.Provider>}
  {node.kind==='text'&&<p className="bd-custom-text">{node.text}</p>}
  {node.kind==='image'&&(node.assetId?<figure className="bd-custom-image"><img src={'/media/'+node.assetId} alt={node.alt||''}/>{node.text&&<figcaption>{node.text}</figcaption>}</figure>:null)}
  {node.kind==='button'&&(preview?<span className="bd-custom-button">{node.text}</span>:<a className="bd-custom-button" href={node.url||'#'}>{node.text}</a>)}
 </div>;
}
export function BlogDesignedPage({data,profile,preview=false}:{data:SpaceData;profile:SpaceData;preview?:boolean}){
 const {locale}=useLocale(),design=data.layout.blog.design,nodes=designOrder(design.nodes).map((n:SpaceData)=>({...n,...Object.fromEntries(['label','text','alt'].map(key=>[key,n.translations?.[locale]?.[key]?.trim()?n.translations[locale][key]:n[key]]))}));
 return <div className="bd-page-shell"><div className="bd-public" data-layout={design.autoLayout?'flow':'free'} style={{'--bd-width':design.width+'px','--bd-height':designHeight(design)+'px',background:design.background} as CSSProperties}>
  {nodes.map((node:SpaceData)=><div className="bd-public-node" key={node.id} style={{'--bd-x':node.frame.x/design.width*100+'%','--bd-y':node.frame.y+'px','--bd-w':node.frame.w/design.width*100+'%','--bd-h':node.frame.h+'px'} as CSSProperties}><BlogDesignBlock node={node} data={data} profile={profile} preview={preview}/></div>)}
 </div></div>;
}
