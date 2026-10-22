'use client';
import {useLocale} from './LocaleProvider';

export function SiteOwnerBadge({siteOwner,compact=false}:{siteOwner?:boolean;compact?:boolean}){
 const {t}=useLocale();
 if(!siteOwner)return null;
 return <span className="site-owner-badge" role="img" aria-label={t('站长认证账号')} title={t('站长认证账号')}>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 1.5 2.6 1.6 3-.1 1.4 2.7 2.7 1.4-.1 3 1.6 2.6-1.6 2.6.1 3-2.7 1.4-1.4 2.7-3-.1-2.6 1.6-2.6-1.6-3 .1-1.4-2.7-2.7-1.4.1-3L.8 12.3l1.6-2.6-.1-3L5 5.3l1.4-2.7 3 .1Z"/><path className="site-owner-check" d="m7.3 12.2 3.1 3.1 6.4-6.4" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  {!compact&&<span aria-hidden="true">{t('站长')}</span>}
 </span>;
}
