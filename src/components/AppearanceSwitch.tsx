'use client';
import {useEffect,useId,useRef} from 'react';
import {useLocale} from './LocaleProvider';
import {type Appearance,useAppearance} from './AppearanceProvider';
import {Icon} from './Icons';

const options:{value:Appearance;label:string;description:string}[]=[
 {value:'light',label:'浅色',description:'明亮纸面，适合日间阅读'},
 {value:'dark',label:'深色',description:'柔和墨色，适合夜间阅读'},
 {value:'system',label:'跟随系统',description:'随设备外观自动切换'},
];
function AppearanceIcon({mode}:{mode:Appearance}){return <Icon name={mode==='light'?'sun':mode==='dark'?'moon':'monitor'}/>}
export function AppearanceSwitch(){
 const {t}=useLocale(),{preference,select,persisted}=useAppearance(),ref=useRef<HTMLDetailsElement>(null),id=useId();
 useEffect(()=>{const close=(event:PointerEvent)=>{if(ref.current?.open&&!ref.current.contains(event.target as Node))ref.current.open=false};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[]);
 function close(){if(ref.current){ref.current.open=false;ref.current.querySelector('summary')?.focus()}}
 return <details ref={ref} className="appearance-switch" name="site-tools" onKeyDown={event=>{if(event.key==='Escape'&&ref.current?.open){event.preventDefault();close()}}}>
  <summary className="appearance-trigger" aria-label={t('切换外观')} title={t('切换外观')}><AppearanceIcon mode={preference}/><span>{t('外观')}</span></summary>
  <div className="appearance-menu" aria-labelledby={id}>
   <div className="appearance-menu-heading"><strong id={id}>{t('阅读外观')}</strong><span>{t('仅影响当前设备')}</span></div>
   <div className="appearance-options" role="group" aria-label={t('外观模式')}>{options.map(option=><button key={option.value} type="button" aria-pressed={preference===option.value} onClick={()=>{select(option.value);close()}}><AppearanceIcon mode={option.value}/><span><strong>{t(option.label)}</strong><small>{t(option.description)}</small></span><svg className="appearance-check" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 10 3 3 7-7"/></svg></button>)}</div>
   {!persisted&&<p className="appearance-notice" role="status">{t('外观已切换，浏览器暂未允许保存偏好。')}</p>}
  </div>
 </details>;
}
