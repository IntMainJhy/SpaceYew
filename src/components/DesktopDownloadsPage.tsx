import Link from 'next/link';
import {serverI18n} from '@/lib/server-i18n';
import {getConfig} from '@/lib/db.mjs';
import {Icon} from './Icons';

function PlatformMark({platform}:{platform:'macos'|'windows'}){
 return platform==='macos'?<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 1.5c.1 1.5-.5 2.8-1.3 3.7-.9 1-2.1 1.5-3.4 1.4-.2-1.4.5-2.8 1.3-3.7.9-.9 2.2-1.5 3.4-1.4ZM20.6 17.7c-.6 1.4-1 2-1.8 3.1-.9 1.2-2.1 2.7-3.5 2.7-1.3 0-1.7-.8-3.5-.8s-2.3.8-3.6.8c-1.4 0-2.4-1.3-3.3-2.5C2.4 17.6 1.5 12.8 3 9.9c1.1-2.1 3-3.3 4.8-3.3 1.5 0 2.5.8 3.8.8 1.2 0 2.1-.8 3.8-.8 1.5 0 3.1.9 4.2 2.2-3.7 2-3.1 6.9 1 8.9Z"/></svg>:<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 4.4 10.5 3v8H2V4.4Zm10-1.6L22 1v10H12V2.8ZM2 12.5h8.5v8L2 19.1v-6.6Zm10 0h10v10l-10-1.8v-8.2Z"/></svg>;
}

export async function DesktopDownloadsPage(){
 const {t}=await serverI18n(),downloads=getConfig('site').desktopDownloads||{};
 return <div className="platform-page product-download-page">
  <section className="product-downloads" id="downloads" aria-labelledby="downloads-heading">
   <header className="product-section-heading"><div><h1 id="downloads-heading">{t('在你的电脑上，继续创造。')}</h1></div><Link href="/community" className="space-link">{t('使用网页版')}</Link></header>
   <div className="product-download-options">{(['macos','windows'] as const).map(platform=>{
    const item=downloads[platform]||{},label=platform==='macos'?'macOS':'Windows';
    return <article className="product-download-option" key={platform} aria-labelledby={'download-'+platform}>
     <div className="product-download-heading"><PlatformMark platform={platform}/><div><h2 id={'download-'+platform}>{label}</h2><p>{item.url?(item.version||t('桌面应用')):t('桌面版筹备中')}</p></div></div>
     {item.url?<a className="space-btn primary" href={item.url} rel="noopener noreferrer">{t('下载 {0}',[label])}<Icon name="download"/></a>:<button type="button" className="space-btn" disabled aria-label={t('{0} 桌面版即将推出',[label])}>{t('即将推出')}<Icon name="download"/></button>}
    </article>;
   })}</div>
  </section>
 </div>;
}
