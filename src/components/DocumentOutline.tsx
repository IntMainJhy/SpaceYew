'use client';
import {useEffect,useState} from 'react';
import {useLocale} from './LocaleProvider';
type Heading={id:string;text:string;level?:number};
export function DocumentOutline({headings}:{headings:Heading[]}){
 const{t}=useLocale(),[active,setActive]=useState(headings[0]?.id||'');
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)setActive(entry.target.id)},{rootMargin:'-12% 0px -65% 0px'});for(const heading of headings){const node=document.getElementById(heading.id);if(node)observer.observe(node)}return()=>observer.disconnect()},[headings]);
 return <nav className="document-outline" aria-label={t('文档大纲')}><strong>{t('文档大纲')}</strong>{headings.length?headings.map(h=><a key={h.id} href={'#'+h.id} data-level={h.level||2} aria-current={active===h.id?'location':undefined} onClick={()=>setActive(h.id)}>{h.text}</a>):<p>{t('本文暂无目录。')}</p>}</nav>;
}
export function DocumentShare({path}:{path:string}){const{t}=useLocale(),[status,setStatus]=useState('');return <div className="document-share"><button type="button" className="space-btn" onClick={async()=>{try{await navigator.clipboard.writeText(new URL(path,location.origin).href);setStatus('链接已复制')}catch{setStatus('复制失败，请从浏览器地址栏复制链接。')}}}>{t('复制链接')}</button>{status&&<span role="status">{t(status)}</span>}</div>}
