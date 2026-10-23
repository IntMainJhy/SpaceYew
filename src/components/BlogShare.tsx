'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from './LocaleProvider';
import {Icon} from './Icons';
export function BlogShare({path,available=true}:{path:string;available?:boolean}){
 const {t}=useLocale(),menu=useRef<HTMLDetailsElement>(null),[copied,setCopied]=useState(false),[error,setError]=useState(''),[url,setUrl]=useState(path);
 useEffect(()=>{setUrl(new URL(path,location.origin).href);setCopied(false);setError('')},[path]);
 const qr='/api/spaces/blog-qr/'+encodeURIComponent(path.split('/')[2]?.split(/[?#]/)[0]||'')+'?path='+encodeURIComponent(path);
 async function copy(){try{await navigator.clipboard.writeText(new URL(path,location.origin).href);setCopied(true);setError('')}catch{setError('请手动复制下方链接')}}
 if(!available)return <button type="button" className="space-btn" disabled title={t('通过审核并公开后即可分享')}>{t('分享主页')}</button>;
 return <details className="space-share-menu" ref={menu} onToggle={()=>{setCopied(false);setError('')}} onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus()}}}><summary className="space-btn"><Icon name="share"/>{t('分享主页')}</summary><div className="space-share-popover"><div className="space-node-heading"><strong>{t('分享个人主页')}</strong><button type="button" className="space-icon-btn" aria-label={t('关闭')} onClick={()=>{if(menu.current)menu.current.open=false}}><Icon name="close"/></button></div><img width="180" height="180" loading="lazy" src={qr} alt={t('个人主页二维码')}/><input aria-label={t('主页链接')} readOnly value={url} onFocus={e=>e.currentTarget.select()}/><div className="space-actions"><button type="button" className="space-btn" onClick={()=>void copy()}>{copied?t('链接已复制'):t('复制链接')}</button><button type="button" className="space-btn" onClick={async()=>{if(!navigator.share){await copy();return}try{await navigator.share({title:'SpaceYew',url:new URL(path,location.origin).href})}catch(e:any){if(e.name!=='AbortError')setError('系统分享不可用，请复制链接')}}}>{t('系统分享')}</button><a href={qr} download="spaceyew-homepage.svg">{t('下载二维码')}</a></div>{copied&&<p role="status">{t('链接已复制')}</p>}{error&&<p role="alert">{t(error)}</p>}</div></details>;
}
