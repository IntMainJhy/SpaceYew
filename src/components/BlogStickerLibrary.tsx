'use client';
import {useEffect,useRef} from 'react';
import {BlogSticker} from './BlogSticker';
import {Icon} from './Icons';
import {stickerGroups,stickerPresets,filterStickerPresets} from '@/lib/blog-stickers.mjs';

type Props={say:(zh:string,en:string)=>string;query:string;group:string;onQuery:(value:string)=>void;onGroup:(value:string)=>void;onAdd:(id:string)=>void;onClose:()=>void;disabled:boolean;full:boolean};
export function BlogStickerLibrary({say,query,group,onQuery,onGroup,onAdd,onClose,disabled,full}:Props){
 const results=useRef<HTMLDivElement>(null),matches=filterStickerPresets(query,group);
 useEffect(()=>{results.current?.scrollTo({top:0})},[query,group]);
 return <section className="bd-sticker-library" aria-label={say('贴纸素材库','Sticker library')}>
  <header><div><strong>{say('贴纸素材','Stickers')}</strong><span>{matches.length} / {stickerPresets.length}</span></div><button className="bl-close" type="button" aria-label={say('关闭贴纸库','Close sticker library')} onClick={onClose}><Icon name="close"/></button></header>
  <label className="bl-search"><Icon name="search"/><input aria-label={say('搜索贴纸','Search stickers')} type="search" placeholder={say('搜索名称、风格…','Search names or styles…')} value={query} maxLength={100} onChange={e=>onQuery(e.target.value)}/>{query&&<button type="button" aria-label={say('清空贴纸搜索','Clear sticker search')} onClick={()=>onQuery('')}><Icon name="close"/></button>}</label>
  <div className="bl-filters" role="group" aria-label={say('贴纸风格','Sticker style')}>
   {[{id:'all',zh:'全部',en:'All'},...stickerGroups].map(item=><button key={item.id} type="button" aria-pressed={group===item.id} onClick={()=>onGroup(item.id)}>{say(item.zh,item.en)}</button>)}
  </div>
  {full&&<p className="bl-limit" role="status">{say('已达到 60 个图层，请先移除不需要的图层。','Your page has 60 layers. Remove a layer to add another.')}</p>}
  <div className="bl-results" ref={results}>
   {matches.length?stickerGroups.filter(item=>matches.some(p=>p.group===item.id)).map(item=><section className="bl-family" key={item.id}><h3>{say(item.zh,item.en)}<span>{matches.filter(p=>p.group===item.id).length}</span></h3><div className="bd-sticker-presets">{matches.filter(p=>p.group===item.id).map(preset=><button type="button" key={preset.id} disabled={disabled||full} onClick={()=>onAdd(preset.id)} aria-label={say('添加','Add')+' '+say(preset.zh,preset.en)}><div className="bd-sticker-thumbnail"><BlogSticker node={{sticker:preset.id,text:say(preset.text,preset.english),style:{...preset.style,rotation:preset.id==='tape'?-5:preset.id==='stamp'?7:0}}}/></div><span>{say(preset.zh,preset.en)}</span></button>)}</div></section>):<div className="bl-empty"><Icon name="search"/><p>{say('没有找到这款贴纸','No matching stickers')}</p><button type="button" onClick={()=>{onQuery('');onGroup('all')}}>{say('查看全部贴纸','Show all stickers')}</button></div>}
  </div>
 </section>;
}
