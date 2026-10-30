'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {useLocale} from './LocaleProvider';
import {Icon} from './Icons';
export function BlogShare({path,available=true}:{path:string;available?:boolean}){
 const {t}=useLocale(),id=useId(),menu=useRef<HTMLDetailsElement>(null);
 const [copied,setCopied]=useState(false),[error,setError]=useState(''),[url,setUrl]=useState(path),[sharing,setSharing]=useState(false),[qrFailed,setQrFailed]=useState(false);
 useEffect(()=>{setUrl(new URL(path,location.origin).href);setCopied(false);setError('');setQrFailed(false)},[path]);
 useEffect(()=>{const dismiss=(event:PointerEvent)=>{if(menu.current?.open&&!menu.current.contains(event.target as Node))menu.current.open=false};document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss)},[]);
 const qr='/api/spaces/blog-qr/'+encodeURIComponent(path.split('/')[2]?.split(/[?#]/)[0]||'')+'?path='+encodeURIComponent(path);
 function close(){if(menu.current){menu.current.open=false;menu.current.querySelector('summary')?.focus()}}
 async function copy(){try{await navigator.clipboard.writeText(new URL(path,location.origin).href);setCopied(true);setError('')}catch{setError('复制未成功，请选中下方链接手动复制')}}
 async function share(){if(!navigator.share){await copy();return}setSharing(true);try{await navigator.share({title:'SpaceYew',url:new URL(path,location.origin).href});setError('')}catch(e:unknown){if(!(e instanceof Error)||e.name!=='AbortError')setError('系统分享不可用，请复制链接')}finally{setSharing(false)}}
 if(!available)return <button type="button" className="space-btn blog-share-trigger" disabled title={t('通过审核并公开后即可分享')}><Icon name="share"/>{t('分享主页')}</button>;
 return <details className="space-share-menu" ref={menu} onToggle={()=>{setCopied(false);setError('')}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();close()}}}>
  <summary className="space-btn blog-share-trigger"><Icon name="share"/>{t('分享主页')}</summary>
  <div className="space-share-popover" aria-label={t('分享个人主页')}>
   <div className="space-share-heading"><div><strong>{t('分享个人主页')}</strong><p>{t('把作品与经历，分享给更多人。')}</p></div><button type="button" className="space-icon-btn" aria-label={t('关闭分享')} onClick={close}><Icon name="close"/></button></div>
   <div className="space-share-qr">{qrFailed?<p role="status">{t('二维码暂时不可用，仍可复制链接分享。')}</p>:<img width="156" height="156" loading="lazy" src={qr} alt={t('个人主页二维码')} onError={()=>setQrFailed(true)}/>}</div>
   <label className="space-share-link" htmlFor={id}>{t('主页链接')}</label>
   <div className="space-share-copy"><input id={id} readOnly value={url} onFocus={e=>e.currentTarget.select()}/><button type="button" className="space-btn" onClick={()=>void copy()}><Icon name={copied?'check':'copy'}/>{copied?t('已复制'):t('复制')}</button></div>
   <div className="space-share-secondary"><button type="button" disabled={sharing} onClick={()=>void share()}><Icon name="share"/>{sharing?t('正在分享…'):t('系统分享')}</button><a href={qr} download="spaceyew-homepage.svg"><Icon name="download"/>{t('下载二维码')}</a></div>
   <p className="space-share-feedback" role={error?'alert':'status'} aria-live="polite">{error?t(error):copied?t('链接已复制'):t('公开链接始终指向已发布的主页。')}</p>
  </div>
 </details>;
}
