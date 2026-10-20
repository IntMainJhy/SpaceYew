'use client';
import {createContext,useId,useCallback,useContext,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {htmlLocale,normalizeLocale,translate} from '@/lib/i18n.mjs';
export type Locale='en'|'zh'|'ja';
const Context=createContext<{locale:Locale;t:<T>(text:T,values?:unknown[])=>T;select:(locale:Locale)=>void;notice:string}|null>(null);
export function LocaleProvider({initialLocale,children}:{initialLocale:Locale;children:React.ReactNode}){
 const[locale,setLocale]=useState(initialLocale),[notice,setNotice]=useState('');const router=useRouter();
 const t=useCallback(<T,>(text:T,values:unknown[]=[])=>translate(locale,text,values) as T,[locale]);
 useEffect(()=>{document.documentElement.lang=htmlLocale(locale)},[locale]);
 function select(next:Locale){if(next===locale)return;setLocale(next);document.documentElement.lang=htmlLocale(next);let saved=false;try{document.cookie=`site-locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;saved=document.cookie.split('; ').includes(`site-locale=${next}`)}catch{}setNotice(saved?'语言偏好已保存。':'语言已切换，但浏览器未允许保存偏好。');if(saved)router.refresh();}
 return <Context.Provider value={{locale,t,select,notice}}>{children}</Context.Provider>;
}
export function useLocale(){const context=useContext(Context);if(!context)throw new Error('LocaleProvider is missing');return context;}
export function LanguageSwitcher(){const{locale,select,t,notice}=useLocale(),id=useId();return <div className="language-control"><label className="community-sr" htmlFor={id}>{t('界面语言')}</label><select id={id} value={locale} onChange={event=>select(normalizeLocale(event.target.value))} aria-label={t('界面语言')}><option value="en" lang="en">English</option><option value="zh" lang="zh-CN">中文</option><option value="ja" lang="ja">日本語</option></select><span className="community-sr" role="status">{t(notice)}</span></div>}
